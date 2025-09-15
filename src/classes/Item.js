import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import { Command, open } from '@tauri-apps/plugin-shell';

import { invoke } from '@tauri-apps/api/core';
import { store } from '../store';
import { useGetProp, useAlphaName, useMinutesToTimeStr, useOpenOrHomeDir, useShowInExplorer } from '../helpers.js';
import { getEpisodes } from '../tvdb.js';
import { getYtPlaylistVideos } from '../youtube';
import { Episode } from './Episode.js';

export function Item(itemData) {
    
  this.attributes = new Set([
    { name: 'id', def: null, updatable: false, to_db: false },
    { name: 'created_at', def: null, updatable: true, to_db: false },
    { name: 'updated_at', def: null, updatable: true, to_db: false },
    { name: 'is_archived', def: null, updatable: true },
    { name: 'type', def: null, updatable: false },
    { name: 'source', def: null, updatable: false },
    { name: 'updated_from_source_at', def: null, updatable: false },
    { name: 'name', def: null, updatable: true },
    { name: 'tvdb_id', def: null, updatable: true },
    { name: 'tvdb_slug', def: null, updatable: true },
    { name: 'last_watched_at', def: null, updatable: true },
    { name: 'artwork_filename', def: null, updatable: true },
    { name: 'dir_name', def: null, updatable: false },
    { name: 'pathname', def: null, updatable: false },
    { name: 'filename', def: null, updatable: false },
    { name: 'url', def: null, updatable: true },
    { name: 'order_is_reversed', def: null, updatable: true },
    { name: 'open_list_not_ep', def: null, updatable: true },
    { name: 'duration', def: null, updatable: true },
    { name: 'current_episode_id', def: 0, updatable: true },
  ]);
  
  for (const attribute of this.attributes) {
    this[attribute.name] = useGetProp(itemData, attribute.name, attribute.def);
  }
  
  this.alpha_name = null;
  this.is_new = useGetProp(itemData, 'is_new');
  this.episode_ids = [];
  this.episodes = {};
  this.new_episode_ids = new Set([]);
  this.tvdb_matches = [];
  this.artwork_matches = [];
  
  if (!this.name) {
    if (this.filename) this.parseFilename();
    if (this.dir_name) this.name = this.dir_name;
  }
  this.setAlphaName();
}
  
Item.prototype.updateAttributes = function(itemData) {
  for (const attribute of this.attributes) {
    if (attribute.updatable && Object.hasOwn(itemData, attribute.name))
      this[attribute.name] = itemData[attribute.name];
  }
}

