<script setup>
import { store } from '../store';
import { ref, onBeforeMount, onBeforeUnmount } from 'vue';
import { TransitionExpand } from '@morev/vue-transitions';
import { onClickOutside } from '@vueuse/core';
import SearchModal from '../components/SearchModal.vue';
import ItemCard from '../components/ItemCard.vue';
import { useGetProp } from '../helpers';

let ctrlIsDown = false;

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

function handleKeydown(event) {
  if (store.show_search) return false;
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
      let item = useGetProp(store.items, store.home_selected_item_id);
      if (item) item.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev')
      break;
    case ' ':
      if (store.home_selected_item.play()) event.preventDefault();
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
      
      <Button variant="tertiary" @click="toggleShowFinished" :disabled="!store.home_finished_show_ids.length">
        <svg v-show="!store.show_finished_items" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
        </svg>
        <svg v-show="store.show_finished_items" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
        </svg>
        {{ store.home_finished_show_ids.length + store.home_finished_movie_ids.length }}
        Finished
      </Button>
      
      <Button @click="scanShows" :disabled="store.loading || !store.settings.tv_dir">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path d="M6 7.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
          <path fill-rule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm3.5 2.5a3 3 0 1 0 1.524 5.585l1.196 1.195a.75.75 0 1 0 1.06-1.06l-1.195-1.196A3 3 0 0 0 7.5 4.5Z" clip-rule="evenodd" />
        </svg>
        Scan Shows
      </Button>
      
      <Button @click="scanMovies" :disabled="store.loading || !store.settings.movie_dir">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path d="M6 7.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
          <path fill-rule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm3.5 2.5a3 3 0 1 0 1.524 5.585l1.196 1.195a.75.75 0 1 0 1.06-1.06l-1.195-1.196A3 3 0 0 0 7.5 4.5Z" clip-rule="evenodd" />
        </svg>
        Scan Movies
      </Button>
      
      <div class="relative" ref="extItemMenu">
        
        <Button @click="toggleShowExtItemMenu" :disabled="store.loading">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          External Item
        </Button>
        
        <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
          <div v-if="showExtItemMenu" class="absolute left-0 z-10 w-full mt-2 origin-top-right rounded-md shadow-lg bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            <div class="py-1">
              <RouterLink :to="{ name: 'item.create.show' }" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                  <path d="M12 5H4v4h8V5Z" />
                  <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
                </svg>
                Show
              </RouterLink>
              <RouterLink :to="{ name: 'item.create.movie' }" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-300 hover:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9Zm1.5.25a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25v1a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25v-1Zm3.75-.25a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25h-3.5ZM6 8.75a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.5a.25.25 0 0 1-.25.25h-3.5a.25.25 0 0 1-.25-.25v-3.5Zm5.75-5.25a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25v-1a.25.25 0 0 0-.25-.25h-1.5ZM2.5 11.25a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25v1a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25v-1Zm9.25-.25a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25v-1a.25.25 0 0 0-.25-.25h-1.5ZM2.5 8.75a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25v1a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25v-1Zm9.25-.25a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25v-1a.25.25 0 0 0-.25-.25h-1.5ZM2.5 6.25A.25.25 0 0 1 2.75 6h1.5a.25.25 0 0 1 .25.25v1a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25v-1ZM11.75 6a.25.25 0 0 0-.25.25v1c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25v-1a.25.25 0 0 0-.25-.25h-1.5Z" clip-rule="evenodd" />
                </svg>
                Movie
              </RouterLink>
            </div>
          </div>
        </transition>
        
      </div>
      
      <Button variant="secondary" @click="store.show_search = true" :disabled="store.loading">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
        </svg>
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