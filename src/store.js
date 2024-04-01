import { reactive, nextTick, computed, toRaw } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { useSecondsToTimeStr, useGet } from './helpers.js';
import { Show } from './classes/Show.js';
import { Episode } from './classes/Episode.js';
import { Movie } from './classes/Movie.js';

/*
 * Constants
 */

export const nullItem = {
  slug: null,
  type: null,
  play: () => false,
}

/*
 * Store
 */

export const store = reactive({
  
  banner_dir_url: null,
  poster_dir_url: null,
  db: null,
  loading: false,
  loading_msg: null,
  loaded_from_db: false,
  router: null,
  tvdb_token: null,
  
  show_ids: [],
  shows: {},
  movie_ids: [],
  movies: {},
  playback_positions: {},
  
  home: {
    selected_item: nullItem,
    show_finished_shows: false,
  },
  
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
  
  async loadFromDB() {
    // Get settings
    const rows = await this.db.select('SELECT * FROM settings');
    for (const row of rows) {
      this.settings[row.name] = row.value;
    }
    // Get shows
    const showsData = await this.db.select('SELECT * FROM shows');
    for (const showData of showsData) {
      this.shows[showData.id] = new Show(showData);
      if (!this.show_ids.includes(showData.id))
        this.show_ids.push(showData.id);
    }
    // Get episodes
    const episodesData = await this.db.select('SELECT * FROM episodes');
    for (const episodeData of episodesData) {
      const showID = parseInt(episodeData.show_id);
      const episodeID = parseInt(episodeData.id);
      if (
        this.shows.hasOwnProperty(showID)
        && !this.shows[showID].episode_ids.includes(episodeID)
      ) {
        this.shows[showID].episodes[episodeID] = new Episode(episodeData);
        this.shows[showID].episode_ids.push(episodeID);
      }
    }
    // Get Movies
    const moviesData = await this.db.select('SELECT * FROM movies');
    for (const movieData of moviesData) {
      this.movies[movieData.id] = new Movie(movieData);
      if (!this.movie_ids.includes(movieData.id))
        this.movie_ids.push(movieData.id);
    }
    // Sort everything and select first item
    this.sortShowsAndEpisodes();
    if (this.home.selected_item.slug === null) this.selectFirstHomeItem();
    await nextTick();
    this.loaded_from_db = true;
  },
  
  async scanShows() {
    if (!this.settings.tv_dir || this.loading) {
      return false;
    }
    this.loading = true;
    this.loading_msg = null;
    this.resetScanResults();
    await this.loadFromDB();
    // Scan shows
    let response;
    let episodePathnames = [];
    for (const showID of this.show_ids) {
      let show = this.shows[showID];
      show.new_episode_ids.clear();
      for (const episodeID of show.episode_ids) {
        episodePathnames.push(show.episodes[episodeID].pathname);
      }
    }
    try {
      response = await invoke('scan_shows', {
        tvDir: this.settings.tv_dir,
        currentEpisodePathnames: episodePathnames
      });
    } catch (error) {
      window.alert(error);
      this.loading = false;
      return false;
    }
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
      const duration = useGet(episodeData, 'duration');
      if (duration) episodeData.duration = useSecondsToTimeStr(duration);
      foundEpisodePathnames.push(episodeData.pathname);
      let show = showsByDirName[episodeData.show_dir_name];
      let episode = await show.episodeFromPathname(episodeData, true);
    }
    // Prune and sort
    await this.pruneMissingShows(showDirNames);
    await this.pruneMissingEpisodes(foundEpisodePathnames);
    this.sortShowsAndEpisodes();
    // Set shows to new episodes if applicable
    for (const showID of this.show_ids) {
      this.shows[showID].setCurrentEpToNewEp();
    }
    this.loading_msg = `Scan complete: ${this.scan_results.new_shows.size} new show${this.scan_results.new_shows.size == 1 ? '' : 's'}, ${this.scan_results.shows_with_new_eps.size} show${this.scan_results.shows_with_new_eps.size == 1 ? '' : 's'} added episodes, ${this.scan_results.deleted_shows_count} show${this.scan_results.deleted_shows_count == 1 ? '' : 's'} deleted, ${this.scan_results.deleted_episodes_count} episode${this.scan_results.deleted_episodes_count == 1 ? '' : 's'} deleted`;
    this.loading = false;
  },
  
  async scanMovies() {
    if (!this.settings.movie_dir || this.loading) {
      return false;
    }
    this.loading = true;
    this.loading_msg = null;
    this.resetScanResults();
    await this.loadFromDB();
    // Scan movies
    let response;
    let moviePathnames = this.movie_ids.map(movieID => 
      this.movies[movieID].pathname
    );
    try {
      response = await invoke('scan_movies', {
        movieDir: this.settings.movie_dir,
        currentMoviePathnames: moviePathnames
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
    const movieCount = response.length;
    for (let i=0; i<movieCount; i++) {
      const movieData = response[i];
      const duration = useGet(movieData, 'duration');
      if (duration) movieData.duration = useSecondsToTimeStr(duration);
      let movie = await this.movieFromPathname(movieData);
    }
    // Prune and sort
    await this.pruneMissingMovies(moviePathnames);
    this.sortMovies();
    this.loading_msg = `Scan complete: ${this.scan_results.new_movies_count} new movies, ${this.scan_results.deleted_movies_count} deleted`;
    this.loading = false;
  },
  
  sortShowsAndEpisodes() {
    // Sort shows
    this.show_ids.sort((showIdA, showIdB) => {
      const showA = this.shows[showIdA];
      const showB = this.shows[showIdB];
      if (showA.last_watched_at > showB.last_watched_at) return -1;
      else if (showA.last_watched_at < showB.last_watched_at) return 1;
      return showA.name.localeCompare(showB.name, 'en', { sensitivity: 'base' });
    });
    // Sort episodes
    for (const showID of this.show_ids) {
      this.shows[showID].sortEpisodes();
    }
  },
  
  sortMovies() {
    // Sort movies
    this.movie_ids.sort((movieIdA, movieIdB) => {
      const movieA = this.movies[movieIdA];
      const movieB = this.movies[movieIdB];
      if (movieA.last_watched_at > movieB.last_watched_at) return -1;
      else if (movieA.last_watched_at < movieB.last_watched_at) return 1;
      return movieA.name.localeCompare(movieB.name, 'en', { sensitivity: 'base' });
    });
  },
  
  selectFirstHomeItem() {
    if (!homeItems.value.length) {
      this.home.selected_item = nullItem;
      return false;
    }
    this.home.selected_item = homeItems.value[0];
  },
  
  findShowByDirName(dirName) {
    if (!this.show_ids.length) return false;
    const showID = this.show_ids.find(
      showID => this.shows[showID].dir_name === dirName
    );
    return showID ? this.shows[showID] : false;
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
  async movieFromPathname(movieData) {
    if (!this.db) return false;
    let movie = this.findMovieByPathname(movieData.pathname);
    if (movie) return movie;
    movie = new Movie(movieData);
    await movie.saveToDB();
    this.movies[movie.id] = movie;
    this.movie_ids.push(movie.id);
    store.scan_results.new_movies_count++;
    return movie;
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
  }
});

/*
 * Items
 */

export const showIdLists = computed(() => {
  let unfinishedShowIDs = [];
  let finishedShowIDs = [];
  let archivedShowIDs = [];
  for (const showID of store.show_ids) {
    let show = store.shows[showID];
    if (show.is_archived) archivedShowIDs.push(showID);
    else if (show.current_episode_id) unfinishedShowIDs.push(showID);
    else finishedShowIDs.push(showID);
  }
  return {
    unfinished_show_ids: unfinishedShowIDs,
    finished_show_ids: finishedShowIDs,
    archived_show_ids: archivedShowIDs,
  }
});

export const movieIdLists = computed(() => {
  return {
    movie_ids: store.movie_ids.filter(movieID => !store.movies[movieID].is_archived),
    archived_movie_ids: store.movie_ids.filter(movieID => store.movies[movieID].is_archived)
  }
});

export const homeItems = computed(() => {
  let showIdVals = showIdLists.value;
  let segs = [
    showIdVals.unfinished_show_ids.map(showID => store.shows[showID])
  ];
  if (store.home.show_finished_shows) {
    segs.push(showIdVals.finished_show_ids.map(showID => store.shows[showID]));
  }
  segs.push(
    movieIdLists.value.movie_ids.map(movieID => store.movies[movieID])
  );
  return segs.flat(1);
});

export const homeSelectedItemIndex = computed(() =>
  homeItems.value.findIndex(item => store.home.selected_item.slug === item.slug)
);