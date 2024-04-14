import { open } from '@tauri-apps/api/shell';
import { invoke } from '@tauri-apps/api/tauri';
import { store } from '../store';
import { useGet, useAlphaName, useSaveToDB } from '../helpers.js';
import { ExternalItemEpisode } from './ExternalItemEpisode.js';

export function ExternalItem(itemData) {
  this.id = useGet(itemData, 'id');
  this.class = 'ExternalItem';
  this.type = useGet(itemData, 'type');
  this.table_name = 'external_items';
  this.setSlug(); // 'external_item-' + this.id
  this.created_at = useGet(itemData, 'created_at');
  this.updated_at = useGet(itemData, 'updated_at');
  this.is_new = useGet(itemData, 'is_new');
  this.is_archived = useGet(itemData, 'is_archived', 0);
  this.url = useGet(itemData, 'url');
  this.setName(useGet(itemData, 'name'));
  this.tvdb_id = useGet(itemData, 'tvdb_id');
  this.tvdb_slug = useGet(itemData, 'tvdb_slug');
  this.duration = useGet(itemData, 'duration');
  this.last_watched_at = useGet(itemData, 'last_watched_at');
  this.current_episode_id = useGet(itemData, 'current_episode_id', -1);
  this.artwork_filename = useGet(itemData, 'artwork_filename');
  this.episode_ids = [];
  this.episodes = {};
  this.new_episode_ids = new Set([]);
  this.tvdb_matches = [];
}

ExternalItem.prototype.updateFromDB = function(itemData) {
  this.setName(useGet(itemData, 'name'));
  this.is_archived = useGet(itemData, 'is_archived');
  this.tvdb_id = useGet(itemData, 'tvdb_id');
  this.tvdb_slug = useGet(itemData, 'tvdb_slug');
  this.duration = useGet(itemData, 'duration');
  this.last_watched_at = useGet(itemData, 'last_watched_at');
  this.current_episode_id = useGet(itemData, 'current_episode_id');
  this.artwork_filename = useGet(itemData, 'artwork_filename');
  this.url = useGet(itemData, 'url');
}

ExternalItem.prototype.setName = function(newName = null) {
  if (!newName) newName = this.url;
  this.name = newName;
  this.alpha_name = useAlphaName(newName);
}

ExternalItem.prototype.setSlug = function() {
  this.slug = 'external_item-' + this.id;
}

ExternalItem.prototype.saveToDB = async function() {
  const response = await useSaveToDB(store, this, ['is_archived', 'type', 'name', 'tvdb_id', 'tvdb_slug', 'last_watched_at', 'artwork_filename', 'url', 'duration']);
  console.log('ExternalItem.saveToDB', response);
  return response;
}

ExternalItem.prototype.updateCurrentEpInDB = async function() {
  if (!store.db || !this.id) return false;
  let response = await store.db.execute(
    "UPDATE external_items SET current_episode_id=? WHERE id=?",
    [this.current_episode_id, this.id]
  );
  console.log('Show.updateCurrentEpInDB', response);
}

ExternalItem.prototype.updateLastWatchedAtInDB = async function() {
  if (!store.db || !this.id) return false;
  let response = await store.db.execute(
    "UPDATE external_items SET last_watched_at=? WHERE id=?",
    [this.last_watched_at, this.id]
  );
  console.log('ExternalItem.updateLastWatchedAtInDB', response);
}

ExternalItem.prototype.findEpisodeBySeasonEp = function(seasonNum, episodeNum) {
  if (!this.episode_ids.length) return false;
  const episodeID = this.episode_ids.find(episodeID => {
    let episode = this.episodes[episodeID];
    return episode.season_num == seasonNum && episode.episode_num == episodeNum;
  });
  return episodeID ? this.episodes[episodeID] : false;
}

// If an ep already exists with that pathname, returns the ep
// Else, adds the ep to DB and show
ExternalItem.prototype.episodeFromSeasonEp = async function(episodeData, fromScan = false) {
  if (!store.db) return false;
  let episode = this.findEpisodeBySeasonEp(episodeData.season_num, episodeData.episode_num);
  if (episode) return episode;
  episode = new ExternalItemEpisode({
    external_item_id: this.id,
    is_new: fromScan,
    season_num: useGet(episodeData, 'season_num'),
    episode_num: useGet(episodeData, 'episode_num'),
  }, fromScan);
  await episode.saveToDB();
  this.episodes[episode.id] = episode;
  this.episode_ids.push(episode.id);
  this.new_episode_ids.add(episode.id);
  if (fromScan) {
    if (this.is_archived) {
      this.is_archived = null;
      await this.saveToDB();
    }
  }
  return episode;
}

ExternalItem.prototype.sortEpisodes = function() {
  this.episode_ids.sort((epIdA, epIdB) => {
    const epA = this.episodes[epIdA];
    const epB = this.episodes[epIdB];
    if (epA.order_num < epB.order_num) return -1;
    else if (epA.order_num > epB.order_num) return 1;
    if (epA.released_on < epB.released_on) return -1;
    else if (epA.released_on > epB.released_on) return 1;
    else if (epA.season_num < epB.season_num) return -1;
    else if (epA.season_num > epB.season_num) return 1;
    else if (epA.episode_num < epB.episode_num) return -1;
    else if (epA.episode_num > epB.episode_num) return 1;
    return epA.name.localeCompare(epB.name, 'en', { sensitivity: 'base' });
  });
}

ExternalItem.prototype.setCurrentEpToNewEp = function() {
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

ExternalItem.prototype.episodeNav = function(destination) {
  let prevCurrentEpID = this.current_episode_id;
  if (!this.episode_ids.length) {
    switch (destination) {
      case 'first':
      case 'prev':
        this.current_episode_id = -1;
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

ExternalItem.prototype.play = function() {
  if (!this.url) return false;
  open(this.url);
  this.last_watched_at = Math.round(Date.now() / 1000);
  this.updateLastWatchedAtInDB();
  return true;
}

ExternalItem.prototype.delete = async function() {
  if (!store.db) return false;
  let response, query;
  // Delete episodes
  query = "DELETE FROM external_item_episodes WHERE external_item_id=?"
  response = await store.db.execute(query, [this.id]);
  console.log('ExternalItem.delete episodes', response);
  // Delete external_item
  query = "DELETE FROM external_items WHERE id=?"
  response = await store.db.execute(query, [this.id]);
  console.log('ExternalItem.delete', response);
  // Remove from store
  store.external_item_ids = store.external_item_ids.filter(itemID => itemID != this.id);
  delete store.external_items[this.id];
  store.removeItemFromLists(this.slug);
  // If this item is selected, store.selectFirst
  if (store.home_selected_item.slug === this.slug)
    store.selectFirstHomeItem();
  if (store.archives_selected_item.slug === this.slug)
    store.selectFirstArchivesItem();
  if (this.artwork_filename) {
    invoke('delete_image', {
      deleteFilename: this.artwork_filename,
    });
  }
}