<script setup>
import { getVersion } from '@tauri-apps/api/app';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import Database from '@tauri-apps/plugin-sql';
import { onBeforeMount, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavLink from './components/NavLink.vue';
import ArchiveIcon from './icons/ArchiveIcon.vue';
import HomeIcon from './icons/HomeIcon.vue';
import SetttingsIcon from './icons/SetttingsIcon.vue';
import { store } from './store.js';
import XIcon from './icons/XIcon.vue';
import ExpandIcon from './icons/ExpandIcon.vue';
import ChevronDownIcon from './icons/ChevronDownIcon.vue';
import ChevronUpIcon from './icons/ChevronUpIcon.vue';
import DiamondIcon from './icons/DiamondIcon.vue';

const router = useRouter();
const route = useRoute();
store.route = route;
store.router = router;

const appVersion = ref(null);

const appWindow = getCurrentWindow();
const isMaximized = ref(true);
let windowMaxUnlisten;

let ctrlIsDown = false;

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
  appVersion.value = await getVersion();
  isMaximized.value = await appWindow.isMaximized();
  windowMaxUnlisten = await appWindow.onResized(async ({ payload: size }) => {
    isMaximized.value = await appWindow.isMaximized();
  });
});

listen('loading-event', (event) => {
  if (event.payload) store.loading_msg = event.payload.message;
});

function handleKeydown(event) {
  switch (event.key) {
    case 'Control':
      ctrlIsDown = true;
      break;
    case 'w':
      if (ctrlIsDown) {
        event.preventDefault();
        exit(0);
      }
      break;
    case 'Escape':
      if (route.name === 'home') return true;
      router.go(-1);
      break;
  }
  return true;
}

function handleKeyup(event) {
  if (event.key === 'Control') ctrlIsDown = false;
}

onBeforeMount(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
  if (windowMaxUnlisten) windowMaxUnlisten();
});

</script>

<template>
  
  <div class="flex flex-col h-full min-h-screen max-h-full">
    
    <header class="flex flex-wrap sm:flex-nowrap sm:justify-start bg-black w-full max-w-full text-sm">
      <nav class="sm:flex sm:justify-between sm:items-center sm:gap-x-3 mx-auto ps-4 w-full max-w-full overflow-hidden" aria-label="Global" data-tauri-drag-region>
        
        <RouterLink :to="{ name: 'home' }" class="flex-none py-2 font-semibold text-white text-xl">
          Playa
        </RouterLink>
        
        <div v-if="appVersion" class="mt-1.5 text-gray-300 text-sm">
          v{{ appVersion }}
        </div>
        
        <div class="mt-1.5 w-4 text-gray-200">
          <Transition name="fade">
            <span v-show="store.loading">
              <div class="inline-block top-0.5 relative border-[3px] border-current border-t-transparent rounded-full size-4 text-blue-100 animate-spin" role="status" aria-label="loading">
                <span class="sr-only">Loading...</span>
              </div>
            </span>
          </Transition>
        </div>
        
        <div class="mt-0 overflow-hidden text-green-600 text-base text-ellipsis whitespace-nowrap">
          {{ store.loading_msg }}
        </div>
        
        <div class="flex flex-row sm:justify-end items-center gap-5 mt-5 sm:mt-0 ml-auto sm:ps-5">
          <NavLink :to="{ name: 'home' }" :isActive="$route.name === 'home'">
            <HomeIcon />
            Home
          </NavLink>
          <NavLink :to="{ name: 'archives' }" :isActive="$route.name === 'archives'">
            <ArchiveIcon />
            Archives
          </NavLink>
          <NavLink :to="{ name: 'settings' }" :isActive="$route.name === 'settings'">
            <SetttingsIcon />
            Settings
          </NavLink>
        </div>
        
        <div class="flex flex-row sm:justify-end items-stretch self-stretch gap-1 sm:ps-5">
          
          <button type="button" @click="appWindow.minimize()" class="group px-1 rounded-md focus:outline-hidden focus-visible:ring-1 focus-visible:ring-gray-600 font-medium transition duration-150 ease-in-out">
            <div class="flex justify-center items-center bg-transparent group-hover:bg-gray-700 rounded-full size-6 transition duration-100 ease-in-out">
              <ChevronDownIcon />
            </div>
          </button>
          
          <button type="button" @click="appWindow.toggleMaximize()" class="group px-1 rounded-md focus:outline-hidden focus-visible:ring-1 focus-visible:ring-gray-600 font-medium transition duration-150 ease-in-out">
            <div class="flex justify-center items-center bg-transparent group-hover:bg-gray-700 rounded-full size-6 transition duration-100 ease-in-out">
              <DiamondIcon v-if="isMaximized" />
              <ChevronUpIcon v-else />
            </div>
          </button>
          
          <button type="button" @click="appWindow.close()" class="group -me-1 ps-2 pe-3 rounded-md focus:outline-hidden focus-visible:ring-1 focus-visible:ring-gray-600 font-medium transition duration-150 ease-in-out">
            <div class="flex justify-center items-center bg-transparent group-hover:bg-gray-700 rounded-full size-6 transition duration-100 ease-in-out">
              <XIcon />
            </div>
          </button>
          
        </div>
        
        
      </nav>
    </header>
    
    <main class="flex flex-col w-full min-h-0 grow">
      <RouterView />
    </main>
    
  </div>
  
</template>
