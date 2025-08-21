import { fetch } from '@tauri-apps/plugin-http';

async function useGetExistingTvdbToken(store) {
  if (!store.db) return false;
  const now = Math.round(Date.now() / 1000);
  const yesterday = now - 86400 + 30; // extra 30 seconds to be safe
  let tokenObj = store.tvdb_token;
  if (tokenObj && tokenObj.created_at > yesterday) return tokenObj.token;
  const rows = await store.db.select('SELECT * FROM tvdb_tokens WHERE created_at>? ORDER BY id DESC LIMIT 1', [yesterday]);
  if (rows && rows.length) {
    tokenObj = rows[0];
  } else {
    tokenObj = null;
  }
  store.tvdb_token = tokenObj;
  store.db.execute('DELETE FROM tvdb_tokens WHERE created_at<?', [yesterday]);
  return tokenObj ? tokenObj.token : null;
}

async function getResponseData(response) {
  if (!response || parseInt(response.status) != 200) {
    return null;
  }
  const responseJson = await response.json();
  return responseJson.data;
}

async function fetchNewTvdbToken(store) {
  const response = await fetch('https://api4.thetvdb.com/v4/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: store.settings.tvdb_apikey,
      pin: store.settings.tvdb_pin,
    }),
    timeout: 10,
  });
  console.log('fetchNewTvdbToken http', response);
  const responseData = await getResponseData(response);
  if (!responseData) return null;
  const responseToken = responseData.token;
  const now = Math.round(Date.now() / 1000);
  let token = {
    id: null,
    created_at: now,
    token: responseToken
  };
  if (store.db) {
    const response2 = await store.db.execute('INSERT INTO tvdb_tokens (created_at, token) VALUES (?, ?)', [now, token.token]);
    console.log('fetchNewTvdbToken db insert', response2);
    token.id = parseInt(response.lastInsertId);
  }
  store.tvdb_token = token;
  return token.token;
}

async function getToken(store) {
  let token = await useGetExistingTvdbToken(store);
  if (!token) token = await fetchNewTvdbToken(store);
  return token;
}

export async function searchTvdb(store, showName, type) {
  if (!showName) return false;
  let token = await getToken(store);
  if (!token) return false;
  const typeParam = (type === 'show' ? 'series' : 'movie');
  const url = 'https://api4.thetvdb.com/v4/search?limit=10&q=' + encodeURI(showName) + '&type=' + typeParam;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    timeout: 10,
  });
  console.log('searchTvdb', response);
  let responseData = await getResponseData(response);
  if (!Array.isArray(responseData)) return false;
  for (const match of responseData) {
    match.tvdb_id = parseInt(match.tvdb_id)
  }
  return responseData;
}

export async function getEpisodes(store, tvdbID, source) {
  if (!tvdbID) return false;
  let token = await getToken(store);
  if (!token) return false;
  const url = 'https://api4.thetvdb.com/v4/series/' + encodeURI(tvdbID) + '/episodes/default/eng';
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    timeout: 10,
  });
  console.log('getEpisodes', response);
  const responseData = await getResponseData(response);
  if (
    !responseData
    || !responseData.hasOwnProperty('episodes')
    || !Array.isArray(responseData.episodes)
  ) {
    return false;
  }
  let tvdbEpisodes = [];
  for (const tvdbEpisode of responseData.episodes) {
    if (tvdbEpisode.aired || source === 'local')
      tvdbEpisodes.push(prepTvdbEpisode(tvdbEpisode));
  }
  return tvdbEpisodes;
}

function prepTvdbEpisode(tvdbEpisode) {
  let preppedTvdbEpisode = {
    name: tvdbEpisode.name,
    overview: tvdbEpisode.overview,
    runtime: tvdbEpisode.runtime,
  };
  preppedTvdbEpisode.season_num = parseInt(tvdbEpisode.seasonNumber);
  if (isNaN(preppedTvdbEpisode.season_num)) preppedTvdbEpisode.season_num = null;
  preppedTvdbEpisode.episode_num = parseInt(tvdbEpisode.number);
  if (isNaN(preppedTvdbEpisode.episode_num)) preppedTvdbEpisode.episode_num = null;
  const aired = tvdbEpisode.aired;
  preppedTvdbEpisode.released_on = null;
  preppedTvdbEpisode.released_on_date_obj = null;
  preppedTvdbEpisode.is_season_finale = tvdbEpisode.finaleType === 'season' ? 1 : 0;
  preppedTvdbEpisode.is_series_finale = tvdbEpisode.finaleType === 'series' ? 1 : 0;
  if (
    aired
    && typeof aired === 'string'
    && /^[\d]{4}-[\d]{2}-[\d]{2}$/.test(aired)
  ) {
    const [y, m, d] = aired.split('-');
    const date = new Date(y, (m-1), d);
    preppedTvdbEpisode.released_on = date.getTime() / 1000;
    date.setHours(0,0,0,0);
    preppedTvdbEpisode.released_on_date_obj = date;
  }
  return preppedTvdbEpisode;
}

export async function getArtwork(store, tvdbID, type) {
  if (!tvdbID) return false;
  let token = await getToken(store);
  if (!token) return false;
  const typeParam = (type === 'show' ? 'series' : 'movies');
  const url = 'https://api4.thetvdb.com/v4/' + typeParam + '/' + encodeURI(tvdbID) + '/extended';
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    timeout: 10,
  });
  console.log('getArtwork', response);
  const responseData = await getResponseData(response);
  if (
    !responseData
    || !responseData.hasOwnProperty('artworks')
    || !Array.isArray(responseData.artworks)
  ) {
    return false;
  }
  const artworks = [];
  for (const artwork of responseData.artworks) {
    const artworkType = parseInt(artwork.type);
    if (
      (type === 'show' && artworkType === 1)
      || (type === 'movie' && artworkType === 14)
    ) {
      artworks.push(artwork);
    }
    if (artworks.length >= 12) break;
  }
  return artworks;
}

export async function getMovieRuntime(store, tvdbID) {
  if (!tvdbID) return false;
  let token = await getToken(store);
  if (!token) return false;
  const url = 'https://api4.thetvdb.com/v4/movies/' + encodeURI(tvdbID);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    timeout: 10,
  });
  console.log('getMovieRuntime', response);
  const responseData = await getResponseData(response);
  if (
    !responseData
    || !responseData.hasOwnProperty('runtime')
  ) {
    return false;
  }
  return responseData.runtime;
}