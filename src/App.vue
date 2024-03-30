<script setup>
import { onBeforeMount, onMounted } from 'vue';
import { listen } from '@tauri-apps/api/event'
import Database from 'tauri-plugin-sql-api';
import NavLink from './components/NavLink.vue';
import { store } from './store.js';
import { useRoute } from "vue-router";

const route = useRoute();
store.route = route;

onBeforeMount(async () => {
  store.db = await Database.load('sqlite:playa.db');
  store.loading_msg = null;
  store.loading = true;
  await store.loadFromDB();
  await store.getPlaybackPositions();
  store.selectFirstHomeItem();
  store.loading = false;
});

listen('loading-event', (event) => {
  if (event.payload) store.loading_msg = event.payload.message;
});
</script>

<template>
  
  <header class="fixed top-0 left-0 right-0 z-50 flex flex-wrap w-full max-w-full py-2 text-sm bg-gray-900 sm:justify-start sm:flex-nowrap">
    <nav class="w-full max-w-full px-4 mx-auto sm:gap-x-3 sm:flex sm:items-center sm:justify-between" aria-label="Global">
      
      <RouterLink :to="{ name: 'home' }" class="flex-none py-2 text-xl font-semibold text-white">
        Playa
      </RouterLink>
      
      <div class="mt-1.5 text-gray-200 w-4">
        <Transition name="fade">
          <span v-show="store.loading">
            <div class="relative top-0.5 animate-spin inline-block size-4 border-[3px] border-current border-t-transparent text-blue-200 rounded-full dark:text-blue-100" role="status" aria-label="loading">
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
        <NavLink :to="{ name: 'settings' }" :isActive="$route.name === 'settings'">Settings</NavLink>
      </div>
      
    </nav>
  </header>
  
  <main class="w-full pt-4 pb-40 mt-16">
    <div class="w-full px-4 mx-auto">
      <RouterView />
    </div>
  </main>
  
</template>
