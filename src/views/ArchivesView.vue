<script setup>
import { store } from '../store';
import { ref, onBeforeMount, onBeforeUnmount } from 'vue';
import { TransitionExpand } from '@morev/vue-transitions';
import { onClickOutside } from '@vueuse/core';
import SearchModal from '../components/SearchModal.vue';
import ItemCard from '../components/ItemCard.vue';
import { useGetProp } from '../helpers';

function handleKeydown(event) {
  let item;
  switch (event.key) {
    case 'ArrowLeft':
      store.archivesItemNav(false)
      break;
    case 'ArrowRight':
      store.archivesItemNav(true);
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      item = useGetProp(store.items, store.archives_selected_item_id);
      if (item) item.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev')
      break;
    case ' ':
      event.preventDefault();
      item = useGetProp(store.items, store.archives_selected_item_id);
      if (item) item.play();
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
  
  <div class="px-12 pt-8 pb-20 overflow-y-scroll grow">
    
    <div v-if="store.archives_show_ids.length" class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
      <ItemCard
        v-for="itemID in store.archives_show_ids"
        :itemID="itemID"
      ></ItemCard>
    </div>
    
    <div v-if="store.archives_movie_ids.length" class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,_360px))]">
      <ItemCard
        v-for="itemID in store.archives_movie_ids"
        :itemID="itemID"
      ></ItemCard>
    </div>
    
  </div>
  
</template>