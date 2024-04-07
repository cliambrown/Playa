import { open } from '@tauri-apps/api/shell';
import { invoke } from '@tauri-apps/api/tauri';
import { store } from '../store';
import { useGet, useAlphaName, useSaveToDB } from '../helpers.js';

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
  this.last_watched_at = useGet(itemData, 'last_watched_at');
  this.artwork_filename = useGet(itemData, 'artwork_filename');
  this.tvdb_matches = [];
}

ExternalItem.prototype.updateFromDB = function(itemData) {
  this.setName(useGet(itemData, 'name'));
  this.is_archived = useGet(itemData, 'is_archived');
  this.tvdb_id = useGet(itemData, 'tvdb_id');
  this.tvdb_slug = useGet(itemData, 'tvdb_slug');
  this.last_watched_at = useGet(itemData, 'last_watched_at');
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
  const response = await useSaveToDB(store, this, ['is_archived', 'type', 'name', 'tvdb_id', 'tvdb_slug', 'last_watched_at', 'artwork_filename', 'url']);
  console.log('ExternalItem.saveToDB', response);
  return response;
}

ExternalItem.prototype.updateLastWatchedAtInDB = async function() {
  if (!store.db || !this.id) return false;
  let response = await store.db.execute(
    "UPDATE external_items SET last_watched_at=? WHERE id=?",
    [this.last_watched_at, this.id]
  );
  console.log('ExternalItem.updateLastWatchedAtInDB', response);
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