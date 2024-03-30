import { open } from '@tauri-apps/api/shell';
import { store } from '../store';
import { useGet, useSaveToDB } from '../helpers.js';

export function Movie(movieData) {
  this.id = useGet(movieData, 'id');
  this.type = 'movie';
  this.table_name = 'movies';
  this.setSlug(); // 'movie-' + this.id
  this.created_at = useGet(movieData, 'created_at');
  this.updated_at = useGet(movieData, 'updated_at');
  this.is_archived = useGet(movieData, 'is_archived', 0);
  this.pathname = useGet(movieData, 'pathname');
  this.filename = useGet(movieData, 'filename');
  this.setName(useGet(movieData, 'name'));
  this.tvdb_id = useGet(movieData, 'tvdb_id');
  this.tvdb_slug = useGet(movieData, 'tvdb_slug');
  this.duration = useGet(movieData, 'duration');
  this.last_watched_at = useGet(movieData, 'last_watched_at');
  this.poster_filename = useGet(movieData, 'poster_filename');
  this.poster_width = useGet(movieData, 'poster_width');
  this.poster_height = useGet(movieData, 'poster_height');
}

Movie.prototype.setName = function(newName = null) {
  if (newName) {
    this.name = newName;
    return false;
  }
  newName = this.filename;
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

Movie.prototype.setSlug = function() {
  this.slug = 'movie-' + this.id;
}

Movie.prototype.saveToDB = async function() {
  const response = await useSaveToDB(store, this, ['is_archived', 'name', 'pathname', 'filename', 'tvdb_id', 'tvdb_slug', 'duration', 'last_watched_at', 'poster_filename', 'poster_width', 'poster_height']);
  console.log('movie.saveToDB', response);
  return response;
}

Movie.prototype.play = function() {
  open(this.pathname);
  return true;
}

Movie.prototype.delete = async function() {
  if (!store.db) return false;
  let result, query;
  // Delete movie
  query = "DELETE FROM movies WHERE id=?"
  response = await store.db.execute(query, [this.id]);
  console.log('movie.delete movie', response);
  // Remove from store
  store.movie_ids = store.movie_ids.filter(movieID => movieID != this.id);
  delete store.movies[this.id];
  // If this movie is selected, store.selectFirst
  if (store.home.selected_item.slug === this.slug)
    store.selectFirstHomeItem();
}