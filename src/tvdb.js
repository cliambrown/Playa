import { fetch, Body } from '@tauri-apps/api/http';

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

function getResponseData(response) {
  if (
    !response
    || typeof response !== 'object'
    || !response.hasOwnProperty('status')
    || parseInt(response.status) != 200
    || !response.hasOwnProperty('data')
    || !response.data.hasOwnProperty('data')
  ) {
    return null;
  }
  return response.data.data;
}

async function fetchNewTvdbToken(store) {
  const body = Body.json({
    apikey: store.settings.tvdb_apikey,
    pin: store.settings.tvdb_pin,
  });
  const response = await fetch('https://api4.thetvdb.com/v4/login', {
    method: 'POST',
    body: body,
    timeout: 10,
  });
  console.log('fetchNewTvdbToken http', response);
  const responseData = getResponseData(response);
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

export async function searchShow(store, showName) {
  if (!showName) return false;
  let token = await getToken(store);
  if (!token) return false;
  const url = 'https://api4.thetvdb.com/v4/search?q=' + encodeURI(showName) + '&type=series';
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    timeout: 10,
  });
  console.log('searchShow', response);
  return getResponseData(response);
}

export async function getEpisodes(store, tvdbID) {
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
  const responseData = getResponseData(response);
  if (
    !responseData
    || !responseData.hasOwnProperty('episodes')
    || !Array.isArray(responseData.episodes)
  ) {
    return false;
  }
  return responseData.episodes;
}

export async function getBanners(store, tvdbID) {
  if (!tvdbID) return false;
  let token = await getToken(store);
  if (!token) return false;
  console.log('getBanners')
  const url = 'https://api4.thetvdb.com/v4/series/' + encodeURI(tvdbID) + '/extended';
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    timeout: 10,
  });
  console.log('getEpisodes', response);
  const responseData = getResponseData(response);
  if (
    !responseData
    || !responseData.hasOwnProperty('artworks')
    || !Array.isArray(responseData.artworks)
  ) {
    return false;
  }
  const artworks = [];
  for (const artwork of responseData.artworks) {
    if (parseInt(artwork.type) === 1) artworks.push(artwork);
  }
  return artworks;
}