<script setup>
import { invoke } from '@tauri-apps/api/core';
import { computed, onMounted, ref, watch } from 'vue';
// import { readDir } from '@tauri-apps/plugin-fs';
import { Folder, RefreshCcw, Trash2 } from '@lucide/vue';
import { Level } from '../classes/Level.js';
import PlaybackPosnLevel from '../components/PlaybackPosnLevel.vue';
import { useOpenOrHomeDir, useSlugify } from '../helpers.js';
import { store } from '../store.js';

const levels = ref(new Level());
const entriesByFilename = ref({});

levels.value.slug = 'base';
levels.value.name = 'All';

const selectedEntries = computed(() => {
  let r = [];
  for (const [entryFilename, entry] of Object.entries(entriesByFilename.value)) {
    if (entry.checked) r.push(entryFilename);
  }
  return r;
});

function addEntryByFilename(entry) {
  if (!Object.hasOwn(entriesByFilename.value, entry.src_file_name)) {
    entriesByFilename.value[entry.src_file_name] = entry;
  }
}

async function getPlaybackPositions() {
  if (!store.settings.mpv_watched_dir) return false;
  store.loading = true;
  store.setStatusMsg(null);
  let entries;
  try {
    entries = await invoke('get_playback_positions', { dir: store.settings.mpv_watched_dir });
  } catch (error) {
    console.log('getPlaybackPositions', error);
    store.loading = false;
    return false;
  }
  let fetchedEntryFilenames = [];
  const epRegex = /^(?<show_name>.*)\.(?<season>S\d\d*)(E\d\d*)\./;
  const movieRegex = /^.*\.(19|20)\d\d\./;
  for (let entry of entries) {
    fetchedEntryFilenames.push(entry.src_file_name);
    entry.slug = useSlugify(entry.src_file_name);
    entry.checked = false;
    if (entry.redirect) {
      entry.media_filename = entry.media_pathname;
      levels.value.add_entry(['redirect'], entry);
      addEntryByFilename(entry);
      continue;
    }
    if (!entry.media_path) {
      const epMatch = entry.media_filename.match(epRegex);
      if (epMatch) {
        entry.media_path = 'TV/'+epMatch.groups.show_name+'/'+epMatch.groups.season;
      } else {
        const movieMatch = entry.media_filename.match(movieRegex);
        if (movieMatch) {
          entry.media_path = 'Movies';
        } else {
          entry.media_path = '[none]';
        }
      }
    }
    if (!entry.media_filename) entry.media_filename = '[none]';
    if (entry.media_path.startsWith('http')) {
      entry.media_filename = entry.media_pathname;
      levels.value.add_entry(['http'], entry);
      addEntryByFilename(entry);
      continue;
    }
    let pathParts = entry.media_path.split(/[\\\/]/);
    levels.value.add_entry(pathParts, entry);
    addEntryByFilename(entry);
  }
  for (const [entryFilename, entry] of Object.entries(entriesByFilename.value)) {
    if (!fetchedEntryFilenames.includes(entry.src_file_name)) {
      levels.value.delete_entry(entry.src_file_name);
      delete entriesByFilename.value[entry.src_file_name];
    }
  }
  levels.value.sort_level();
  store.loading = false;
}

onMounted(() => getPlaybackPositions());

watch(
  () => store.settings.mpv_watched_dir,
  (newValue, oldValue) => getPlaybackPositions()
)

async function deleteSelectedEntries() {
  store.setStatusMsg(null);
  store.loading = true;
  let response = await invoke('trash_files', {
    dir: store.settings.mpv_watched_dir,
    filenames: selectedEntries.value
  });
  console.log('deleteSelectedEntries', response);
  getPlaybackPositions();
  store.loading = false;
}

</script>

<template>
  
  <div class="px-4 pt-8 pb-20 w-full overflow-y-auto grow">
    
    <div class="mx-auto w-full max-w-6xl">
      
      <div class="flex gap-x-6">
        
        <h2 class="mr-auto text-slate-200 text-2xl">
          Clear Playback Positions
        </h2>
        
        <Button variant="link" @click="useOpenOrHomeDir(store.settings.mpv_watched_dir)" :disabled="!store.settings.mpv_watched_dir">
          <Folder class="size-5" />
          {{ store.settings.mpv_watched_dir }}
        </Button>
        
        <Button variant="secondary" @click="getPlaybackPositions" :disabled="store.loading || !store.settings.mpv_watched_dir">
          <RefreshCcw class="size-4" />
          Refresh
        </Button>
        
      </div>
      
      <div class="mt-6">
        <PlaybackPosnLevel :level="levels" />
      </div>
      
    </div>
    
  </div>
  
  <div class="flex justify-center items-center gap-x-4 bg-gray-900 p-4">
    
    <div class="flex justify-end items-center gap-x-4 w-full max-w-6xl">
      
      <div>
        {{ selectedEntries.length }} selected:
      </div>
      
      <Button @click="deleteSelectedEntries" :disabled="!selectedEntries.length || store.loading">
        <Trash2 class="size-5" />
        Delete Entries
      </Button>
      
    </div>
    
  </div>
  
</template>