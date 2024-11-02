const base = "https://www.youtube.com";

async function GetYoutubeInitData(url) {
  try {
    const page = await (await fetch(encodeURI(url))).text();

    const getInit = page.split("var ytInitialData =");
    if (!getInit.length) throw new Error("Cannot get init data");

    const init = JSON.parse(getInit[1].split("</script>")[0].slice(0, -1));

    let token = null;
    const getToken = page.split("innertubeApiKey");
    if (getToken.length > 1) token = getToken[1].trim().split(",")[0].split('"')[2];

    let context = null;
    const getContent = page.split("INNERTUBE_CONTEXT");
    if (getContent.length > 1) context = JSON.parse(getContent[1].trim().slice(2, -2));

    return { init, token, context };
  } catch (error) {
    return { error };
  }
}

async function GetYoutubePlayerDetail(url) {
  try {
    const page = await (await fetch(encodeURI(url))).text();

    const getInit = page.split("var ytInitialPlayerResponse =");
    if (!getInit.length) throw new Error("Cannot get init data");

    const init = JSON.parse(getInit[1].split("</script>")[0].slice(0, -1));
    return { ...init.videoDetails };
  } catch (error) {
    return { error };
  }
}

async function getListByKeyword(keyword, playlist = false, limit = 0, options = []) {
  let endpoint = `${base}/results?search_query=${keyword}`;

  try {
    if (Array.isArray(options) && options.length > 0) {
      const type = options.find((option) => option.type);
      if (typeof type === "object" && typeof type.type === "string") {
        switch (type.type.toLowerCase()) {
          case "video":
            endpoint += "&sp=EgIQAQ%3D%3D";
            break;
          case "channel":
            endpoint += "&sp=EgIQAg%3D%3D";
            break;
          case "playlist":
            endpoint += "&sp=EgIQAw%3D%3D";
            break;
          case "movie":
            endpoint += "&sp=EgIQBA%3D%3D";
            break;
        }
      }
    }

    const { init, token, context } = await GetYoutubeInitData(endpoint);
    let continuation = null;

    const items = [];
    init.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents.forEach((content) => {
      if (content.continuationItemRenderer) continuation = content.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
      else if (content.itemSectionRenderer) content.itemSectionRenderer.contents.forEach((item) => {
        if (item.channelRenderer) {
          const { channelId, thumbnail, title: { simpleText } } = item.channelRenderer;

          items.push({ id: channelId, type: "channel", thumbnail: thumbnail, title: simpleText });
        } else {
          const video = item.videoRenderer;
          if (video?.videoId) items.push(videoRender(item));

          if (item.playlistRenderer) {
            let { playlistId, thumbnails, title: { simpleText }, videoCount, videos } = item.playlistRenderer;
            if (playlist && playlistId) items.push({ id: playlistId, type: "playlist", thumbnail: thumbnails, title: simpleText, length: videoCount, videos: videos, videoCount: videoCount, isLive: false });
          }
        }
      });
    });

    return { items: limit > 0 ? items.slice(0, limit) : items, next: { token, context, continuation } };
  } catch (error) {
    return { error };
  }
}

async function nextPage({ token, context, continuation }, playlist = false, limit = 0) {
  try {
    const page = await (await fetch(encodeURI(`${base}/youtubei/v1/search?key=${token}`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ context, continuation }),
    })).json();

    const items = [];
    page.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems.forEach((next) => {
      if (next.itemSectionRenderer) next.itemSectionRenderer.contents.forEach((item) => {
        const video = item.videoRenderer;
        if (video?.videoId) items.push(videoRender(item));

        if (item.playlistRenderer) {
          let { playlistId, thumbnails, title: { simpleText }, videoCount, videos } = item.playlistRenderer;
          if (playlist && playlistId) items.push({ id: playlistId, type: "playlist", thumbnail: thumbnails, title: simpleText, length: videoCount, videos: videos, videoCount: videoCount, isLive: false });
        }
      })
      else if (next.continuationItemRenderer) continuation = next.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
    });

    return { items: limit > 0 ? items.slice(0, limit) : items, next: { token, context, continuation } };
  } catch (error) {
    return { error };
  }
}

async function getPlaylistData(id, limit = 0) {
  try {
    const { init } = await GetYoutubeInitData(`${base}/playlist?list=${id}`);
    if (init?.contents) {
      const videos = init.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;

      const items = videos
        .map((item) => item.playlistVideoRenderer?.videoId ? videoRender(item) : null)
        .filter(Boolean);

      return { items: limit > 0 ? items.slice(0, limit) : items, metadata: init.metadata };
    } else throw new Error("Invalid playlist");
  } catch (error) {
    return { error };
  }
}

async function getChannelById(id) {
  try {
    const { init } = await GetYoutubeInitData(`${base}/channel/${id}`);

    const items = init.contents.twoColumnBrowseResultsRenderer.tabs.map((tab) => tab?.tabRenderer ? { title: tab.tabRenderer.title, content: tab.tabRenderer.content } : null) .filter(Boolean);

    return items;
  } catch (error) {
    return { error };
  }
};

async function getVideoDetails(id) {
  const endpoint = `${base}/watch?v=${id}`;

  try {
    const { init } = await GetYoutubeInitData(endpoint);
    let { videoId, thumbnail, author, channelId, shortDescription, keywords } = await GetYoutubePlayerDetail(endpoint);

    const result = init.contents.twoColumnWatchNextResults;
    const first = result.results.results.contents[0].videoPrimaryInfoRenderer;
    const second = result.results.results.contents[1].videoSecondaryInfoRenderer;

    return {
      id: videoId,
      title: first.title.runs[0].text,
      thumbnail: thumbnail,
      isLive: first.viewCount.videoViewCountRenderer.isLive || false,
      channel: author || second.owner.videoOwnerRenderer.title.runs[0].text,
      channelId: channelId,
      description: shortDescription,
      keywords: keywords,
      suggestion: result.secondaryResults.secondaryResults.results.filter((item) => item.hasOwnProperty("compactVideoRenderer")).map(compactVideoRenderer) 
    };
  } catch (error) {
    return { error };
  }
}

function videoRender(json) {
  try {
    if (!json || !(json.videoRenderer || json.playlistVideoRenderer)) return {};

    const video = json.videoRenderer || json.playlistVideoRenderer;

    return {
      id: video.videoId,
      type: "video",
      thumbnail: video.thumbnail,
      title: video.title.runs[0].text,
      channelTitle: video.ownerText?.runs[0]?.text || "",
      shortBylineText: video.shortBylineText || "",
      length: video.lengthText || "",
      isLive: video.badges?.some(badge => badge.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW") || video.thumbnailOverlays?.some(overlay => overlay.thumbnailOverlayTimeStatusRenderer?.style === "LIVE") || false
    };
  } catch (error) {
    return { error };
  }
}

function compactVideoRenderer(json) {
  const video = json.compactVideoRenderer;

  return {
    id: video.videoId,
    type: "video",
    thumbnail: video.thumbnail.thumbnails,
    title: video.title.simpleText,
    channelTitle: video.shortBylineText?.runs[0]?.text || "",
    shortBylineText: video.shortBylineText?.runs[0]?.text || "",
    length: video.lengthText || "",
    isLive: video.badges?.[0]?.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW" || false,
  };
}

module.exports = {
  getListByKeyword,
  getPlaylistData,
  getChannelById,
  getVideoDetails,
  nextPage
}