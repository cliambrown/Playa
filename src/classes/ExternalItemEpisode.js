import { store } from '../store';
import { useGet, useAlphaName, useSaveToDB } from '../helpers.js';

export function ExternalItemEpisode(episodeData, fromScan = false) {
  this.id = useGet(episodeData, 'id');
  this.table_name = 'external_item_episodes';
  this.created_at = useGet(episodeData, 'created_at');
  this.updated_at = useGet(episodeData, 'updated_at');
  this.is_new = useGet(episodeData, 'is_new');
  this.external_item_id = useGet(episodeData, 'external_item_id');
  this.overview = useGet(episodeData, 'overview');
  this.released_on = useGet(episodeData, 'released_on');
  this.duration = useGet(episodeData, 'duration');
  this.is_updated_from_tvdb = useGet(episodeData, 'is_updated_from_tvdb');
  this.season_num = useGet(episodeData, 'season_num');
  this.episode_num = useGet(episodeData, 'episode_num');
  this.name = useGet(episodeData, 'name');
  this.url = useGet(episodeData, 'url');
  this.order_num = useGet(episodeData, 'order_num');
  this.setSearchableText();
}

ExternalItemEpisode.prototype.updateFromDB = function(episodeData) {
  this.overview = useGet(episodeData, 'overview');
  this.released_on = useGet(episodeData, 'released_on');
  this.duration = useGet(episodeData, 'duration');
  this.season_num = useGet(episodeData, 'season_num');
  this.episode_num = useGet(episodeData, 'episode_num');
  this.name = useGet(episodeData, 'name');
  this.url = useGet(episodeData, 'url');
  this.order_num = useGet(episodeData, 'order_num');
  this.setSearchableText();
}

ExternalItemEpisode.prototype.setSearchableText = function() {
  let ss = (this.season_num + '').padStart(2, '0');
  let ee = (this.episode_num + '').padStart(2, '0');
  let baseText = `S${ss}E${ee} ${this.name}`;
  if (this.overview) baseText += ' ' + this.overview;
  this.searchable_text = useAlphaName(baseText, ' ');
}

ExternalItemEpisode.prototype.setSlug = function() {
  return false;
}

ExternalItemEpisode.prototype.saveToDB = async function() {
  const response = await useSaveToDB(store, this, ['external_item_id','url','season_num','episode_num','name','overview','released_on','order_num','duration']);
  console.log('ExternalItemEpisode.saveToDB', response);
  return response;
}

ExternalItemEpisode.prototype.delete = async function() {
  if (!store.db) return false;
  let response, query;
  // Delete episode
  query = "DELETE FROM external_item_episodes WHERE id=?"
  response = await store.db.execute(query, [this.id]);
  console.log('ExternalItemEpisode.delete', response);
  // Remove from store
  if (store.external_items.hasOwnProperty(this.external_item_id)) {
    let externalItem = store.external_items[this.external_item_id];
    externalItem.episode_ids = externalItem.episode_ids.filter(episodeID => episodeID != this.id);
    delete externalItem.episodes[this.id];
    if (this.current_episode_id == this.id) 
      externalItem.episodeNav('next');
  }
}