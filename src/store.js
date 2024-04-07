import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { useSecondsToTimeStr, useGet, useAlphaName } from './helpers.js';
import { Show } from './classes/Show.js';
import { Episode } from './classes/Episode.js';
import { ExternalItem } from './classes/ExternalItem.js';
import { Movie } from './classes/Movie.js';

/*
 * Utilities
 */

export const nullItem = {
  slug: null,
  type: null,
  play: () => false,
}

function compareItems(itemA, itemB) {
  if (itemA.last_watched_at > itemB.last_watched_at) return -1;
  else if (itemA.last_watched_at < itemB.last_watched_at) return 1;
  const nameComp = itemA.alpha_name.localeCompare(itemB.alpha_name);
  if (nameComp == 0) {
    if (itemA.created_at < itemB.created_at) return -1;
    else return 1;
  }
  return nameComp;
}

/*
 * Store
 */

export const store = reactive({
  
  local_data_dir: null,
  artworks_dir: null,
  artworks_dir_url: null,
  db: null,
  loading: false,
  loading_msg: null,
  loaded_from_db: false,
  router: null,
  route: null,
  tvdb_token: null,
  
  playback_positions: {},
  show_ids: [],
  shows: {},
  movie_ids: [],
  movies: {},
  external_item_ids: [],
  external_items: {},
  new_external_item: null,
  
  home_unfinished_showtype_items: [],
  home_finished_showtype_items: [],
  home_movietype_items: [],
  archives_showtype_items: [],
  archives_movietype_items: [],
  
  search_string: null,
  search_results: [],
  
  home_selected_item: nullItem,
  archives_selected_item: nullItem,
  show_finished_shows: false,
  show_search: false,
  
  settings: {
    tv_dir: null,
    movie_dir: null,
    tvdb_apikey: null,
    tvdb_pin: null,
    mpv_watched_dir: null,
  },
  
  scan_results: {
    new_shows: new Set([]),
    shows_with_new_eps: new Set([]),
    new_episodes_count: 0,
    deleted_shows_count: 0,
    deleted_episodes_count: 0,
    new_movies_count: 0,
    deleted_movies_count: 0,
  },
  
  resetScanResults() {
    this.scan_results.new_shows.clear();
    this.scan_results.shows_with_new_eps.clear();
    this.scan_results.new_episodes_count = 0;
    this.scan_results.deleted_shows_count = 0;
    this.scan_results.deleted_episodes_count = 0;
    this.scan_results.new_movies_count = 0;
    this.scan_results.deleted_movies_count = 0;
  },
  
  addShow(showData) {
    if (this.show_ids.includes(showData.id)) {
      this.shows[showData.id].updateFromDB(showData);
    } else {
      this.shows[showData.id] = new Show(showData);
      this.show_ids.push(showData.id);
    }
  },
  
  addEpisode(episodeData) {
    const showID = parseInt(episodeData.show_id);
    if (!this.shows.hasOwnProperty(showID)) return false;
    let show = this.shows[showID];
    const episodeID = parseInt(episodeData.id);
    if (this.shows[showID].episode_ids.includes(episodeID)) {
      show.episodes[episodeID].updateFromDB(episodeData);
    } else {
      show.episodes[episodeID] = new Episode(episodeData);
      show.episode_ids.push(episodeID);
    }
  },
  
  addExternalItem(itemData) {
    if (this.external_item_ids.includes(itemData.id)) {
      this.external_items[itemData.id].updateFromDB(itemData);
    } else {
      this.external_items[itemData.id] = new ExternalItem(itemData);
      this.external_item_ids.push(itemData.id);
    }
  },
  
  addMovie(movieData) {
    if (this.movie_ids.includes(movieData.id)) {
      this.movies[movieData.id].updateFromDB(movieData);
    } else {
      this.movies[movieData.id] = new Movie(movieData);
      this.movie_ids.push(movieData.id);
    }
  },
  
  async loadFromDB() {
    // Get settings
    const rows = await this.db.select('SELECT * FROM settings');
    for (const row of rows) {
      this.settings[row.name] = row.value;
    }
    // Get shows
    const showsData = await this.db.select('SELECT * FROM shows');
    for (const showData of showsData) {
      this.addShow(showData);
    }
    // Get episodes
    const episodesData = await this.db.select('SELECT * FROM episodes');
    for (const episodeData of episodesData) {
      this.addEpisode(episodeData);
    }
    // Get External Items
    const externalItemsData = await this.db.select('SELECT * FROM external_items');
    for (const itemData of externalItemsData) {
      this.addExternalItem(itemData);
    }
    // Get Movies
    const moviesData = await this.db.select('SELECT * FROM movies');
    for (const movieData of moviesData) {
      this.addMovie(movieData);
    }
    this.sortAllEpisodes();
    this.sortShowtypeLists();
    this.sortMovietypeLists();
    if (this.home_selected_item.slug === null) this.selectFirstHomeItem()
    if (this.archives_selected_item.slug === null) this.selectFirstArchivesItem();
    
    this.loaded_from_db = true;
  },
  
  async scanShows() {
    if (!this.settings.tv_dir || this.loading) {
      return false;
    }
    this.loading = true;
    this.loading_msg = 'Starting scan...';
    this.resetScanResults();
    // Scan shows
    let response;
    for (const showID of this.show_ids) {
      let show = this.shows[showID];
      show.new_episode_ids.clear();
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
    this.loading_msg = 'Processing files...';
    console.log('scan_shows', response);
    // Add shows
    let showDirNames = useGet(response, 'show_dir_names', []);
    let showsByDirName = {};
    const showDirL = showDirNames.length;
    for (let i=0; i<showDirL; i++) {
      const dirName = showDirNames[i].show_dir_name;
      showDirNames[i] = dirName;
      let show = await this.showFromDirName(dirName, true);
      showsByDirName[dirName] = show;
    }
    // Add episodes
    let episodeFiles = useGet(response, 'episode_files', []);
    let foundEpisodePathnames = [];
    const epFileL = episodeFiles.length;
    for (let i=0; i<epFileL; i++) {
      const episodeData = episodeFiles[i];
      foundEpisodePathnames.push(episodeData.pathname);
      let show = showsByDirName[episodeData.show_dir_name];
      let episode = await show.episodeFromPathname(episodeData, true);
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
    // Prune and sort
    await this.pruneMissingShows(showDirNames);
    await this.pruneMissingEpisodes(foundEpisodePathnames);
    this.sortAllEpisodes();
    // Set shows to new episodes if applicable
    for (const showID of this.show_ids) {
      this.shows[showID].setCurrentEpToNewEp();
    }
    this.sortShowtypeLists();
    this.loading_msg = `Scan complete: ${this.scan_results.new_shows.size} new show${this.scan_results.new_shows.size == 1 ? '' : 's'}, ${this.scan_results.shows_with_new_eps.size} show${this.scan_results.shows_with_new_eps.size == 1 ? '' : 's'} added episodes, ${this.scan_results.deleted_shows_count} show${this.scan_results.deleted_shows_count == 1 ? '' : 's'} deleted, ${this.scan_results.deleted_episodes_count} episode${this.scan_results.deleted_episodes_count == 1 ? '' : 's'} deleted`;
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
    if (!response || !Array.isArray (response)) {
      window.alert("Invalid response");
      return false;
    }
    this.loading_msg = 'Processing files...';
    const movieCount = response.length;
    let updatedMoviePathnames = [];
    for (let i=0; i<movieCount; i++) {
      const movieData = response[i];
      const duration = useGet(movieData, 'duration');
      if (duration) movieData.duration = useSecondsToTimeStr(duration);
      let movie = await this.movieFromPathname(movieData, true);
      if (movie.is_new && !movie.duration) {
        let duration = await invoke('get_duration', { path: movie.pathname });
        duration = useSecondsToTimeStr(duration);
        console.log('get_duration', duration);
        if (duration) {
          movie.duration = duration;
          await movie.saveToDB();
        }
      }
      updatedMoviePathnames.push(movieData.pathname);
    }
    // Prune and sort
    await this.pruneMissingMovies(updatedMoviePathnames);
    this.sortMovietypeLists();
    this.loading_msg = `Scan complete: ${this.scan_results.new_movies_count} new movies, ${this.scan_results.deleted_movies_count} deleted`;
    this.loading = false;
  },
  
  sortAllEpisodes() {
    for (const showID of this.show_ids) {
      this.shows[showID].sortEpisodes();
    }
  },
  
  sortShowtypeLists() {
    this.home_unfinished_showtype_items = [];
    this.home_finished_showtype_items = [];
    this.archives_showtype_items = [];
    for (const showID of this.show_ids) {
      const show = this.shows[showID];
      if (show.is_archived) this.archives_showtype_items.push(show);
      else if (!show.current_episode_id) this.home_finished_showtype_items.push(show);
      else this.home_unfinished_showtype_items.push(show);
    }
    for (const itemID of this.external_item_ids) {
      const item = this.external_items[itemID];
      if (item.type !== 'Show') continue;
      if (item.is_archived) this.archives_showtype_items.push(item);
      else this.home_unfinished_showtype_items.push(item);
    }
    this.home_unfinished_showtype_items.sort(compareItems);
    this.home_finished_showtype_items.sort(compareItems);
    this.archives_showtype_items.sort(compareItems);
  },
  
  sortMovietypeLists() {
    this.home_movietype_items = [];
    this.archives_movietype_items = [];
    for (const movieID of this.movie_ids) {
      const movie = this.movies[movieID];
      if (movie.is_archived) this.archives_movietype_items.push(movie);
      else this.home_movietype_items.push(movie);
    }
    for (const itemID of this.external_item_ids) {
      const item = this.external_items[itemID];
      if (item.type !== 'Movie') continue;
      if (item.is_archived) this.archives_movietype_items.push(item);
      else this.home_movietype_items.push(item);
    }
    this.home_movietype_items.sort(compareItems);
    this.archives_movietype_items.sort(compareItems);
  },
  
  homeItemNav(isNext) {
    let items = this.home_unfinished_showtype_items;
    if (this.show_finished_shows) items = items.concat(this.home_finished_showtype_items);
    items = items.concat(this.home_movietype_items);
    let itemIsFound = false;
    let prevItem = nullItem;
    let firstItem = nullItem;
    let lastItem = nullItem;
    for (const item of items) {
      if (isNext) {
        if (itemIsFound) {
          this.home_selected_item = item;
          return true;
        }
        lastItem = item;
      } else {
        if (!firstItem.slug) firstItem = item;
      }
      if (item.slug === this.home_selected_item.slug) {
        if (isNext) {
          itemIsFound = true;
          continue;
        } else {
          if (prevItem.slug) this.home_selected_item = prevItem;
          return true;
        }
      } else if (!isNext) {
        prevItem = item;
      }
    }
    if (isNext) this.home_selected_item = lastItem;
    else this.home_selected_item = firstItem;
  },
  
  selectFirstHomeItem() {
    if (this.home_unfinished_showtype_items.length) {
      this.home_selected_item = this.home_unfinished_showtype_items[0];
      return true;
    }
    if (this.show_finished_shows && this.home_finished_showtype_items.length) {
      this.home_selected_item = this.home_finished_showtype_items[0];
      return true;
    }
    if (this.home_movietype_items.length) {
      this.home_selected_item = this.home_movietype_items[0];
    }
  },
  
  archivesItemNav(isNext) {
    let items = this.archives_showtype_items.concat(this.archives_movietype_items);
    let itemIsFound = false;
    let prevItem = nullItem;
    let firstItem = nullItem;
    let lastItem = nullItem;
    for (const item of items) {
      if (isNext) {
        if (itemIsFound) {
          this.archives_selected_item = item;
          return true;
        }
        lastItem = item;
      } else {
        if (!firstItem.slug) firstItem = item;
      }
      if (item.slug === this.archives_selected_item.slug) {
        if (isNext) {
          itemIsFound = true;
          continue;
        } else {
          if (prevItem.slug) this.archives_selected_item = prevItem;
          return true;
        }
      } else if (!isNext) {
        prevItem = item;
      }
    }
    if (isNext) this.archives_selected_item = lastItem;
    else this.archives_selected_item = firstItem;
  },
  
  selectFirstArchivesItem() {
    if (this.archives_showtype_items.length) {
      this.archives_selected_item = this.archives_showtype_items[0];
      return true;
    }
    if (this.archives_movietype_items.length) {
      this.archives_selected_item = this.archives_movietype_items[0];
    }
  },
  
  findShowByDirName(dirName) {
    if (!this.show_ids.length) return false;
    const showID = this.show_ids.find(
      showID => this.shows[showID].dir_name === dirName
    );
    return showID ? this.shows[showID] : false;
  },
  
  removeItemFromLists(slug) {
    this.home_unfinished_showtype_items = this.home_unfinished_showtype_items.filter(item => item.slug !== slug);
    this.home_finished_showtype_items = this.home_finished_showtype_items.filter(item => item.slug !== slug);
    this.home_movietype_items = this.home_movietype_items.filter(item => item.slug !== slug);
    this.archives_showtype_items = this.archives_showtype_items.filter(item => item.slug !== slug);
    this.archives_movietype_items = this.archives_movietype_items.filter(item => item.slug !== slug);
  },
  
  // If a show already exists with that dirName, returns the show
  // Else, adds the show to DB and store
  async showFromDirName(dirName, fromScan = false) {
    if (!this.db) return false;
    let show = this.findShowByDirName(dirName);
    if (show) return show;
    show = new Show({dir_name: dirName, is_new: fromScan});
    await show.saveToDB();
    this.shows[show.id] = show;
    this.show_ids.push(show.id);
    this.scan_results.new_shows.add(show.id);
    return show;
  },
  
  findMovieByPathname(pathname) {
    if (!this.movie_ids.length) return false;
    const movieID = this.movie_ids.find(
      movieID => this.movies[movieID].pathname === pathname
    );
    return movieID ? this.movies[movieID] : false;
  },
  
  // If a movie already exists with that pathname, returns the movie
  // Else, adds the movie to DB and store
  async movieFromPathname(movieData, fromScan = false) {
    if (!this.db) return false;
    let movie = this.findMovieByPathname(movieData.pathname);
    if (movie) return movie;
    movieData.is_new = fromScan;
    movie = new Movie(movieData);
    await movie.saveToDB();
    this.movies[movie.id] = movie;
    this.movie_ids.push(movie.id);
    store.scan_results.new_movies_count++;
    return movie;
  },
  
  findExtItemByUrl(url) {
    if (!this.external_item_ids.length) return false;
    const itemID = this.external_item_ids.find(
      itemID => this.external_items[itemID].url === url
    );
    return itemID ? this.external_items[itemID] : false;
  },
  
  async pruneMissingShows(showDirNames) {
    if (!this.db) return false;
    if (!showDirNames || !showDirNames.length) return false;
    const query = 'SELECT id FROM shows WHERE dir_name!=?'
      + ' AND dir_name!=?'.repeat(showDirNames.length - 1);
    const response = await this.db.select(query, showDirNames);
    if (response && Array.isArray(response) && response.length) {
      for (const row of response) {
        let show = new Show({ id: row.id });
        show.delete();
        store.scan_results.deleted_shows_count++;
      }
    }
    console.log('pruneMissingShows', response);
  },
  
  async pruneMissingEpisodes(episodePathnames) {
    if (!this.db) return false;
    if (!episodePathnames || !episodePathnames.length) return false;
    const query = 'SELECT id, show_id FROM episodes WHERE pathname!=?'
      + ' AND pathname!=?'.repeat(episodePathnames.length - 1);
    const response = await this.db.select(query, episodePathnames);
    if (response && Array.isArray(response) && response.length) {
      for (const row of response) {
        let episode = new Episode({id: row.id, show_id: row.show_id});
        episode.delete();
        store.scan_results.deleted_episodes_count++;
      }
    }
    console.log('pruneMissingEpisodes', response);
  },
  
  async pruneMissingMovies(moviePathnames) {
    if (!this.db) return false;
    if (!moviePathnames || !moviePathnames.length) return false;
    const query = 'SELECT id FROM movies WHERE pathname!=?'
      + ' AND pathname!=?'.repeat(moviePathnames.length - 1);
    const response = await this.db.select(query, moviePathnames);
    if (response && Array.isArray(response) && response.length) {
      for (const row of response) {
        let movie = new Movie({ id: row.id });
        movie.delete();
        store.scan_results.deleted_movies_count++;
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
    for (const showID of this.show_ids) {
      const show = this.shows[showID];
      if (!show.alpha_name.includes(searchStr)) continue;
      this.search_results.push({
        name: show.name,
        type: show.type,
        route_name: 'show',
        id: showID
      });
    }
    for (const itemID of this.external_item_ids) {
      const item = this.external_items[itemID];
      if (!item.alpha_name.includes(searchStr)) continue;
      this.search_results.push({
        name: item.name,
        type: item.type,
        route_name: 'externalItem',
        id: itemID
      });
    }
    for (const movieID of this.movie_ids) {
      const movie = this.movies[movieID];
      if (!movie.alpha_name.includes(searchStr)) continue;
      this.search_results.push({
        name: movie.name,
        type: movie.type,
        route_name: 'movie',
        id: movieID
      });
    }
  }
});