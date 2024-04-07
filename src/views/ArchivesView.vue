<script setup>
import { onBeforeMount, onBeforeUnmount } from 'vue';
import { store } from '../store';
import ShowtypeCard from '../components/ShowtypeCard.vue';
import MovietypeCard from '../components/MovietypeCard.vue';

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowLeft':
      store.archivesItemNav(false)
      break;
    case 'ArrowRight':
      store.archivesItemNav(true);
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      if (store.archives_selected_item.type !== 'Show') return true;
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
  
  <div class="px-12 pt-8 pb-20 overflow-y-auto grow">
    
    <div v-if="store.archives_showtype_items.length" class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,_570px))]">
      <ShowtypeCard
        v-for="item in store.archives_showtype_items"
        :item="item"
        :is-selected="store.archives_selected_item.slug === item.slug"
      ></ShowtypeCard>
    </div>
    
    <div class="flex flex-wrap items-start justify-center gap-12 mt-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,_360px))]">
      <MovietypeCard
        v-for="item in store.archives_movietype_items"
        :item="item"
        :is-selected="store.archives_selected_item.slug === item.slug"
      ></MovietypeCard>
    </div>
    
  </div>
  
</template>