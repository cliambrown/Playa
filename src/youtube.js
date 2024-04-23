import { fetch, Body } from '@tauri-apps/api/http';
import { useGetProp, useSecondsToTimeStr } from './helpers';

function getResponseData(response) {
  if (
    !response
    || typeof response !== 'object'
    || !response.hasOwnProperty('status')
    || parseInt(response.status) != 200
    || !response.hasOwnProperty('data')
  ) {
    return null;
  }
  return response.data;
}

async function playlistItemsList(playlistID, apiKey, pageToken = null) {
  const url = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=' + encodeURI(playlistID) + '&key=' + encodeURI(apiKey) + (pageToken ? '&pageToken=' + encodeURI(pageToken) : '');
  const response = await fetch(url, {
    method: 'GET',
    timeout: 20,
  });
  console.log('playlistItemsList', response);
  return getResponseData(response);
}

function videoDataFromSnippet(snippet, playlistID) {
  if (
    !snippet
    || typeof snippet !== 'object'
    || !snippet.resourceId
    || snippet.resourceId.kind !== 'youtube#video'
  ) {
    return null;
  }
  const releasedOnDate = new Date(snippet.publishedAt);
  return {
    name: snippet.title,
    overview: snippet.description.slice(0, 300),
    order_num: snippet.position,
    youtube_id: snippet.resourceId.videoId,
    url: 'https://www.youtube.com/watch?v=' + encodeURI(snippet.resourceId.videoId) + '&list=' + encodeURI(playlistID),
    released_on: releasedOnDate.getTime() / 1000,
  };
}

async function videosList(videoIDs, apiKey) {
  const url = 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=' + encodeURI(videoIDs.join(',')) + '&key=' + encodeURI(apiKey);
  const response = await fetch(url, {
    method: 'GET',
    timeout: 20,
  });
  console.log('getVideoDurations', response);
  return getResponseData(response);
}

function parseFloatSafe(val) {
  const r = parseFloat(val);
  return isNaN(r) ? 0 : r;
}

// Inspired by https://github.com/rtomrud/duration-to-seconds/blob/master/index.js
function ytDurationToReadable(ytDuration) {
  if (!ytDuration) return null;
  const durationRegExp = /^PT((?<hours>[\d\.]+)H)?((?<minutes>[\d\.]+)M)?((?<seconds>[\d\.]+)S)?$/;
  let result = durationRegExp.exec(ytDuration);
  if (!result || !result.groups) return null;
  const hours = result.groups.hours ? parseFloatSafe(result.groups.hours) : 0;
  const minutes = result.groups.minutes ? parseFloatSafe(result.groups.minutes) : 0;
  const seconds = result.groups.seconds ? parseFloatSafe(result.groups.seconds) : 0;
  return useSecondsToTimeStr(Math.floor((hours * 3600) + (minutes * 60) + seconds));
}

async function addVideoDurations(videos, apiKey) {
  const videoCount = videos.length;
  const loopCount = Math.ceil(videoCount / 50);
  let videoIDs = [];
  for (let i=0; i<loopCount; i++) {
    for (let j=(i*50); j<50*(i+1) && j<videoCount; j++) {
      videoIDs.push(videos[j].youtube_id);
    }
    const videosListResponse = await videosList(videoIDs, apiKey);
    const items = videosListResponse.items;
    if (!items) return videos;
    for (const item of items) {
      if (!item.id || !item.contentDetails || !item.contentDetails.duration) continue;
      // These should be in the same sequence as the videos array, but we won't assume that
      for (let j=(i*50); j<50*(i+1) && j<videoCount; j++) {
        if (videos[j].youtube_id === item.id) {
          videos[j].duration = ytDurationToReadable(item.contentDetails.duration);
          break;
        }
      }
    }
    videoIDs = [];
  }
  return videos;
}

export async function getYtPlaylistVideos(playlistID, apiKey) {
  let nextPageToken = null;
  let videos = [];
  do {
    let responseData = await playlistItemsList(playlistID, apiKey, nextPageToken);
    if (!responseData) break;
    let playlistItems = useGetProp(responseData, 'items');
    if (!playlistItems || !Array.isArray(playlistItems)) break;
    for (const playlistItem of playlistItems) {
      const videoData = videoDataFromSnippet(useGetProp(playlistItem, 'snippet'), playlistID);
      if (videoData) videos.push(videoData);
    }
    nextPageToken = useGetProp(responseData, 'nextPageToken');
  } while (nextPageToken !== null);
  videos = await addVideoDurations(videos, apiKey);
  return videos;
}
