import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useSecondsToTimeStr, useGetProp, useAlphaName } from './helpers.js';
import { Item } from './classes/Item.js';
import { Episode } from './classes/Episode.js';

function compareItems(itemIdA, itemIdB) {
  const itemA = store.items[itemIdA];
  const itemB = store.items[itemIdB];
  if (itemA.last_watched_at > itemB.last_watched_at) return -1;
  else if (itemA.last_watched_at < itemB.last_watched_at) return 1;
  const nameComp = itemA.alpha_name.localeCompare(itemB.alpha_name);
  if (nameComp == 0) {
    if (itemA.created_at < itemB.created_at) return -1;
    else return 1;
  }
  return nameComp;
}

export const store = reactive({
  
  local_data_dir: null,
  artworks_dir: null,
  artworks_dir_url: null,
  db: null,
  loading: false,
  loading_msg: null,
  router: null,
  route: null,
  tvdb_token: null,
  
  playback_positions: {},
  item_ids: [],
  items: {},
  new_item: null,
  
  home_unfinished_show_ids: [],
  home_finished_show_ids: [],
  home_unfinished_movie_ids: [],
  home_finished_movie_ids: [],
  archives_show_ids: [],
  archives_movie_ids: [],
  
  search_string: null,
  search_results: [],
  
  home_selected_item_id: null,
  archives_selected_item_id: null,
  show_finished_items: false,
  show_search: false,
  
  settings: {
    tv_dir: null,
    movie_dir: null,
    tvdb_apikey: null,
    tvdb_pin: null,
    youtube_api_key: null,
    mpv_watched_dir: null,
  },
  
  scan_results: {
    new_item_ids: new Set([]),
    item_ids_with_new_episodes: new Set([]),
    new_episodes_count: 0,
    deleted_items_count: 0,
    deleted_episodes_count: 0,
  },
  
  resetScanResults() {
    this.scan_results.new_item_ids.clear();
    this.scan_results.item_ids_with_new_episodes.clear();
    this.scan_results.new_episodes_count = 0;
    this.scan_results.deleted_items_count = 0;
    this.scan_results.deleted_episodes_count = 0;
  },
  
  addItem(itemData) {
    const itemID = parseInt(itemData.id);
    if (this.item_ids.includes(itemID)) {
      this.items[itemID].updateAttributes(itemData);
    } else {
      this.items[itemID] = new Item(itemData);
      this.item_ids.push(itemID);
    }
  },
  
  addEpisode(episodeData) {
    const itemID = parseInt(episodeData.item_id);
    if (!this.item_ids.includes(itemID)) return false;
    let item = this.items[itemID];
    const episodeID = parseInt(episodeData.id);
    if (this.items[itemID].episode_ids.includes(episodeID)) {
      item.episodes[episodeID].updateAttributes(episodeData);
    } else {
      item.episodes[episodeID] = new Episode(episodeData);
      item.episode_ids.push(episodeID);
    }
  },
  
  async loadFromDB() {
    // Get settings
    const rows = await this.db.select('SELECT * FROM settings');
    for (const row of rows) {
      this.settings[row.name] = row.value;
    }
    // Get items
    const itemsData = await this.db.select('SELECT * FROM items');
    for (const itemData of itemsData) {
      this.addItem(itemData);
    }
    // Get episodes
    const episodesData = await this.db.select('SELECT * FROM episodes');
    for (const episodeData of episodesData) {
      this.addEpisode(episodeData);
    }
    this.sortAllEpisodes();
    this.sortItems();
    if (this.home_selected_item_id === null) this.selectFirstHomeItem()
    if (this.archives_selected_item_id === null) this.selectFirstArchivesItem();
  },
  
  sortAllEpisodes() {
    for (const itemID of this.item_ids) {
      this.items[itemID].sortEpisodes();
    }
  },
  
  sortItems() {
    this.home_unfinished_show_ids = [];
    this.home_finished_show_ids = [];
    this.home_unfinished_movie_ids = [];
    this.home_finished_movie_ids = [];
    this.archives_show_ids = [];
    this.archives_movie_ids = [];
    for (const itemID of this.item_ids) {
      const item = this.items[itemID];
      if (item.type === 'movie') {
        if (item.is_archived) this.archives_movie_ids.push(itemID);
        else if (item.current_episode_id === null) this.home_finished_movie_ids.push(itemID);
        else this.home_unfinished_movie_ids.push(itemID);
        continue;
      }
      if (item.is_archived) this.archives_show_ids.push(itemID);
      else if (item.current_episode_id === null) this.home_finished_show_ids.push(itemID);
      else this.home_unfinished_show_ids.push(itemID);
    }
    this.home_unfinished_show_ids.sort(compareItems);
    this.home_finished_show_ids.sort(compareItems);
    this.home_unfinished_movie_ids.sort(compareItems);
    this.home_finished_movie_ids.sort(compareItems);
    this.archives_show_ids.sort(compareItems);
    this.archives_movie_ids.sort(compareItems);
  },
  
  removeItemFromLists(itemID) {
    this.home_unfinished_show_ids = this.home_unfinished_show_ids.filter(x => x != itemID);
    this.home_finished_show_ids = this.home_finished_show_ids.filter(x => x != itemID);
    this.home_unfinished_movie_ids = this.home_unfinished_movie_ids.filter(x => x != itemID);
    this.home_finished_movie_ids = this.home_finished_movie_ids.filter(x => x != itemID);
    this.archives_show_ids = this.archives_show_ids.filter(x => x != itemID);
    this.archives_movie_ids = this.archives_movie_ids.filter(x => x != itemID);
  },
  
  selectFirstHomeItem() {
    if (this.home_unfinished_show_ids.length) {
      this.home_selected_item_id = this.home_unfinished_show_ids[0];
    } else if (this.show_finished_items && this.home_finished_show_ids.length) {
      this.home_selected_item_id = this.home_finished_show_ids[0];
    } else if (this.home_unfinished_movie_ids.length) {
      this.home_selected_item_id = this.home_unfinished_movie_ids[0];
    } else if (this.show_finished_items && this.home_finished_movie_ids.length) {
      this.home_selected_item_id = this.home_finished_movie_ids[0];
    } else {
      this.home_selected_item_id = null;
    }
  },
  
  selectFirstArchivesItem() {
    if (this.archives_show_ids.length) {
      this.archives_selected_item_id = this.archives_show_ids[0];
    } else if (this.archives_movie_ids.length) {
      this.archives_selected_item_id = this.archives_movie_ids[0];
    } else {
      this.archives_selected_item_id = null;
    }
  },
  
  homeItemNav(isNext) {
    let itemIDs = this.home_unfinished_show_ids;
    if (this.show_finished_items) itemIDs = itemIDs.concat(this.home_finished_show_ids);
    itemIDs = itemIDs.concat(this.home_unfinished_movie_ids);
    if (this.show_finished_items) itemIDs = itemIDs.concat(this.home_finished_movie_ids);
    let itemIsFound = false;
    let prevItemID = null;
    let firstItemID = null;
    let lastItemID = null;
    for (const itemID of itemIDs) {
      if (isNext) {
        if (itemIsFound) {
          this.home_selected_item_id = itemID;
          return true;
        }
        lastItemID = itemID;
      } else {
        if (!firstItemID) firstItemID = itemID;
      }
      if (itemID == this.home_selected_item_id) {
        if (isNext) {
          itemIsFound = true;
          continue;
        } else {
          if (prevItemID) this.home_selected_item_id = prevItemID;
          return true;
        }
      } else if (!isNext) {
        prevItemID = itemID;
      }
    }
    if (isNext) this.home_selected_item_id = lastItemID;
    else this.home_selected_item_id = firstItemID;
  },
  
  archivesItemNav(isNext) {
    let itemIDs = this.archives_show_ids;
    itemIDs = itemIDs.concat(this.archives_movie_ids);
    let itemIsFound = false;
    let prevItemID = null;
    let firstItemID = null;
    let lastItemID = null;
    for (const itemID of itemIDs) {
      if (isNext) {
        if (itemIsFound) {
          this.archives_selected_item_id = itemID;
          return true;
        }
        lastItemID = itemID;
      } else {
        if (!firstItemID) firstItemID = itemID;
      }
      if (itemID == this.archives_selected_item_id) {
        if (isNext) {
          itemIsFound = true;
          continue;
        } else {
          if (prevItemID) this.archives_selected_item_id = prevItemID;
          return true;
        }
      } else if (!isNext) {
        prevItemID = itemID;
      }
    }
    if (isNext) this.archives_selected_item_id = lastItemID;
    else this.archives_selected_item_id = firstItemID;
  },
  
  async scanShows() {
    if (!this.settings.tv_dir || this.loading) {
      return false;
    }
    this.loading = true;
    this.loading_msg = 'Starting scan...';
    this.resetScanResults();
    let response;
    for (const itemID of this.item_ids) {
      let item = this.items[itemID];
      item.new_episode_ids.clear();
    }
    try {
      response = await invoke('scan_shows', {
        tvDir: this.settings.tv_dir
      });
    } catch (error) {
      window.alert(error);
      this.loading = false;
      return false;
    }
    console.log('scan_shows', response);
    this.loading_msg = 'Processing files...';
    // Add shows
    let foundShowDirNames = useGetProp(response, 'show_dir_names', []);
    let itemsByDirName = {};
    // This looks weird but it was necessary because of rust
    for (let i=0; i<foundShowDirNames.length; i++) {
      const dirName = foundShowDirNames[i].show_dir_name;
      foundShowDirNames[i] = dirName;
      let itemData = { dir_name: dirName, type: 'show', source: 'local' };
      let item = await this.getItemFromAttribute('dir_name', itemData);
      itemsByDirName[dirName] = item;
    }
    // Add episodes
    let episodeFiles = useGetProp(response, 'episode_files', []);
    let foundEpisodePathnames = [];
    const epFileL = episodeFiles.length;
    for (let i=0; i<epFileL; i++) {
      const episodeData = episodeFiles[i];
      foundEpisodePathnames.push(episodeData.pathname);
      let item = itemsByDirName[episodeData.show_dir_name];
      let episode = await item.getEpisodeFromData(episodeData);
      if (episode.is_new && !episode.duration) {
        let duration = await invoke('get_duration', { path: episode.pathname });
        console.log('get_duration', duration);
        duration = useSecondsToTimeStr(duration);
          if (duration) {
          episode.duration = duration;
          await episode.saveToDB();
        }
      }
    }
    this.loading_msg = 'Finishing up...';
    // Prune and sort
    await this.pruneMissingShows(foundShowDirNames);
    await this.pruneMissingEpisodes(foundEpisodePathnames);
    this.sortAllEpisodes();
    // Set shows to new episodes if applicable
    for (const itemID of this.item_ids) {
      this.items[itemID].setCurrentEpToNewEp();
    }
    this.sortItems();
    this.loading_msg = `Scan complete. New items: ${this.scan_results.new_item_ids.size} — Items with new episodes: ${this.scan_results.item_ids_with_new_episodes.size} — New episodes: ${this.scan_results.new_episodes_count} — Deleted items: ${this.scan_results.deleted_items_count} — Deleted episodes: ${this.scan_results.deleted_episodes_count}`
    this.loading = false;
  },
  
  async scanMovies() {
    if (!this.settings.movie_dir || this.loading) {
      return false;
    }
    this.loading = true;
    this.loading_msg = 'Starting scan...';
    this.resetScanResults();
    // Scan movies
    let response;
    try {
      response = await invoke('scan_movies', {
        movieDir: this.settings.movie_dir,
      });
    } catch (error) {
      window.alert(error);
      this.loading = false;
      return false;
    }
    console.log('scan_movies', response);
    let foundMoviePathnames = [];
    for (let i=0; i<response.length; i++) {
      const movieData = response[i];
      const duration = useGetProp(movieData, 'duration');
      if (duration) movieData.duration = useSecondsToTimeStr(duration);
      movieData.type = 'movie';
      movieData.source = 'local';
      let item = await this.getItemFromAttribute('pathname', movieData);
      if (item.is_new && !item.duration) {
        let duration = await invoke('get_duration', { path: item.pathname });
        duration = useSecondsToTimeStr(duration);
        console.log('get_duration', duration);
        if (duration) {
          item.duration = duration;
          await item.saveToDB();
        }
      }
      foundMoviePathnames.push(movieData.pathname);
    }
    this.loading_msg = 'Finishing up...';
    // Prune and sort
    await this.pruneMissingMovies(foundMoviePathnames);
    this.sortItems();
    this.loading_msg = `Scan complete. New items: ${this.scan_results.new_item_ids.size} — Deleted items: ${this.scan_results.deleted_items_count}`;
    this.loading = false;
  },
  
  findItemByAttribute(attrName, attrVal) {
    const itemID = this.item_ids.find(
      itemID => this.items[itemID][attrName] === attrVal
    );
    return itemID ? this.items[itemID] : false;
  },
  
  async getItemFromAttribute(attrName, itemData) {
    if (!this.db) return false;
    let item = this.findItemByAttribute(attrName, itemData[attrName]);
    if (item) return item;
    itemData.is_new = true;
    item = new Item(itemData);
    await item.saveToDB();
    this.items[item.id] = item;
    this.item_ids.push(item.id);
    this.scan_results.new_item_ids.add(item.id);
    return item;
  },
  
  async pruneMissingShows(foundShowDirNames) {
    if (!this.db) return false;
    const query = 'SELECT id, dir_name FROM items WHERE type=? AND source=?';
    const response = await this.db.select(query, ['show', 'local']);
    if (response && Array.isArray(response) && response.length) {
      for (const row of response) {
        if (foundShowDirNames.includes(row.dir_name)) continue;
        let item = new Item({ id: row.id });
        item.delete();
        store.scan_results.deleted_items_count++;
      }
    }
    console.log('pruneMissingShows', response);
  },
  
  async pruneMissingEpisodes(foundEpisodePathnames) {
    if (!this.db) return false;
    const questionMarks = new Array(foundEpisodePathnames.length).fill('?').join(', ');
    let query = 'SELECT id, item_id FROM episodes WHERE pathname IS NOT NULL AND pathname NOT IN (' + questionMarks + ')';
    const response = await this.db.select(query, foundEpisodePathnames);
    if (response && Array.isArray(response) && response.length) {
      for (const row of response) {1
        let episode = new Episode({ id: row.id, item_id: row.item_id });
        episode.delete();
        store.scan_results.deleted_episodes_count++;
      }
    }
    console.log('pruneMissingEpisodes', response);
  },
  
  async pruneMissingMovies(foundMoviePathnames) {
    if (!this.db) return false;
    const query = 'SELECT id, pathname FROM items WHERE type=? AND source=?';
    const response = await this.db.select(query, ['movie', 'local']);
    if (response && Array.isArray(response) && response.length) {
      for (const row of response) {
        if (foundMoviePathnames.includes(row.pathname)) continue;
        let item = new Item({ id: row.id });
        item.delete();
        store.scan_results.deleted_items_count++;
      }
    }
    console.log('pruneMissingMovies', response);
  },
  
  async getPlaybackPositions() {
    if (!this.settings.mpv_watched_dir) return false;
    this.playback_positions = {};
    let entries = [];
    try {
      entries = await invoke('get_playback_positions', { dir: this.settings.mpv_watched_dir });
    } catch (error) {
      console.log('getPlaybackPositions', error);
      return false;
    }
    for (const entry of entries) {
      if (
        !entry.redirect
        && entry.media_filename
        && entry.position
        && !entry.media_path.startsWith('http')
      ) {
        this.playback_positions[entry.media_filename] = useSecondsToTimeStr(entry.position);
      }
    }
  },
  
  searchAllItems(searchStr) {
    this.search_results = [];
    searchStr = useAlphaName(searchStr);
    this.search_string = searchStr;
    if (!searchStr) return false;
    for (const itemID of this.item_ids) {
      const item = this.items[itemID];
      if (!item.alpha_name.includes(searchStr)) continue;
      this.search_results.push({
        name: item.name,
        type: item.type,
        source: item.source,
        id: itemID
      });
    }
  },
  
  // If !forced, only items not updated in over 1 week will be updated
  async updateAllYtPlaylistsFromSource(forced = false) {
    if (!this.settings.youtube_api_key) return false;
    const now = Math.round(Date.now() / 1000);
    let updatedItems = 0;
    let itemsWithNewVideos = 0;
    let addedVideos = 0;
    for (const itemID of this.item_ids) {
      let item = this.items[itemID];
      if (item.source !== 'ytPlaylist') continue;
      if (!forced) {
        let updatedFromSourceAt = parseInt(item.updated_from_source_at);
        if (!updatedFromSourceAt || isNaN(updatedFromSourceAt))
          updatedFromSourceAt = 0;
        if (now - updatedFromSourceAt < 604800) continue;
      }
      let results = await item.updateEpisodesFromYoutube();
      if (results.added_count) itemsWithNewVideos++;
      addedVideos += results.added_count;
      updatedItems++;
    }
    if (updatedItems) {
      store.loading_msg = `${updatedItems} playlist${updatedItems === 1 ? '' : 's'} updated from YouTube — ${itemsWithNewVideos} item${itemsWithNewVideos == 1 ? '' : 's'} with new videos — ${addedVideos} total video${addedVideos === 1 ? '' : 's'} added`;
    } else {
      store.loading_msg = '';
    }
  },
  
});