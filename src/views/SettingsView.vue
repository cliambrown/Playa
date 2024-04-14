<script setup>
import { watch, ref } from 'vue'
import { writeTextFile, readTextFile, BaseDirectory } from '@tauri-apps/api/fs';
import { open } from '@tauri-apps/api/shell';
import { invoke } from '@tauri-apps/api/tauri';
import { store } from '../store.js'
import { useGet, useOpenOrHomeDir } from '../helpers.js';
import DirSelect from '../components/DirSelect.vue';
import { Show } from '../classes/Show';
import { Episode } from '../classes/Episode';

let updateTimeoutId = null;
let updateMsgTimoutId = null;

let backupImportSrc = ref('');

async function handleUpdate() {
  if (!store.loaded_from_db) return false;
  window.clearTimeout(updateTimeoutId);
  window.clearTimeout(updateMsgTimoutId);
  store.loading_msg = 'Waiting...';
  updateTimeoutId = window.setTimeout(async () => {
    store.loading_msg = 'Saving...';
    let query = '';
    let paramsArr = [];
    for (const property in store.settings) {
      query += 'UPDATE settings SET value=? WHERE name=?; ';
      paramsArr.push(store.settings[property], property);
    }
    const response = await store.db.execute(query, paramsArr);
    if (parseInt(useGet(response, 'rowsAffected'))) {
      store.loading_msg = 'Settings saved';
      updateMsgTimoutId = window.setTimeout(() => {
        store.loading_msg = ''
      }, 5000);
    }
    console.log('settings handleUpdate', response);
  }, 500);
}

async function clearUnusedArtwork() {
  const confirmed = await confirm('Are you sure you want to delete unused images?', { title: 'Playa - Delete Unused Artwork', type: 'warning' });
  if (!confirmed) return false;
  store.loading = true;
  store.loading_msg = 'Deleting unused artwork...';
  let filenamesToKeep = [];
  let tablesToSearch = ['shows','movies','external_items'];
  for (const tableName of tablesToSearch) {
    const rows = await store.db.select(`SELECT artwork_filename FROM ${tableName}`);
    for (const row of rows) {
      if (row.artwork_filename)
        filenamesToKeep.push(row.artwork_filename);
    }
  }
  console.log(filenamesToKeep);
  const response = await invoke('delete_unused_images', {
    filenamesToKeep: filenamesToKeep,
  });
  console.log('clearUnusedArtwork', response);
  store.loading_msg = response;
  store.loading = false;
}

