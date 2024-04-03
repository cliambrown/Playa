<script setup>
import { invoke } from '@tauri-apps/api/tauri';
import { computed, onBeforeMount, onBeforeUnmount } from 'vue';
import { TransitionExpand } from '@morev/vue-transitions';
import { store, showIdLists, externalItemIdLists, movieIdLists, homeItems, homeSelectedItemIndex } from '../store';
import ShowCard from '../components/ShowCard.vue';
import ExternalItemCard from '../components/ExternalItemCard.vue';
import MovieCard from '../components/MovieCard.vue';

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowLeft':
      let itemIndex = homeSelectedItemIndex.value;
      if (!homeItems.value.length || itemIndex === null) return true;
      switch (event.key) {
        case 'ArrowRight':
          itemIndex++;
          if (itemIndex > homeItems.value.length - 1) itemIndex = homeItems.value.length - 1;
          break;
        case 'ArrowLeft':
          itemIndex--;
          if (itemIndex < 0) itemIndex = 0;
          break;
      }
      store.home.selected_item = homeItems.value[itemIndex];
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      if (store.home.selected_item.type !== 'show') return true;
      event.preventDefault();
      let show = store.home.selected_item;
      show.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev')
      break;
    case ' ':
      if (store.home.selected_item.play()) event.preventDefault();
      break;
  }
  return true;
}

function scanShows() {
  store.scanShows();
}

function scanMovies() {
  store.scanMovies();
}

onBeforeMount(() => {
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function toggleShowFinished() {
  if (
    store.home.show_finished_shows
    && store.home.selected_item.type === 'show'
    && store.home.selected_item.current_episode_id !== null
  ) {
    store.selectFirstHomeItem();
  }
  store.home.show_finished_shows = !store.home.show_finished_shows;
}

function addItem() {
  store.router.push({ name: 'externalItem' });
}

</script>

<template>
  
  <div class="px-12 pt-8 pb-8">
    
    <div class="flex justify-center gap-6">
      
      <Button variant="action-secondary" @click="toggleShowFinished">
        <svg v-show="!store.home.show_finished_shows" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
        </svg>
        <svg v-show="store.home.show_finished_shows" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
        </svg>
        Finished
      </Button>
      
      <Button @click="scanShows" :disabled="store.loading || !store.settings.tv_dir">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
        </svg>
        Scan shows
      </Button>
      
      <Button @click="scanMovies" :disabled="store.loading || !store.settings.movie_dir">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
        </svg>
        Scan movies
      </Button>
      
      <Button variant="link-secondary" @click="addItem" :disabled="store.loading">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
        Add external
      </Button>
      
    </div>
    
    <div class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
      <ShowCard
        v-for="showID in showIdLists.unfinished"
        :show="store.shows[showID]"
        :is-selected="store.home.selected_item.slug === store.shows[showID].slug"
      ></ShowCard>
    </div>
    
    <TransitionExpand>
      <div v-show="store.home.show_finished_shows && showIdLists.finished.length" class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
        <ShowCard
          v-for="showID in showIdLists.finished"
          :show="store.shows[showID]"
          :is-selected="store.home.selected_item.slug === store.shows[showID].slug"
        ></ShowCard>
      </div>
    </TransitionExpand>
    
    <div class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
      <ExternalItemCard
        v-for="itemID in externalItemIdLists.unarchived"
        :item="store.external_items[itemID]"
        :is-selected="store.home.selected_item.slug === store.external_items[itemID].slug"
      ></ExternalItemCard>
    </div>
    
    <div class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,_360px))]">
      <MovieCard
        v-for="movieID in movieIdLists.unarchived"
        :movie="store.movies[movieID]"
        :is-selected="store.home.selected_item.slug === store.movies[movieID].slug"
      ></MovieCard>
    </div>
    
  </div>
  
</template>