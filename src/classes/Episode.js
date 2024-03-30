import { store } from '../store';
import { useGet, useAlphaName, useSaveToDB } from '../helpers.js';

export function Episode(episodeData, fromScan = false) {
  this.id = useGet(episodeData, 'id');
  this.table_name = 'episodes';
  this.created_at = useGet(episodeData, 'created_at');
  this.updated_at = useGet(episodeData, 'updated_at');
  this.is_archived = useGet(episodeData, 'is_archived', 0);
  this.show_id = useGet(episodeData, 'show_id');
  this.pathname = useGet(episodeData, 'pathname');
  this.filename = useGet(episodeData, 'filename');
  this.overview = useGet(episodeData, 'overview');
  this.released_on = useGet(episodeData, 'released_on');
  this.duration = useGet(episodeData, 'duration');
  this.is_new_addition = useGet(episodeData, 'is_new_addition');
  if (fromScan) {
    this.parseFilename();
    this.setSearchableText();
  } else {
    this.season_num = useGet(episodeData, 'season_num');
    this.episode_num = useGet(episodeData, 'episode_num');
    this.name = useGet(episodeData, 'name');
    this.searchable_text = useGet(episodeData, 'searchable_text');
  }
}

Episode.prototype.setSearchableText = function() {
  let baseText = this.name + ' ' + this.filename;
  if (this.overview) baseText += ' ' + this.overview;
  this.searchable_text = useAlphaName(baseText, ' ');
}

Episode.prototype.parseFilename = function() {
  let seasonNum = null;
  let episodeNum = null;
  let name = this.filename;
  let regexp = /[\s\.\-]+s(eason)?[\s\.\-]*(?<sn>\d+)[\s\.\-]*e(pisode)?[\s\.\-]*(?<en>\d+)[\s\.\-]+/gi;
  let result = regexp.exec(this.filename);
  if (result) {
    seasonNum = parseInt(result.groups.sn);
    episodeNum = parseInt(result.groups.en);
  } else {
    regexp = /[\s\.\-]+(?<sn>\d+)x(?<en>\d+)[\s\.\-]+/gi;
    result = regexp.exec(this.filename);
    if (result) {
      seasonNum = parseInt(result.groups.sn);
      episodeNum = parseInt(result.groups.en);
    }
  }
  if (seasonNum !== null && result) {
    const sXXeXX = result[0];
    const index = result.index;
    const substr = this.filename.slice(index + sXXeXX.length);
    regexp = /[\s\.\-]+\(?\d+(i|p|x\d+)(\)|\s|\.|\-|$)/gi;
    const parts = substr.split(regexp);
    name = parts[0].replaceAll('.', ' ');
  }
  this.season_num = seasonNum;
  this.episode_num = episodeNum;
  this.name = name;
}

Episode.prototype.setSlug = function() {
  return false;
}

Episode.prototype.saveToDB = async function() {
  const response = await useSaveToDB(store, this, ['is_archived', 'show_id', 'pathname', 'filename', 'season_num', 'episode_num', 'name', 'overview', 'released_on', 'duration', 'searchable_text']);
  console.log('episode.saveToDB', response);
  return response;
}

Episode.prototype.delete = async function() {
  if (!store.db) return false;
  let result, query;
  // Delete episode
  query = "DELETE FROM episodes WHERE id=?"
  response = await store.db.execute(query, [this.id]);
  console.log('episode.delete episode', response);
  // Remove from store
  if (store.shows.hasOwnProperty(this.show_id)) {
    let show = store.shows[this.show_id];
    show.episode_ids = show.episode_ids.filter(episodeID => episodeID != this.id);
    delete show.episodes[this.id];
  }
}