import { open } from '@tauri-apps/api/shell';
import { invoke } from '@tauri-apps/api/tauri';
import { store } from '../store';
import { useGet, useAlphaName, useSaveToDB } from '../helpers.js';
import { Episode } from './Episode.js';

export function Show(showData) {
  this.id = useGet(showData, 'id');
  this.class = 'Show';
  this.type = 'Show';
  this.table_name = 'shows';
  this.setSlug(); // 'show-' + this.id
  this.created_at = useGet(showData, 'created_at');
  this.updated_at = useGet(showData, 'updated_at');
  this.is_new = useGet(showData, 'is_new');
  this.is_archived = useGet(showData, 'is_archived', 0);
  this.dir_name = useGet(showData, 'dir_name');
  this.setName(useGet(showData, 'name'));
  this.tvdb_id = useGet(showData, 'tvdb_id');
  this.tvdb_slug = useGet(showData, 'tvdb_slug');
  this.last_watched_at = useGet(showData, 'last_watched_at');
  this.artwork_filename = useGet(showData, 'artwork_filename');
  this.current_episode_id = useGet(showData, 'current_episode_id');
  this.episode_ids = [];
  this.episodes = {};
  this.new_episode_ids = new Set([]);
  this.tvdb_matches = [];
}

Show.prototype.updateFromDB = function(showData) {
  this.setName(useGet(showData, 'name'));
  this.is_archived = useGet(showData, 'is_archived');
  this.tvdb_id = useGet(showData, 'tvdb_id');
  this.tvdb_slug = useGet(showData, 'tvdb_slug');
  this.last_watched_at = useGet(showData, 'last_watched_at');
  this.artwork_filename = useGet(showData, 'artwork_filename');
  this.current_episode_id = useGet(showData, 'current_episode_id');
}

Show.prototype.setName = function(newName = null) {
  if (!newName) newName = this.dir_name;
  this.name = newName;
  this.alpha_name = useAlphaName(newName);
}

Show.prototype.setSlug = function() {
  this.slug = 'show-' + this.id;
}

Show.prototype.saveToDB = async function() {
  const response = await useSaveToDB(store, this, ['is_archived', 'name', 'dir_name', 'tvdb_id', 'tvdb_slug', 'last_watched_at', 'artwork_filename', 'current_episode_id']);
  console.log('Show.saveToDB', response);
  return response;
}

Show.prototype.updateCurrentEpInDB = async function() {
  if (!store.db || !this.id) return false;
  let response = await store.db.execute(
    "UPDATE shows SET current_episode_id=? WHERE id=?",
    [this.current_episode_id, this.id]
  );
  console.log('Show.updateCurrentEpInDB', response);
}

Show.prototype.updateLastWatchedAtInDB = async function() {
  if (!store.db || !this.id) return false;
  let response = await store.db.execute(
    "UPDATE shows SET last_watched_at=? WHERE id=?",
    [this.last_watched_at, this.id]
  );
  console.log('Show.updateLastWatchedAtInDB', response);
}

Show.prototype.findEpisodeByPathname = function(pathname) {
  if (!this.episode_ids.length) return false;
  const episodeID = this.episode_ids.find(
    episodeID => this.episodes[episodeID].pathname === pathname
  );
  return episodeID ? this.episodes[episodeID] : false;
}

// If an ep already exists with that pathname, returns the ep
// Else, adds the ep to DB and show
Show.prototype.episodeFromPathname = async function(episodeData, fromScan = false) {
  if (!store.db) return false;
  let episode = this.findEpisodeByPathname(episodeData.pathname);
  if (episode) return episode;
  episode = new Episode({
    show_id: this.id,
    is_new: fromScan,
    pathname: episodeData.pathname,
    filename: episodeData.filename,
    duration: useGet(episodeData, 'duration'),
  }, fromScan);
  await episode.saveToDB();
  this.episodes[episode.id] = episode;
  this.episode_ids.push(episode.id);
  this.new_episode_ids.add(episode.id);
  if (fromScan) {
    if (!store.scan_results.new_shows.has(this.id)) {
      store.scan_results.shows_with_new_eps.add(this.id);
      if (this.is_archived) {
        this.is_archived = null;
        await this.saveToDB();
      }
    }
    store.scan_results.new_episodes_count++;
  }
  return episode;
}

Show.prototype.sortEpisodes = function() {
  this.episode_ids.sort((epIdA, epIdB) => {
    const epA = this.episodes[epIdA];
    const epB = this.episodes[epIdB];
    if (epA.released_on < epB.released_on) return -1;
    else if (epA.released_on > epB.released_on) return 1;
    else if (epA.season_num < epB.season_num) return -1;
    else if (epA.season_num > epB.season_num) return 1;
    else if (epA.episode_num < epB.episode_num) return -1;
    else if (epA.episode_num > epB.episode_num) return 1;
    return epA.filename.localeCompare(epB.filename, 'en', { sensitivity: 'base' });
  });
}

Show.prototype.setCurrentEpToNewEp = function() {
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

Show.prototype.episodeNav = function(destination) {
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

Show.prototype.play = function() {
  if (!this.current_episode_id) return false;
  open(this.episodes[this.current_episode_id].pathname);
  this.last_watched_at = Math.round(Date.now() / 1000);
  this.updateLastWatchedAtInDB();
  return true;
}

Show.prototype.delete = async function() {
  if (!store.db) return false;
  let response, query;
  // Delete show episodes
  query = "DELETE FROM episodes WHERE show_id=?"
  response = await store.db.execute(query, [this.id]);
  console.log('Show.delete episodes', response);
  // Delete show
  query = "DELETE FROM shows WHERE id=?"
  response = await store.db.execute(query, [this.id]);
  console.log('Show.delete show', response);
  // Remove from store
  store.show_ids = store.show_ids.filter(showID => showID != this.id);
  delete store.shows[this.id];
  store.removeItemFromLists(this.slug);
  // If this show is selected, store.selectFirst
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