Item.prototype.parseFilename =function() {
  let newName = this.filename;
  let regexp = /^(?<name>.*)\((19|20)\d\d/gi;
  let result = regexp.exec(this.filename);
  if (result) {
    newName = result.groups.name
      .replaceAll('.', ' ')
      .replaceAll('_', ' ')
      .trim();
  } else {
    regexp = /^(?<name>.*)(19|20)\d\d/gi;
    result = regexp.exec(this.filename);
    if (result) {
      newName = result.groups.name
        .replaceAll('.', ' ')
        .replaceAll('_', ' ')
        .trim();
    }
  }
  this.name = newName;
}
  
Item.prototype.setAlphaName = function() {
  this.alpha_name = useAlphaName(this.name);
}
  
Item.prototype.updateAttributes = function(itemData) {
  for (const attribute of this.attributes) {
    if (attribute.updatable && Object.hasOwn(itemData, attribute.name))
      this[attribute.name] = itemData[attribute.name];
  }
}
  
Item.prototype.saveToDB = async function() {
  if (!store.db) return false;
  const now = Math.round(Date.now() / 1000);
  const isUpdate = !!this.id;
  let fieldStrs = [];
  let params = [];
  for (const attribute of this.attributes) {
    if (attribute.to_db === false) continue;
    if (isUpdate) fieldStrs.push(`${attribute.name}=?`);
    else fieldStrs.push(attribute.name);
    params.push(this[attribute.name]);
  }
  let query;
  if (isUpdate) {
    fieldStrs.push('updated_at=?');
    params.push(now, this.id);
    query = `UPDATE items SET ${fieldStrs.join(', ')} WHERE id=?`;
  } else {
    params.push(now, now);
    const qMarks = Array(params.length).fill('?').join(', ');
    query = `INSERT INTO items (${fieldStrs.join(', ')}, created_at, updated_at) VALUES (${qMarks})`;
  }
  const response = await store.db.execute(query, params);
  if (!isUpdate) this.id = parseInt(response.lastInsertId);
  console.log('Item.saveToDB', response);
  return response;
}
  
Item.prototype.updateCurrentEpInDB = async function() {
  if (!store.db || !this.id) return false;
  let response = await store.db.execute(
    "UPDATE items SET current_episode_id=? WHERE id=?",
    [this.current_episode_id, this.id]
  );
  console.log('Item.updateCurrentEpInDB', response);
}
  
Item.prototype.updateLastWatchedAtInDB = async function() {
  if (!store.db || !this.id) return false;
  let response = await store.db.execute(
    "UPDATE items SET last_watched_at=? WHERE id=?",
    [this.last_watched_at, this.id]
  );
  console.log('Item.updateLastWatchedAtInDB', response);
}
  
Item.prototype.updateUpdatedFromSourceAt = async function() {
  if (!store.db || !this.id) return false;
  this.updated_from_source_at = Math.round(Date.now() / 1000);
  let response = await store.db.execute(
    "UPDATE items SET updated_from_source_at=? WHERE id=?",
    [this.updated_from_source_at, this.id]
  );
  console.log('Item.updateLastWatchedAtInDB', response);
}
  
  // TODO customize by this.source
Item.prototype.sortEpisodes = function() {
  this.episode_ids.sort((epIdA, epIdB) => {
    const epA = this.episodes[epIdA];
    const epB = this.episodes[epIdB];
    if (epA.order_num < epB.order_num) return -1;
    else if (epA.order_num > epB.order_num) return 1;
    else if (epA.released_on < epB.released_on) return -1;
    else if (epA.released_on > epB.released_on) return 1;
    else if (epA.season_num < epB.season_num) return -1;
    else if (epA.season_num > epB.season_num) return 1;
    else if (epA.episode_num < epB.episode_num) return -1;
    else if (epA.episode_num > epB.episode_num) return 1;
    return epA.filename.localeCompare(epB.filename, 'en', { sensitivity: 'base' });
  });
}
  
Item.prototype.findEpisode = function(episodeData) {
  if (!this.episode_ids.length) return false;
  let episodeID = null;
  if (this.source === 'local') {
    episodeID = this.episode_ids.find(
      episodeID => this.episodes[episodeID].pathname === episodeData.pathname 
    );
  } else if (this.source === 'external') {
    episodeID = this.episode_ids.find(episodeID => {
      let episode = this.episodes[episodeID];
      return (episode.season_num == episodeData.season_num
        && episode.episode_num == episodeData.episode_num);
    });
  } else if (this.source === 'ytPlaylist') {
    episodeID = this.episode_ids.find(
      episodeID => this.episodes[episodeID].url === episodeData.url 
    );
  }
  return episodeID ? this.episodes[episodeID] : false;
}
  
// If a matching episode exists, return the episode
// Else create the episode and return it
Item.prototype.getEpisodeFromData = async function(episodeData, fromScan = true) {
  if (!store.db) return false;
  let episode = this.findEpisode(episodeData);
  if (episode) return episode;
  episodeData.item_id = this.id;
  episodeData.is_new = true;
  episode = new Episode(episodeData);
  await episode.saveToDB();
  this.episodes[episode.id] = episode;
  this.episode_ids.push(episode.id);
  this.new_episode_ids.add(episode.id);
  if (fromScan) {
    if (this.is_archived && this.source === 'local') {
      this.is_archived = null;
      await this.saveToDB();
    }
    if (!store.scan_results.new_item_ids.has(this.id)) {
      store.scan_results.item_ids_with_new_episodes.add(this.id);
    }
    store.scan_results.new_episodes_count++;
  }
  return episode;
}
  
Item.prototype.setCurrentEpToNewEp = function() {
  if (!this.current_episode_id && this.new_episode_ids.size) {
    this.episode_ids.some(episodeID => {
      if (this.new_episode_ids.has(episodeID)) {
        this.current_episode_id = episodeID;
        this.updateCurrentEpInDB();
        return true;
      }
    });
  }
}
  
Item.prototype.episodeNav = function(destination) {
  let prevCurrentEpID = this.current_episode_id;
  if (!this.episode_ids.length) {
    switch (destination) {
      case 'first':
      case 'prev':
        this.current_episode_id = 0;
        break;
      case 'next':
      case 'finished':
        this.current_episode_id = null;
        break;
    }
    if (this.current_episode_id != prevCurrentEpID)
      this.updateCurrentEpInDB();
    return true;
  }
  let epIndex = this.current_episode_id
    ? this.episode_ids.indexOf(this.current_episode_id)
    : this.episode_ids.length;
  switch (destination) {
    case 'first':
      epIndex = 0;
      break;
    case 'prev':
      epIndex--;
      if (epIndex < 0) epIndex = 0;
      break;
    case 'next':
      epIndex++;
      if (epIndex > this.episode_ids.length - 1) epIndex = null;
      break;
    case 'finished':
      epIndex = null;
      break;
    case 'random':
      const oldEpIndex = epIndex;
      while (oldEpIndex == epIndex) {
        epIndex = Math.floor(Math.random()*this.episode_ids.length);
      }
      break;
  }
  if (epIndex === null) {
    this.current_episode_id = null;
  } else {
    this.current_episode_id = this.episode_ids[epIndex];
  }
  if (this.current_episode_id != prevCurrentEpID)
    this.updateCurrentEpInDB();
}

Item.prototype.getPlayingMsg = function() {
  let str = this.name;
  if (this.current_episode_id) {
    const ep = this.episodes[this.current_episode_id];
    if (ep) {
      if (ep.season_num || ep.name) str = str + ' — ';
      if (ep.season_num) str = str + ' ' + ep.sXXeXX;
      if (ep.name) str = str + ' ' + ep.name;
    }
  }
  return '⏵ Playing ' + str;
}
  
Item.prototype.play = function() {
  if (this.source === 'local') {
    if (this.type === 'movie' ) {
      store.loading_msg = this.getPlayingMsg();
      openPath(this.pathname);
    } else {
      if (!this.current_episode_id) return false;
      store.loading_msg = this.getPlayingMsg();
      openPath(this.episodes[this.current_episode_id].pathname);
    }
  } else {
    let url = null;
    if (
      this.open_list_not_ep
      || !this.current_episode_id
      || !this.episodes[this.current_episode_id]
      || !this.episodes[this.current_episode_id].url
    ) {
      url = this.url;
    } else {
      url = this.episodes[this.current_episode_id].url;
    }
    if (!url) return false;
    store.loading_msg = this.getPlayingMsg();
    openUrl(url);
  }
  this.last_watched_at = Math.round(Date.now() / 1000);
  this.updateLastWatchedAtInDB();
  return true;
}

Item.prototype.updateEpisodesFromTvdb = async function() {
  if (!this.tvdb_id) return false;
  
  store.loading_msg = 'Loading episodes...';
  
  const tvdbEpisodes = await getEpisodes(store, this.tvdb_id, this.source);
  if (!tvdbEpisodes) {
    store.loading_msg = 'No episodes retrieved';
    return false;
  }
  
  let addedCount = 0;
  let updatedCount = 0;
  
  if (this.source === 'local') {
    
    for (const episodeID of this.episode_ids) {
      let episode = this.episodes[episodeID];
      for (const tvdbEpisode of tvdbEpisodes) {
        if (
          tvdbEpisode.season_num === episode.season_num
          && tvdbEpisode.episode_num === episode.episode_num
        ) {
          const origName = episode.name;
          const origOverview = episode.overview;
          const origReleasedOn = episode.released_on;
          const origIsSeasonFinale = episode.is_season_finale;
          const origIsSeriesFinale = episode.is_series_finale;
          episode.name = tvdbEpisode.name;
          episode.overview = tvdbEpisode.overview;
          episode.released_on = tvdbEpisode.released_on;
          episode.is_season_finale = tvdbEpisode.is_season_finale;
          episode.is_series_finale = tvdbEpisode.is_series_finale;
          if (
            origName !== episode.name
            || origOverview !== episode.overview
            || origReleasedOn !== episode.released_on
            || origIsSeasonFinale != episode.is_season_finale
            || origIsSeriesFinale != episode.is_series_finale
          ) {
            episode.setSearchableText();
            episode.saveToDB();
            updatedCount++;
            episode.is_updated = true;
          }
          break;
        }
      }
    }
    this.sortEpisodes();
    store.loading_msg = `${updatedCount} episode${updatedCount == 1 ? '' : 's'} updated`;
    
  } else {
    
    let foundEpisodeIDs = [];
    let today = new Date();
    today.setHours(0,0,0,0);
    for (const tvdbEpisode of tvdbEpisodes) {
      if (
        !tvdbEpisode.season_num
        || tvdbEpisode.episode_num === null
        || (tvdbEpisode.released_on_date_obj && tvdbEpisode.released_on_date_obj > today)
      ) {
        continue;
      }
      tvdbEpisode.duration = useMinutesToTimeStr(tvdbEpisode.runtime);
      let episode = await this.getEpisodeFromData(tvdbEpisode);
      if (episode.is_new) {
        addedCount++;
      } else {
        const origName = episode.name;
        const origOverview = episode.overview;
        const origReleasedOn = episode.released_on;
        const origDuration = episode.duration;
        const origIsSeasonFinale = episode.is_season_finale;
        const origIsSeriesFinale = episode.is_series_finale;
        episode.name = tvdbEpisode.name;
        episode.overview = tvdbEpisode.overview;
        episode.released_on = tvdbEpisode.released_on;
        episode.duration = tvdbEpisode.duration;
        episode.is_season_finale = tvdbEpisode.is_season_finale;
        episode.is_series_finale = tvdbEpisode.is_series_finale;
        if (
          origName !== episode.name
          || origOverview !== episode.overview
          || origReleasedOn !== episode.released_on
          || origDuration !== episode.duration
          || origIsSeasonFinale != episode.is_season_finale
          || origIsSeriesFinale != episode.is_series_finale
        ) {
          episode.setSearchableText();
          episode.saveToDB();
          updatedCount++;
          episode.is_updated = true;
        }
      }
      foundEpisodeIDs.push(episode.id);
    }
    for (const episodeID of this.episode_ids) {
      if (!foundEpisodeIDs.includes(episodeID)) {
        this.episodes[episodeID].delete();
      }
    }
    this.sortEpisodes();
    this.setCurrentEpToNewEp();
    this.updateUpdatedFromSourceAt();
    store.loading_msg = `${addedCount} episode${addedCount == 1 ? '' : 's'} added, ${updatedCount} updated`;
    
  }
}

Item.prototype.updateEpisodesFromYoutube = async function() {
  if (!store.settings.youtube_api_key) return false;
  let playlistID = null;
  try {
    const params = new URL(this.url).searchParams;
    playlistID = params.get('list');
  } catch (e) {
    console.log(e);
    return false;
  }
  if (!playlistID) return false;
  store.loading_msg = 'Loading videos for ' + this.name + '...';
  let addedCount = 0;
  let updatedCount = 0;
  let foundEpisodeIDs = [];
  const videosData = await getYtPlaylistVideos(playlistID, store.settings.youtube_api_key);
  if (!videosData || !Array.isArray(videosData)) {
    store.loading_msg = 'Invalid response';
    return false;
  }
  for (const videoData of videosData) {
    if (!videoData.url) continue;
    if (this.order_is_reversed) {
      videoData.order_num = videosData.length - videoData.order_num;
    }
    let episode = await this.getEpisodeFromData(videoData);
    if (episode.is_new) {
      addedCount++;
    } else {
      const origName = episode.name;
      const origOverview = episode.overview;
      const origOrderNum = episode.order_num;
      const origReleasedOn = episode.released_on;
      const origDuration = episode.duration;
      episode.name = videoData.name;
      episode.overview = videoData.overview;
      episode.order_num = videoData.order_num;
      episode.released_on = videoData.released_on;
      episode.duration = videoData.duration;
      if (
        origName !== episode.name
        || origOverview !== episode.overview
        || origOrderNum !== episode.order_num
        || origReleasedOn !== episode.released_on
        || origDuration !== episode.duration
      ) {
        episode.setSearchableText();
        episode.saveToDB();
        updatedCount++;
        episode.is_updated = true;
      }
    }
    foundEpisodeIDs.push(episode.id);
  }
  for (const episodeID of this.episode_ids) {
    if (!foundEpisodeIDs.includes(episodeID)) {
      this.episodes[episodeID].delete();
    }
  }
  this.sortEpisodes();
  this.setCurrentEpToNewEp();
  this.updateUpdatedFromSourceAt();
  // store.loading_msg = `${addedCount} video${addedCount == 1 ? '' : 's'} added, ${updatedCount} updated`;
  return { added_count: addedCount, updated_count: updatedCount };
}

Item.prototype.openTvdbSlug = function(slug = false) {
  if (!slug) slug = this.tvdb_slug;
  if (!slug) return false;
  open(`https://www.thetvdb.com/${this.type === 'show' ? 'series' : 'movies'}/${slug}`);
}

Item.prototype.openFileOrFolder = function() {
  if (this.dir_name) useOpenOrHomeDir(store.settings.tv_dir + '/' + this.dir_name);
  else if (this.pathname) useShowInExplorer(this.pathname);
}
  
Item.prototype.delete = async function() {
  if (!store.db) return false;
  // Delete episodes
  let query = "DELETE FROM episodes WHERE item_id=?"
  let response = await store.db.execute(query, [this.id]);
  console.log('Item.delete episodes', response);
  // Delete item
  query = "DELETE FROM items WHERE id=?"
  response = await store.db.execute(query, [this.id]);
  console.log('Item.delete item', response);
  // Remove from store
  store.item_ids = store.item_ids.filter(itemID => itemID != this.id);
  delete store.items[this.id];
  store.removeItemFromLists(this.id);
  // If this item is selected, store.selectFirst
  if (store.home_selected_item_id == this.id)
    store.selectFirstHomeItem();
  if (store.archives_selected_item_id == this.id)
    store.selectFirstArchivesItem();
  if (this.artwork_filename) {
    invoke('delete_image', {
      deleteFilename: this.artwork_filename,
    });
  }
}