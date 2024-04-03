<script setup>
import { onBeforeMount, onBeforeUnmount } from 'vue';
import { store, showIdLists, externalItemIdLists, movieIdLists, archivesItems, archivesSelectedItemIndex } from '../store';
import ShowCard from '../components/ShowCard.vue';
import ExternalItemCard from '../components/ExternalItemCard.vue';
import MovieCard from '../components/MovieCard.vue';

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowLeft':
      let itemIndex = archivesSelectedItemIndex.value;
      if (!archivesItems.value.length || itemIndex === null) return true;
      switch (event.key) {
        case 'ArrowRight':
          itemIndex++;
          if (itemIndex > archivesItems.value.length - 1) itemIndex = archivesItems.value.length - 1;
          break;
        case 'ArrowLeft':
          itemIndex--;
          if (itemIndex < 0) itemIndex = 0;
          break;
      }
      store.archives_selected_item = archivesItems.value[itemIndex];
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      if (store.archives_selected_item.type !== 'show') return true;
      event.preventDefault();
      let show = store.archives_selected_item;
      show.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev')
      break;
    case ' ':
      if (store.archives_selected_item.play()) event.preventDefault();
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
  
  <div class="px-12 pt-8 pb-8">
    
    <div class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
      <ShowCard
        v-for="showID in showIdLists.archived"
        :show="store.shows[showID]"
        :is-selected="store.archives_selected_item.slug === store.shows[showID].slug"
      ></ShowCard>
    </div>
    
    <div class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
      <ExternalItemCard
        v-for="itemID in externalItemIdLists.archived"
        :item="store.external_items[itemID]"
        :is-selected="store.archives_selected_item.slug === store.external_items[itemID].slug"
      ></ExternalItemCard>
    </div>
    
    <div class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,_360px))]">
      <MovieCard
        v-for="movieID in movieIdLists.archived"
        :movie="store.movies[movieID]"
        :is-selected="store.archives_selected_item.slug === store.movies[movieID].slug"
      ></MovieCard>
    </div>
    
  </div>
  
</template>