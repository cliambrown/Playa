<script setup>
import { store } from '../store';
import { ref, onBeforeMount, onBeforeUnmount } from 'vue';
import { TransitionExpand } from '@morev/vue-transitions';
import { onClickOutside } from '@vueuse/core';
import SearchModal from '../components/SearchModal.vue';
import ItemCard from '../components/ItemCard.vue';
import { useGetProp } from '../helpers';
import ScanIcon from '../icons/ScanIcon.vue';
import ShowIcon from '../icons/ShowIcon.vue';
import HideIcon from '../icons/HideIcon.vue';
import TvIcon from '../icons/TvIcon.vue';
import MovieIcon from '../icons/MovieIcon.vue';
import YoutubeIcon from '../icons/YoutubeIcon.vue';
import SearchIcon from '../icons/SearchIcon.vue';
import AddIcon from '../icons/AddIcon.vue';

let ctrlIsDown = false;

const scanMenu = ref(null);
const showScanMenu = ref(false);
function toggleShowScanMenu() {
  showScanMenu.value = !showScanMenu.value;
}
onClickOutside(scanMenu, e => { if (showScanMenu.value) showScanMenu.value = false } );

const extItemMenu = ref(null);
const showExtItemMenu = ref(false);
function toggleShowExtItemMenu() {
  showExtItemMenu.value = !showExtItemMenu.value;
}
onClickOutside(extItemMenu, e => { if (showExtItemMenu.value) showExtItemMenu.value = false });

function toggleShowFinished() {
  if (
    store.show_finished_items
    && store.home_selected_item_id
    && store.items[store.home_selected_item_id].current_episode_id === null
  ) {
    store.selectFirstHomeItem();
  }
  store.show_finished_items = !store.show_finished_items;
}

function scanShows() {
  store.scanShows();
}

function scanMovies() {
  store.scanMovies();
}

function updateAllYtPlaylistsFromSource() {
  store.updateAllYtPlaylistsFromSource(true);
}

function handleKeydown(event) {
  if (store.show_search) return false;
  let item;
  switch (event.key) {
    case 'Control':
      ctrlIsDown = true;
      break;
    case 'k':
      if (ctrlIsDown) store.show_search = !store.show_search;
      break;
    case 'ArrowLeft':
      store.homeItemNav(false)
      break;
    case 'ArrowRight':
      store.homeItemNav(true);
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      item = useGetProp(store.items, store.home_selected_item_id);
      if (item) item.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev')
      break;
    case ' ':
      event.preventDefault();
      item = useGetProp(store.items, store.home_selected_item_id);
      if (item) item.play();
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
});

</script>

<template>
  
  <div class="px-12 pt-8 pb-20 overflow-y-scroll grow">
    
    <div class="flex justify-end gap-6">
      
      <Button variant="secondary" @click="toggleShowFinished" :disabled="!store.home_finished_show_ids.length">
        <HideIcon v-if="store.show_finished_items" />
        <ShowIcon v-else />
        {{ store.home_finished_show_ids.length + store.home_finished_movie_ids.length }}
        Finished
      </Button>
      
      <div class="relative" ref="scanMenu">
        
        <Button @click="toggleShowScanMenu" :disabled="store.loading">
          <ScanIcon />
          Scan for Updates
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </Button>
        
        <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
          <div v-if="showScanMenu" class="absolute left-0 z-10 w-full mt-2 origin-top-right rounded-md shadow-lg bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            <div class="py-1">
              <button type="button" @click="scanShows" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-400">
                <TvIcon />
                Local Shows
              </button>
              <button type="button" @click="scanMovies" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-400">
                <MovieIcon />
                Local Movies
              </button>
              <button type="button" @click="updateAllYtPlaylistsFromSource" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 justify-left hover:text-blue-400 whitespace-nowrap">
                <YoutubeIcon />
                YouTube Playlists
              </button>
            </div>
          </div>
        </transition>
        
      </div>
      
      <div class="relative" ref="extItemMenu">
        
        <Button @click="toggleShowExtItemMenu" :disabled="store.loading">
          <AddIcon />
          External Item
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </Button>
        
        <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
          <div v-if="showExtItemMenu" class="absolute left-0 z-10 w-full mt-2 origin-top-right rounded-md shadow-lg bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            <div class="py-1">
              <RouterLink :to="{ name: 'item.create.show' }" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-400">
                <TvIcon />
                Show
              </RouterLink>
              <RouterLink :to="{ name: 'item.create.movie' }" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-400">
                <MovieIcon />
                Movie
              </RouterLink>
              <RouterLink :to="{ name: 'item.create.ytPlaylist' }" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-400">
                <YoutubeIcon />
                YT Playlist
              </RouterLink>
            </div>
          </div>
        </transition>
        
      </div>
      
      <Button variant="secondary" @click="store.show_search = true" :disabled="store.loading">
        <SearchIcon />
        Search
      </Button>
      
    </div>
    
    <div v-if="store.home_unfinished_show_ids.length" class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
      <ItemCard
        v-for="itemID in store.home_unfinished_show_ids"
        :itemID="itemID"
      ></ItemCard>
    </div>
    
    <TransitionExpand>
      <div v-show="store.show_finished_items && store.home_finished_show_ids.length" class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
        <ItemCard
          v-for="itemID in store.home_finished_show_ids"
          :itemID="itemID"
        ></ItemCard>
      </div>
    </TransitionExpand>
    
    <div v-if="store.home_unfinished_movie_ids.length" class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,_360px))]">
      <ItemCard
        v-for="itemID in store.home_unfinished_movie_ids"
        :itemID="itemID"
      ></ItemCard>
    </div>
    
    <TransitionExpand>
      <div v-show="store.show_finished_items && store.home_finished_movie_ids.length" class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,_360px))]">
        <ItemCard
          v-for="itemID in store.home_finished_movie_ids"
          :itemID="itemID"
        ></ItemCard>
      </div>
    </TransitionExpand>
    
  </div>
    
  <SearchModal v-model="store.show_search"></SearchModal>
  
</template>