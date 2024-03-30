import { useSlugify } from '../helpers.js';

export function Level() {
  this.checked = false;
  this.slug = '';
  this.name = '';
  this.sublevel_names = [];
  this.sublevels = {};
  this.entries = [];
}

Level.prototype.has_sublevel = function(levelName) {
  return Object.hasOwn(this.sublevels, levelName);
}

Level.prototype.add_sublevel = function(levelName) {
  if (this.has_sublevel(levelName)) return false;
  this.sublevels[levelName] = new Level();
  this.sublevels[levelName].slug = this.slug + '-' + useSlugify(levelName);
  this.sublevels[levelName].name = levelName;
  this.sublevel_names.push(levelName);
}

Level.prototype.add_entry = function(pathParts, entry) {
  if (!pathParts.length) {
    if (!this.entries.some(otherEntry => otherEntry.src_file_name == entry.src_file_name)) {
      this.entries.push(entry);
    }
    return false;
  }
  let levelName = pathParts.shift();
  this.add_sublevel(levelName);
  this.sublevels[levelName].add_entry(pathParts, entry);
}

Level.prototype.sort_level = function() {
  this.sublevel_names.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  this.entries.sort((a, b) => a.media_filename.localeCompare(b.media_filename, 'en', { sensitivity: 'base' }));
  for (const levelName of this.sublevel_names) {
    this.sublevels[levelName].sort_level();
  }
}

Level.prototype.set_all_checked = function(checked) {
  this.checked = checked;
  for (let entry of this.entries) {
    entry.checked = checked;
  }
  for (const levelName of this.sublevel_names) {
    this.sublevels[levelName].set_all_checked(checked);
  }
}

Level.prototype.delete_entry = function(entryFilename) {
  this.entries = this.entries.filter(entry => entry.src_file_name !== entryFilename);
  for (const levelName of this.sublevel_names) {
    this.sublevels[levelName].delete_entry(entryFilename);
  }
}