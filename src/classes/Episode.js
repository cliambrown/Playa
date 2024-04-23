import { store } from '../store';
import { useGetProp, useAlphaName } from '../helpers.js';

export function Episode(episodeData) {
    
  this.attributes = new Set([
    { name: 'id', def: null, updatable: false, to_db: false },
    { name: 'created_at', def: null, updatable: true, to_db: false },
    { name: 'updated_at', def: null, updatable: true, to_db: false },
    { name: 'item_id', def: null, updatable: true },
    { name: 'pathname', def: null, updatable: true },
    { name: 'filename', def: null, updatable: true },
    { name: 'url', def: null, updatable: true },
    { name: 'season_num', def: null, updatable: true },
    { name: 'episode_num', def: null, updatable: true },
    { name: 'order_num', def: null, updatable: true },
    { name: 'name', def: null, updatable: true },
    { name: 'overview', def: null, updatable: true },
    { name: 'released_on', def: null, updatable: true },
    { name: 'duration', def: null, updatable: true },
  ]);
  
  for (const attribute of this.attributes) {
    this[attribute.name] = useGetProp(episodeData, attribute.name, attribute.def);
  }
  
  this.searchable_text = null;
  this.sXXeXX = null;
  this.is_new = useGetProp(episodeData, 'is_new');
  this.is_updated = useGetProp(episodeData, 'is_updated');
  
  this.parseFilename();
  this.setSXXEXX();
  this.setSearchableText();
}
  
Episode.prototype.updateAttributes = function(episodeData) {
  for (const attribute of this.attributes) {
    if (attribute.updatable && Object.hasOwn(episodeData, attribute.name))
      this[attribute.name] = episodeData[attribute.name];
  }
  this.setSearchableText();
}
  
Episode.prototype.setSearchableText = function() {
  this.searchable_text = useAlphaName(this.name+' '+this.overview+' '+this.sXXeXX);
}
  
Episode.prototype.setSXXEXX = function() {
  const sXX = this.season_num ? (this.season_num + '').padStart(2, '0') : '??';
  const eXX = this.episode_num ? (this.episode_num + '').padStart(2, '0') : '??';
  this.sXXeXX = 'S' + sXX + 'E' + eXX;
}
  
Episode.prototype.parseFilename = function() {
  if (!this.filename) return false;
  if (this.season_num !== null && this.episode_num !== null && this.name !== null) return false;
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
  
Episode.prototype.saveToDB = async function() {
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
    query = `UPDATE episodes SET ${fieldStrs.join(', ')} WHERE id=?`;
  } else {
    params.push(now, now);
    const qMarks = Array(params.length).fill('?').join(', ');
    query = `INSERT INTO episodes (${fieldStrs.join(', ')}, created_at, updated_at) VALUES (${qMarks})`;
  }
  const response = await store.db.execute(query, params);
  if (!isUpdate) this.id = parseInt(response.lastInsertId);
  console.log('Episode.saveToDB', response);
  return response;
}

Episode.prototype.delete = async function() {
  if (!store.db) return false;
  // Delete episode
  let query = "DELETE FROM episodes WHERE id=?"
  let response = await store.db.execute(query, [this.id]);
  console.log('Episode.delete episode', response);
  // Remove from store
  if (store.items.hasOwnProperty(this.item_id)) {
    let item = store.items[this.item_id];
    item.episode_ids = item.episode_ids.filter(episodeID => episodeID != this.id);
    delete item.episodes[this.id];
    if (this.current_episode_id == this.id) 
      item.episodeNav('next');
  }
}