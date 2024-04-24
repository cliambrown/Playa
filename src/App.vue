<script setup>
import { onBeforeMount, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { join } from '@tauri-apps/api/path';
import { listen } from '@tauri-apps/api/event'
import { appLocalDataDir } from '@tauri-apps/api/path';
import Database from 'tauri-plugin-sql-api';
import NavLink from './components/NavLink.vue';
import { store } from './store.js';

const router = useRouter();
const route = useRoute();
store.route = route;
store.router = router;

onBeforeMount(async () => {
  store.loading = true;
  store.loading_msg = null;
  const localDataDir = await appLocalDataDir();
  store.local_data_dir = localDataDir;
  // Add 'x' at the end to get the trailing dir slash
  const artworkFilepath = await join(localDataDir, 'artworks', 'x');
  store.artworks_dir = artworkFilepath.slice(0,-1);
  store.artworks_dir_url = convertFileSrc(store.artworks_dir);
  store.db = await Database.load('sqlite:playa.db');
  await store.loadFromDB();
  await store.getPlaybackPositions();
  await store.updateAllYtPlaylistsFromSource();
  store.selectFirstHomeItem();
  store.selectFirstArchivesItem();
  store.loading = false;
});

listen('loading-event', (event) => {
  if (event.payload) store.loading_msg = event.payload.message;
});

function handleKeydown(event) {
  if (route.name === 'home') return true;
  switch (event.key) {
    case 'Escape':
    router.go(-1);
    break;
  }
  return true;
}

onBeforeMount(() => {
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});

</script>

<template>
  
  <div class="flex flex-col h-full max-h-full min-h-screen">
    
    <header class="flex flex-wrap w-full max-w-full py-2 text-sm bg-black sm:justify-start sm:flex-nowrap">
      <nav class="w-full max-w-full px-4 mx-auto sm:gap-x-3 sm:flex sm:items-center sm:justify-between" aria-label="Global">
        
        <RouterLink :to="{ name: 'home' }" class="flex-none py-2 text-xl font-semibold text-white">
          Playa
        </RouterLink>
        
        <div class="mt-1.5 text-gray-200 w-4">
          <Transition name="fade">
            <span v-show="store.loading">
              <div class="relative top-0.5 animate-spin inline-block size-4 border-[3px] border-current border-t-transparent rounded-full text-blue-100" role="status" aria-label="loading">
                <span class="sr-only">Loading...</span>
              </div>
            </span>
          </Transition>
        </div>
        
        <div class="mt-1.5 overflow-hidden text-green-600 text-ellipsis whitespace-nowrap">
          {{ store.loading_msg }}
        </div>
        
        <div class="flex flex-row items-center gap-5 mt-5 ml-auto sm:justify-end sm:mt-0 sm:ps-5">
          <NavLink :to="{ name: 'home' }" :isActive="$route.name === 'home'">Home</NavLink>
          <NavLink :to="{ name: 'archives' }" :isActive="$route.name === 'archives'">Archives</NavLink>
          <NavLink :to="{ name: 'settings' }" :isActive="$route.name === 'settings'">Settings</NavLink>
        </div>
        
      </nav>
    </header>
    
    <main class="flex flex-col w-full min-h-0 grow">
      <RouterView />
    </main>
    
  </div>
  
</template>
