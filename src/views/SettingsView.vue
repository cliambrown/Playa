<script setup>
import { ref } from 'vue'
import { writeTextFile, readTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { store } from '../store.js'
import { useGet, useGetProp, useOpenOrHomeDir } from '../helpers.js';
import DirSelect from '../components/DirSelect.vue';
import TrashIcon from '../icons/TrashIcon.vue';
import FolderIcon from '../icons/FolderIcon.vue';
import FileDownIcon from '../icons/FileDownIcon.vue';
import FileAddIcon from '../icons/FileAddIcon.vue';
import HistoryIcon from '../icons/HistoryIcon.vue';
// import { Show } from '../classes/Show';
// import { Episode } from '../classes/Episode';
// import { ExternalItemEpisode } from '../classes/ExternalItemEpisode';

let updateTimeoutId = null;

let backupImportSrc = ref('');

async function handleUpdate() {
  window.clearTimeout(updateTimeoutId);
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
    if (parseInt(useGetProp(response, 'rowsAffected'))) {
      store.loading_msg = 'Settings saved';
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
  const rows = await store.db.select(`SELECT artwork_filename FROM items`);
  for (const row of rows) {
    if (row.artwork_filename)
      filenamesToKeep.push(row.artwork_filename);
  }
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
  store.loading_msg = 'Getting backup data...';
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
  
  for (const [settingKey, currentVal] of Object.entries(store.settings)) {
    let settingVal = useGet(importData, ['settings', settingKey], false);
    if (settingVal === false) continue;
    if (!settingVal) settingVal = null;
    await store.db.execute('UPDATE settings SET value=? WHERE name=?', [settingVal, settingKey]);
  }
  
  let itemsAdded = 0;
  let itemsUpdated = 0;
  let episodesAdded = 0;
  let episodesUpdated = 0;
  
  const itemsData = useGetProp(importData, 'items');
  if (itemsData && Array.isArray(itemsData)) {
    for (const itemData of itemsData) {
      let item = null;
      for (const attrName of ['dir_name', 'pathname', 'url']) {
        if (useGetProp(itemData, attrName)) {
          item = await store.getItemFromAttribute(attrName, itemData);
          break;
        }
      }
      
      let currentEpisodeID = useGetProp(itemData, 'is_finished', false) ? null : 0;
      
      const episodesData = useGetProp(itemData, 'episodes', []);
      for (const episodeData of episodesData) {
        let episode = await item.getEpisodeFromData(episodeData, false);
        if (useGetProp(episodeData, 'is_current_ep', false)) {
          currentEpisodeID = episode.id;
        }
        if (episode.is_new) {
          await store.db.execute('UPDATE episodes SET created_at=?, updated_at=? WHERE id=?', [episodeData.created_at, episode.updated_at, episode.id]);
          episode.created_at = episodeData.created_at;
          episode.updated_at = episodeData.updated_at;
          episodesAdded++;
        } else {
          let isUpdated = false;
          let createdAt = episode.created_at;
          if (episodeData.created_at < episode.created_at) {
            createdAt = episodeData.created_at;
            isUpdated = true;
          }
          let updatedAt = episode.updated_at;
          if (episodeData.updated_at > episode.updated_at) {
            updatedAt = episodeData.updated_at;
            episode.updateAttributes(episodeData);
            episode.saveToDB();
            isUpdated = true;
          }
          if (isUpdated) {
            await store.db.execute('UPDATE episodes SET created_at=?, updated_at=? WHERE id=?', [createdAt, updatedAt, episode.id]);
            episode.created_at = createdAt;
            episode.updated_at = updatedAt;
            episodesUpdated++;
          }
        }
      }
      
      if (item.is_new) {
        await store.db.execute('UPDATE items SET created_at=?, updated_at=?, current_episode_id=? WHERE id=?', [itemData.created_at, item.updated_at, currentEpisodeID, item.id]);
        item.created_at = itemData.created_at;
        item.updated_at = itemData.updated_at;
        item.current_episode_id = currentEpisodeID;
        itemsAdded++;
      } else {
        let isUpdated = false;
        let createdAt = item.created_at;
        if (itemData.created_at < item.created_at) {
          createdAt = itemData.created_at;
          isUpdated = true;
        }
        let updatedAt = item.updated_at;
        if (itemData.updated_at > item.updated_at) {
          updatedAt = itemData.updated_at;
          item.updateAttributes(itemData);
          item.saveToDB();
          isUpdated = true;
        }
        let lastWatchedAt = item.last_watched_at;
        if (itemData.last_watched_at > item.last_watched_at) {
          lastWatchedAt = itemData.last_watched_at;
          isUpdated = true;
        }
        if (isUpdated) {
          await store.db.execute('UPDATE items SET created_at=?, updated_at=?, current_episode_id=?, last_watched_at=? WHERE id=?', [createdAt, updatedAt, currentEpisodeID, lastWatchedAt, item.id]);
          item.created_at = createdAt;
          item.updated_at = updatedAt;
          item.current_episode_id = currentEpisodeID;
          item.last_watched_at = lastWatchedAt;
          itemsUpdated++;
        }
      }
    }
  }
  
  store.sortItems();
  store.sortAllEpisodes();
  store.selectFirstHomeItem()
  store.selectFirstArchivesItem();
  
  store.loading_msg = `Import complete. Items added: ${itemsAdded} — Items updated: ${itemsUpdated} — Episodes added: ${episodesAdded} — Episodes updated: ${episodesUpdated}`;
  store.loading = false;
}

async function createBackup() {
  let bkpObj = {
    settings: store.settings,
    items: [],
  };
  for (const itemID of store.item_ids) {
    const item = store.items[itemID];
    let itemObj = { episodes: [], is_finished: (item.current_episode_id === null) };
    for (const attribute of item.attributes) {
      const attrName = attribute.name;
      if (attrName === 'id' || attrName === 'current_episode_id') continue;
      itemObj[attrName] = item[attrName];
    }
    for (const episodeID of item.episode_ids) {
      const episode = item.episodes[episodeID];
      let epObj = { is_current_ep: (episodeID === item.current_episode_id) };
      for (const attribute of episode.attributes) {
        const attrName = attribute.name;
        if (attrName === 'id') continue;
        epObj[attrName] = episode[attrName];
      }
      itemObj.episodes.push(epObj);
    }
    bkpObj.items.push(itemObj);
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
    await writeTextFile(bkpFilename, JSON.stringify(bkpObj, null, "\t"), { baseDir: BaseDirectory.AppLocalData });
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
          <FolderIcon />
          Artwork
        </Button>
        
        <Button variant="secondary" @click="clearUnusedArtwork" :disabled="!store.artworks_dir || store.loading">
          <TrashIcon />
          Clear unused artwork
        </Button>
        
        <RouterLink :to="{ name: 'clearPlayback' }" class="inline-flex items-center px-3 py-2 text-sm font-medium leading-6 text-blue-200 transition duration-150 ease-in-out rounded-md shadow-sm disabled:opacity-60 disabled:pointer-events-none gap-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-sky-900 hover:bg-sky-800">
          <HistoryIcon />
          Clear Playback Positions
        </RouterLink>
        
      </div>
        
      <InputWithLabel class="mt-10" id="tv_dir" v-model="store.settings.tv_dir" :readonly="store.loading" @input="handleUpdate">
        TV Directory
        <template v-slot:afterInput>
          <DirSelect v-model="store.settings.tv_dir" defaultPath="%HomeDrive%" :disabled="store.loading" @select="handleUpdate" />
          <Button variant="link" @click="useOpenOrHomeDir(store.settings.tv_dir)" :disabled="!store.settings.tv_dir">
            <FolderIcon />
            Open
          </Button>
        </template>
      </InputWithLabel>
      
      <InputWithLabel class="mt-10" id="movie_dir" v-model="store.settings.movie_dir" :readonly="store.loading" @input="handleUpdate">
        Movies Directory
        <template v-slot:afterInput>
          <DirSelect v-model="store.settings.movie_dir" defaultPath="%HomeDrive%" :disabled="store.loading" @select="handleUpdate" />
          <Button variant="link" @click="useOpenOrHomeDir(store.settings.movie_dir)" :disabled="!store.settings.movie_dir">
            <FolderIcon />
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
            <FolderIcon />
            Open
          </Button>
        </template>
      </InputWithLabel>
      
      <div class="flex items-center gap-6 mt-24">
        
        <h3 class="mr-auto text-xl text-slate-200">
          Import Backup
        </h3>
        
        <Button variant="link" @click="useOpenOrHomeDir(store.local_data_dir)">
          <FolderIcon />
          Backup Save Location
        </Button>
        
        <Button @click="createBackup">
          <FileAddIcon />
          Save New Backup
        </Button>
        
      </div>
      
      <InputWithLabel class="mt-10" id="import_backup_src" v-model="backupImportSrc" :readonly="store.loading || !backupImportSrc">
        Import Source
        <template v-slot:afterInput>
          <DirSelect v-model="backupImportSrc" :directory="false" :defaultPath="store.local_data_dir" :disabled="store.loading" />
          <Button @click="importBackup" :disabled="store.loading || !backupImportSrc">
            <FileDownIcon />
            Import
          </Button>
        </template>
      </InputWithLabel>
      
      <ul class="pl-6 mt-4 text-gray-300 list-disc">
        <li>Does not check the validity of import info before processing</li>
        <li>Overwrites any settings found in import file</li>
        <li>Updates item info only if import data is newer than current data</li>
      </ul>
      
    </form>
  </div>
  
</template>