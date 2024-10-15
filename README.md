# YouTube Search API

A lightweight package for retrieving data from YouTube without needing an API key.

## Features

- Fetch search results for videos, playlists, or channels by keyword.
- Retrieve paginated results for extended searches.
- Access playlist details and video information.
- Fetch channel data by channel ID.

## Installation

Install the package via npm:

```bash
npm install @forkprince/youtube-search-api
```

## Usage

### 1. Search for Videos, Playlists, or Channels

Fetch a list of items based on a keyword. You can specify whether to include playlists and set a limit on the number of results.

```js
youtube.getListByKeyword(keyword: string, playlist?: boolean, limit?: number, options?: [{ type: "string" }]);
```

**Example:**

```js
const search = await youtube.getListByKeyword("JavaScript tutorials", true, 5, [{ type: "video" }]);
console.log(search);
```

### 2. Fetch Next Page of Results

Continue retrieving results using pagination.

```js
youtube.nextPage({ token, context, continuation }, playlist?: boolean, limit?: number);
```

**Example:**

```js
const nextPage = await youtube.nextPage(results.next, true, 5);
console.log(nextPage);
```

### 3. Get Playlist Data

Retrieve detailed information about a playlist, including videos in the playlist.

```js
youtube.getPlaylistData(id: string, limit?: number);
```

**Example:**

```js
const playlist = await youtube.getPlaylistData("RDCLAK5uy_lGZNsVQescoTzcvJkcEhSjpyn_98D4lq0");
console.log(playlist);
```

### 4. Get Channel Information

Fetch details about a channel using its channel ID.

```js
youtube.getChannelById(id: string);
```

**Example:**

```js
const channel = await youtube.getChannelById("UCj-Xm8j6WBgKY8OG7s9r2vQ");
console.log(channel);
```

### 5. Get Video Details

Retrieve information about a specific video.

```js
youtube.getVideoDetails(id: string);
```

**Example:**

```js
const video = await youtube.getVideoDetails("cC2UqBuFAEY");
console.log(video);
```

## Example

Here’s a complete example demonstrating how to use the package:

```js
const youtube = require("@forkprince/youtube-search-api");

async function test() {
  // Search for videos
  const videos = await youtube.getListByKeyword("JSDeveloper", true, 2, [{ type: "video" }]);
  console.log("Videos:", videos);

  // Get the next page of results
  const page2 = await youtube.nextPage(videos.next, true, 2);
  console.log("Page 2:", page2);

  const page3 = await youtube.nextPage(page2.next, true, 2);
  console.log("Page 3:", page3);

  // Get playlist data
  const playlist = await youtube.getPlaylistData("RDCLAK5uy_lGZNsVQescoTzcvJkcEhSjpyn_98D4lq0");
  console.log("Playlist:", playlist);

  // Get channel data
  const channel = await youtube.getChannelById("UCj-Xm8j6WBgKY8OG7s9r2vQ");
  console.log("Channel:", channel);

  // Get video details
  const video = await youtube.getVideoDetails("cC2UqBuFAEY");
  console.log("Video Details:", video);
}

test();
```

## License

This package is licensed under the MIT License.