async function importBackup() {
  if (!backupImportSrc.value) return false;
  const confirmed = await confirm('This will overwrite settings and insert items. Are you sure you want to proceed?', { title: 'Playa - Import Backup', type: 'warning' });
  store.loading = true;
  store.loading_msg = 'Getting backup data...'
  await store.loadFromDB();
  const filename = backupImportSrc.value.replace(/^.*[\\/]/, '');
  let contents;
  let importData;
  try {
    contents = await readTextFile(filename, { dir: BaseDirectory.AppLocalData });
    if (!contents) return false;
    importData = JSON.parse(contents);
  } catch (e) {
    alert(e);
    console.log(e);
    return false;
  }
  
  let showsAdded = 0;
  let showsUpdated = 0;
  let episodesAdded = 0;
  let episodesUpdated = 0;
  let moviesAdded = 0;
  let moviesUpdated = 0;
  let itemsAdded = 0;
  let itemsUpdated = 0;

  let response, query, params, itemID;
  
  for (const settingName of ['tv_dir','movie_dir','tvdb_apikey','tvdb_pin','mpv_watched_dir']) {
    const settingVal = useGet(importData, `settings.${settingName}`);
    if (!settingVal) continue;
    response = await store.db.execute(`UPDATE settings SET value=? WHERE name="${settingName}"`, [settingVal]);
  }
  
  const shows = useGet(importData, 'shows', []);
  let fields = ['created_at','updated_at','is_archived','name','dir_name','tvdb_id','tvdb_slug','last_watched_at','artwork_filename'];
  let qMarks = Array(fields.length).fill('?');
  for (const showData of shows) {
    store.loading_msg = 'Processing show: ' + showData.dir_name;
    let show = store.findShowByDirName(showData.dir_name);
    if (show) {
      itemID = show.id;
      if (parseInt(showData.updated_at) > parseInt(show.updated_at)) {
        show.updateFromDB(showData);
        await show.saveToDB();
        showsUpdated++;
      }
    } else {
      query = `INSERT INTO shows (${fields.join(', ')}) VALUES (${qMarks})`;
      params = [];
      for (const fieldName of fields) {
        params.push(useGet(showData, fieldName));
      }
      response = await store.db.execute(query, params);
      itemID = parseInt(response.lastInsertId);
      showData.id = itemID;
      show = new Show(showData);
      showsAdded++;
    }
    for (const episodeData of showData.episodes) {
      let episode = show.findEpisodeByPathname(episodeData.pathname);
      if (episode) {
        if (parseInt(episodeData.updated_at) > parseInt(episode.updated_at)) {
          episode.updateFromDB(episodeData);
          episodesUpdated++;
        }
      } else {
        episodeData.show_id = itemID;
        episode = new Episode(episodeData);
        episodesAdded++;
      }
      await episode.saveToDB();
      if (episodeData.is_current_ep) {
        await store.db.execute('UPDATE shows SET current_episode_id=? WHERE id=?', [episode.id, itemID]);
      }
    }
  }
  
  const movies = useGet(importData, 'movies', []);
  fields = ['created_at','updated_at','is_archived','name','pathname','filename','tvdb_id','tvdb_slug','duration','last_watched_at','artwork_filename'];
  qMarks = Array(fields.length).fill('?');
  for (const movieData of movies) {
    store.loading_msg = 'Processing movie: ' + movieData.pathname;
    let movie = store.findMovieByPathname(movieData.pathname);
    if (movie) {
      itemID = movie.id;
      if (parseInt(movieData.updated_at) > parseInt(movie.updated_at)) {
        movie.updateFromDB(movieData);
        await movie.saveToDB();
        moviesUpdated++;
      }
    } else {
      query = `INSERT INTO movies (${fields.join(', ')}) VALUES (${qMarks})`;
      params = [];
      for (const fieldName of fields) {
        params.push(useGet(movieData, fieldName));
      }
      await store.db.execute(query, params);
      moviesAdded++;
    }
  }
  
  const items = useGet(importData, 'external_items', []);
  fields = ['created_at','updated_at','is_archived','type','name','tvdb_id','tvdb_slug','last_watched_at','artwork_filename','url','duration','current_episode_id'];
  qMarks = Array(fields.length).fill('?');
  for (const itemData of items) {
    store.loading_msg = 'Processing external item: ' + itemData.url;
    let item = store.findExtItemByUrl(itemData.url);
    if (item) {
      itemID = item.id;
      if (parseInt(itemData.updated_at) > parseInt(item.updated_at)) {
        item.updateFromDB(itemData);
        await item.saveToDB();
        itemsUpdated++;
      }
    } else {
      query = `INSERT INTO external_items (${fields.join(', ')}) VALUES (${qMarks})`;
      params = [];
      for (const fieldName of fields) {
        params.push(useGet(itemData, fieldName));
      }
      await store.db.execute(query, params);
      itemsAdded++;
    }
  }
  
  await store.loadFromDB();
  
  let resultStrs = [];
  if (showsAdded) resultStrs.push(`${showsAdded} show${showsAdded == 1 ? '' : 's'} added`);
  if (showsUpdated) {
    let str = showsUpdated + ' ';
    if (!showsAdded) str += `show${showsUpdated == 1 ? '' : 's'} `;
    resultStrs.push(str + 'updated');
  }
  if (episodesAdded) resultStrs.push(`${episodesAdded} episode${episodesAdded == 1 ? '' : 's'} added`);
  if (episodesUpdated) {
    let str = episodesUpdated + ' ';
    if (!episodesAdded) str += `episode${episodesUpdated == 1 ? '' : 's'} `;
    resultStrs.push(str + 'updated');
  }
  if (moviesAdded) resultStrs.push(`${moviesAdded} movie${moviesAdded == 1 ? '' : 's'} added`);
  if (moviesUpdated) {
    let str = moviesUpdated + ' ';
    if (!moviesAdded) str += `movie${moviesUpdated == 1 ? '' : 's'} `;
    resultStrs.push(str + 'updated');
  }
  if (itemsAdded) resultStrs.push(`${itemsAdded} ext. item${itemsAdded == 1 ? '' : 's'} added`);
  if (itemsUpdated) {
    let str = itemsUpdated + ' ';
    if (!itemsAdded) str += `ext. item${itemsUpdated == 1 ? '' : 's'} `;
    resultStrs.push(str + 'updated');
  }
  store.loading_msg = 'Import complete: ' + resultStrs.join(', ');
  
  store.loading = false;
}

