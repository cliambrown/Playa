<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { store } from '../store';
import { RouterLink } from 'vue-router';

const props = defineProps(['movie', 'isSelected']);

const wrapper = ref(null);

const playbackPosition = computed(() => {
  if (
    !store.playback_positions.hasOwnProperty(props.movie.filename)
  ) {
    return '--';
  }
  return store.playback_positions[props.movie.filename];
});

const posterAssetUrl = computed(() => {
  return (store.poster_dir_url && props.movie && props.movie.poster_filename)
    ? store.poster_dir_url + props.movie.poster_filename
    : '/assets/blank_poster.jpg';
});

function scrollIntoView() {
  if (props.isSelected) {
    wrapper.value.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
}

onMounted(async () => {
  await nextTick();
  window.setTimeout(() => {
    scrollIntoView();
  }, 200);
});

watch(
  () => props.isSelected,
  (newVal) => scrollIntoView()
);
</script>

<template>
  <div
    @click="store.home.selected_item = movie"
    class="relative text-lg text-left text-gray-900 transition duration-150 ease-in-out bg-white rounded-b-xl"
    :class="{
      'ring-[6px] ring-green-400 ring-offset-[6px] ring-offset-slate-900': isSelected,
      'opacity-90': !isSelected,
    }"
    >
    
    <div class="">
      <img :src="posterAssetUrl" class="block">
    </div>
    
    <div class="px-6 pt-3 pb-4">
      
      <div class="">
        <span v-if="movie.is_new" class="relative inline-block px-2 mr-2 text-sm text-white bg-orange-700 rounded-full bottom-1">
          NEW
        </span>
        <span class="text-2xl font-semibold">
          {{ movie.name }}
        </span>
      </div>
      
      <div class="flex items-end justify-between">
        <div>
          {{ playbackPosition }} / {{ movie.duration }}
        </div>
        <RouterLink :to="{ name: 'movie', params: { id: movie.id } }" @click.stop class="inline-block p-2 -mb-2 -mr-2 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </RouterLink>
      </div>
      
    </div>
    
    <div class="absolute left-0 right-0 opacity-0 pointer-events-none -top-10 -bottom-10 -z-10" ref="wrapper"></div>
    
  </div>
</template>