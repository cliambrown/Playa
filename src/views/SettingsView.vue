<script setup>
import { watch } from 'vue'
import { store } from '../store.js'
import { useOpenOrHomeDir } from '../helpers.js';
import DirSelect from '../components/DirSelect.vue';
import Button from '../components/Button.vue';

let updateTimeoutId = null;

watch(
  () => store.settings,
  (newValue, oldValue) => {
    if (!store.loaded_from_db) return false;
    window.clearTimeout(updateTimeoutId);
    updateTimeoutId = window.setTimeout(async () => {
      let query = '';
      let paramsArr = [];
      for (const property in store.settings) {
        query += 'UPDATE settings SET value = ? WHERE name = ?;'
        paramsArr.push(store.settings[property], property);
      }
      const response = await store.db.execute(query, paramsArr);
      console.log('update settings', response);
    }, 250);
  },
  { deep: true }
)
</script>

<template>
  
  <div class="mx-auto max-w-7xl dark">
    
    <div class="flex">
      <h2 class="text-2xl text-slate-200">
        Settings
      </h2>
      <RouterLink :to="{ name: 'clearPlayback' }" class="px-1 py-2 ml-auto font-medium text-blue-300 transition duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-gray-600 hover:text-blue-400">
        Clear playback positions
      </RouterLink>
    </div>
      
    <InputWithLabel class="mt-10" id="tv_dir" v-model="store.settings.tv_dir" :readonly="store.loading">
      TV Directory
      <template v-slot:afterInput>
        <div class="flex items-center gap-x-2">
          <DirSelect v-model="store.settings.tv_dir" defaultPath="%HomeDrive%" :disabled="store.loading" />
          <Button btnstyle="outline" btncolor="blue" @click="useOpenOrHomeDir(store.settings.tv_dir)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
            </svg>
            Open
          </Button>
        </div>
      </template>
    </InputWithLabel>
    
    <InputWithLabel class="mt-10" id="movie_dir" v-model="store.settings.movie_dir" :readonly="store.loading">
      Movies Directory
      <template v-slot:afterInput>
        <div class="flex items-center gap-x-2">
          <DirSelect v-model="store.settings.movie_dir" defaultPath="%HomeDrive%" :disabled="store.loading" />
          <Button btnstyle="outline" btncolor="blue" @click="useOpenOrHomeDir(store.settings.movie_dir)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
            </svg>
            Open
          </Button>
        </div>
      </template>
    </InputWithLabel>
    
    <InputWithLabel class="mt-10" id="tvdb_apikey" v-model="store.settings.tvdb_apikey" :readonly="store.loading">
      TVDB API Key
    </InputWithLabel>
    
    <InputWithLabel class="mt-10" id="tvdb_pin" v-model="store.settings.tvdb_pin" :readonly="store.loading">
      TVDB PIN
    </InputWithLabel>
    
    <InputWithLabel class="mt-10" id="mpv_watched_dir" v-model="store.settings.mpv_watched_dir" :readonly="store.loading">
      MPV Playback Positions Directory
      <template v-slot:afterInput>
        <div class="flex items-center gap-x-2">
          <DirSelect v-model="store.settings.mpv_watched_dir" defaultPath="%AppData%\mpv" :disabled="store.loading" />
          <Button btnstyle="outline" btncolor="blue" @click="useOpenOrHomeDir(store.settings.mpv_watched_dir)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
            </svg>
            Open
          </Button>
        </div>
      </template>
    </InputWithLabel>
    
  </div>
  
</template>