async function createBackup() {
  let bkpObj = {
    settings: store.settings,
    shows: [],
    movies: [],
    external_items: [],
  };
  for (const showID of store.show_ids) {
    const show = store.shows[showID];
    let showObj = {};
    for (const propName of ['created_at','updated_at','is_archived','name','dir_name','tvdb_id','tvdb_slug','last_watched_at','artwork_filename']) {
      showObj[propName] = show[propName];
    }
    showObj.episodes = [];
    for (const epID of show.episode_ids) {
      const episode = show.episodes[epID];
      let epObj = { is_current_ep: (epID === show.current_episode_id) };
      for (const propName of ['created_at','updated_at','pathname','filename','season_num','episode_num','name','overview','released_on','duration']) {
        epObj[propName] = episode[propName];
      }
      showObj.episodes.push(epObj);
    }
    bkpObj.shows.push(showObj);
  }
  for (const movieID of store.movie_ids) {
    const movie = store.movies[movieID];
    let movieObj = {};
    for (const propName of ['created_at','updated_at','is_archived','name','pathname','filename','tvdb_id','tvdb_slug','duration','last_watched_at','artwork_filename']) {
      movieObj[propName] = movie[propName];
    }
    bkpObj.movies.push(movieObj);
  }
  for (const itemID of store.external_item_ids) {
    const item = store.external_items[itemID];
    let itemObj = {};
    for (const propName of ['created_at','updated_at','is_archived','type','name','tvdb_id','tvdb_slug','last_watched_at','artwork_filename','url','duration','current_episode_id']) {
      itemObj[propName] = item[propName];
    }
    bkpObj.external_items.push(itemObj);
  }
  const date = new Date();
  const dateStr = date.getUTCFullYear() + '-'
    + ((date.getUTCMonth() + 1) + '').padStart(2, '0') + '-'
    + (date.getUTCDate() + '').padStart(2, '0') + '_'
    + (date.getHours() + '').padStart(2, '0') + '-'
    + (date.getMinutes() + '').padStart(2, '0') + '-'
    + (date.getSeconds() + '').padStart(2, '0');
  const bkpFilename = `playa-backup-${dateStr}.json`;
  try {
    await writeTextFile(bkpFilename, JSON.stringify(bkpObj, null, "\t"), { dir: BaseDirectory.AppLocalData });
  } catch (e) {
    alert(e);
    console.log(e);
    return false;
  }
  alert(`Backup saved as ${bkpFilename}`);
}
</script>

