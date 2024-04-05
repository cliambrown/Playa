<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { invoke } from '@tauri-apps/api/tauri';
import { readDir } from '@tauri-apps/api/fs';
import { store } from '../store.js';
import { useSlugify, useOpenOrHomeDir } from '../helpers.js';
import { Level } from '../classes/Level.js';
import PlaybackPosnLevel from '../components/PlaybackPosnLevel.vue';

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
  store.loading_msg = null;
  store.loading = true;
  let entries;
  try {
    entries = await invoke('get_playback_positions', { dir: store.settings.mpv_watched_dir });
  } catch (error) {
    console.log('getPlaybackPositions', error);
    store.loading = false;
    return false;
  }
  let fetchedEntryFilenames = [];
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
    if (!entry.media_path) entry.media_path = '[none]';
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
  store.loading_msg = null;
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
  
  <div class="w-full px-4 pt-8 pb-8 overflow-y-auto grow">
    
    <div class="w-full max-w-6xl mx-auto">
      
      <div class="flex gap-x-6">
        
        <h2 class="text-2xl text-slate-200">
          Clear Playback Positions
        </h2>
        
        <Button variant="action-secondary" @click="getPlaybackPositions" :disabled="store.loading || !store.settings.mpv_watched_dir" class="ml-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clip-rule="evenodd" />
          </svg>
          Refresh
        </Button>
        
        <Button variant="local-link" @click="useOpenOrHomeDir(store.settings.mpv_watched_dir)" :disabled="!store.settings.mpv_watched_dir">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9c-.546 0-1.059.146-1.5.401V3.5ZM2 9.5v3A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 12.5 8h-9A1.5 1.5 0 0 0 2 9.5Z" />
          </svg>
          {{ store.settings.mpv_watched_dir }}
        </Button>
        
      </div>
      
      <div class="mt-6">
        <PlaybackPosnLevel :level="levels" />
      </div>
      
    </div>
    
  </div>
  
  <div class="flex items-center justify-end p-4 bg-gray-900 gap-x-4">
      
    <div>
      {{ selectedEntries.length }} selected:
    </div>
    
    <Button @click="deleteSelectedEntries" :disabled="!selectedEntries.length || store.loading">
      Delete entries
    </Button>
    
  </div>
  
</template>