<template>
  
  <div class="w-full px-4 pt-8 pb-20 overflow-y-auto grow">
    <form action="" method="get" @submit.prevent autocomplete="off" class="w-full max-w-4xl mx-auto">
      
      <div class="flex items-center gap-6">
        
        <h2 class="text-2xl text-slate-200 grow">
          Settings
        </h2>
        
        <Button variant="link" @click="useOpenOrHomeDir(store.artworks_dir)" :disabled="!store.artworks_dir">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 shrink-0">
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
          </svg>
          Artwork
        </Button>
        
        <Button variant="secondary" @click="clearUnusedArtwork" :disabled="!store.artworks_dir || store.loading">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clip-rule="evenodd" />
          </svg>
          Clear unused artwork
        </Button>
        
        <RouterLink :to="{ name: 'clearPlayback' }" class="inline-flex items-center px-3 py-2 text-sm font-medium leading-6 text-blue-200 transition duration-150 ease-in-out rounded-md shadow-sm disabled:opacity-60 disabled:pointer-events-none gap-x-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500 bg-sky-900 hover:bg-sky-800">
          Clear Playback Positions
        </RouterLink>
        
      </div>
        
      <InputWithLabel class="mt-10" id="tv_dir" v-model="store.settings.tv_dir" :readonly="store.loading" @input="handleUpdate">
        TV Directory
        <template v-slot:afterInput>
          <DirSelect v-model="store.settings.tv_dir" defaultPath="%HomeDrive%" :disabled="store.loading" @select="handleUpdate" />
          <Button variant="link" @click="useOpenOrHomeDir(store.settings.tv_dir)" :disabled="!store.settings.tv_dir">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
            </svg>
            Open
          </Button>
        </template>
      </InputWithLabel>
      
      <InputWithLabel class="mt-10" id="movie_dir" v-model="store.settings.movie_dir" :readonly="store.loading" @input="handleUpdate">
        Movies Directory
        <template v-slot:afterInput>
          <DirSelect v-model="store.settings.movie_dir" defaultPath="%HomeDrive%" :disabled="store.loading" @select="handleUpdate" />
          <Button variant="link" @click="useOpenOrHomeDir(store.settings.movie_dir)" :disabled="!store.settings.movie_dir">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
            </svg>
            Open
          </Button>
        </template>
      </InputWithLabel>
      
      <InputWithLabel class="max-w-md mt-10" id="tvdb_apikey" v-model="store.settings.tvdb_apikey" :readonly="store.loading" @input="handleUpdate">
        TVDB API Key
      </InputWithLabel>
      
      <InputWithLabel class="mt-10 max-w-36" id="tvdb_pin" v-model="store.settings.tvdb_pin" :readonly="store.loading" @input="handleUpdate">
        TVDB PIN
      </InputWithLabel>
      
      <InputWithLabel class="max-w-md mt-10" id="youtube_api_key" v-model="store.settings.youtube_api_key" :readonly="store.loading" @input="handleUpdate">
        YouTube API Key
      </InputWithLabel>
      
      <InputWithLabel class="mt-10" id="mpv_watched_dir" v-model="store.settings.mpv_watched_dir" :readonly="store.loading" @input="handleUpdate">
        MPV Playback Positions Directory
        <template v-slot:afterInput>
          <DirSelect v-model="store.settings.mpv_watched_dir" defaultPath="%AppData%\mpv" :disabled="store.loading" @select="handleUpdate" />
          <Button variant="link" @click="useOpenOrHomeDir(store.settings.mpv_watched_dir)" :disabled="!store.settings.mpv_watched_dir">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
            </svg>
            Open
          </Button>
        </template>
      </InputWithLabel>
      
      <div class="flex items-center gap-6 mt-24">
        
        <h3 class="mr-auto text-xl text-slate-200">
          Import Backup
        </h3>
        
        <Button variant="link" @click="useOpenOrHomeDir(store.local_data_dir)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 shrink-0">
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
          </svg>
          Backup Save Location
        </Button>
        
        <Button @click="createBackup">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 4H9.621a1.5 1.5 0 0 1-1.06-.44L7.439 2.44A1.5 1.5 0 0 0 6.38 2H3.5Zm5.25 4.75a.75.75 0 0 0-1.5 0v2.69l-.72-.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l2-2a.75.75 0 1 0-1.06-1.06l-.72.72V6.75Z" clip-rule="evenodd" />
          </svg>
          Save New Backup
        </Button>
        
      </div>
      
      <InputWithLabel class="mt-10" id="import_backup_src" v-model="backupImportSrc" :readonly="store.loading || !backupImportSrc">
        Import Source
        <template v-slot:afterInput>
          <DirSelect v-model="backupImportSrc" :directory="false" :defaultPath="store.local_data_dir" :disabled="store.loading" />
          <Button @click="importBackup" :disabled="store.loading || !backupImportSrc">Import</Button>
        </template>
      </InputWithLabel>
      
      <ul class="pl-6 mt-4 text-gray-300 list-disc">
        <li>Overwrites any settings found in import file</li>
        <li>Updates item info only if import data is newer than current data</li>
      </ul>
      
    </form>
  </div>
  
</template>