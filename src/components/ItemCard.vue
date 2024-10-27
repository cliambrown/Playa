<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { store } from '../store';
import { useGetProp } from '../helpers.js';
import ItemRouterLink from './ItemRouterLink.vue';

const props = defineProps(['itemID']);
const wrapper = ref(null);

const item = computed(() => useGetProp(store.items, props.itemID));
const isSelected = computed(() => {
  if (!item.value) return false;
  if (item.value.is_archived) return store.archives_selected_item_id == props.itemID;
  return store.home_selected_item_id == props.itemID
});

const artworkAssetUrl = computed(() => {
  return (store.artworks_dir_url && item.value.artwork_filename)
    ? store.artworks_dir_url + item.value.artwork_filename
    : (item.value.type === 'show' ? '/assets/blank_banner.jpg' : '/assets/blank_poster.jpg');
});

const currentEp = computed(
  () => useGetProp(item.value.episodes, item.value.current_episode_id, null)
);

const currentEpIndex = computed(() => {
  return item.value.current_episode_id !== null
    ? item.value.episode_ids.indexOf(item.value.current_episode_id)
    : item.value.episode_ids.length
});

const remainingEps = computed(() => {
  if (!item.value || !item.value.episode_ids || currentEpIndex.value === null) return 0;
  return item.value.episode_ids.length - currentEpIndex.value;
});

const hasNewEpisodes = computed(() => {
  if (!item.value || !item.value.episode_ids) return false;
  for (const episodeID of item.value.episode_ids) {
    const episode = item.value.episodes[episodeID];
    if (episode.is_new) return true;
  }
  return false;
});

const playbackPosition = computed(() => {
  if (item.value.source !== 'local') return null;
  let filename = null;
  if (item.value.filename) filename = item.value.filename;
  else if (currentEp.value && currentEp.value.filename) filename = currentEp.value.filename;
  return useGetProp(store.playback_positions, filename, '--');
});

const duration = computed(() => {
  let duration = '?';
  if (item.value.duration) duration = item.value.duration;
  else if (currentEp.value && currentEp.value.duration) duration = currentEp.value.duration;
  return duration;
});

const domain = computed(() => {
  if (!item.value.url) return null;
  let url;
  try {
    url = new URL(item.value.url);
  } catch (e) {
    return null;
  }
  if (url && url.hostname) {
    return url.hostname.replace('www.','');
  }
  return null;
});

function setAsSelected() {
  if (item.value.is_archived) {
    store.archives_selected_item_id = props.itemID;
  } else {
    store.home_selected_item_id = props.itemID;
  }
}

function scrollIntoView() {
  if (isSelected.value && wrapper.value) {
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
  () => isSelected.value,
  (newVal) => scrollIntoView()
);

</script>

<template>
  <div
    v-if="!!item"
    @click="setAsSelected"
    class="relative w-full transition duration-150 ease-in-out sm:w-auto"
    :class="{
      'rounded-xl': item.type === 'show',
      'rounded-b-xl': item.type === 'movie',
      'ring-[6px] ring-green-400 ring-offset-[6px] ring-offset-slate-800': isSelected,
      'opacity-90': !isSelected,
    }"
    >
    
    <div
      class="overflow-hidden text-lg text-left text-gray-900"
      :class="{
        'rounded-xl': item.type === 'show',
        'rounded-b-xl': item.type === 'movie',
      }"
      >
      
      <div class="bg-gray-700">
        <img :src="artworkAssetUrl" class="block" :class="{ 'w-full aspect-[758/140_auto]': item.type === 'show', 'aspect-[680/1000_auto]': item.type === 'movie' }">
      </div>
      
      <div class="px-6 pt-3 pb-4 bg-white">
        
        <div>
          <span v-if="item.is_new" class="relative inline-block px-2 mr-2 text-sm text-white bg-orange-700 rounded-full bottom-1">
            NEW
          </span>
          <span class="text-2xl font-semibold">
            {{ item.name }}
          </span>
        </div>
          
        <div v-if="currentEp" class="mt-1 font-semibold text-gray-700">
          <span v-if="item.source !== 'ytPlaylist'">{{ currentEp.sXXeXX }}</span>
          {{ currentEp.name }}
        </div>
        
        <div>
          
          <div class="flex items-center justify-between gap-8 mt-1 text-gray-600">
            
            <svg v-if="item.current_episode_id === null" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 -mr-4 text-green-600">
              <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clip-rule="evenodd" />
            </svg>
            
            <span v-if="duration && (currentEp || item.type === 'movie')" class="">
              <span v-show="playbackPosition">
                {{ playbackPosition }} /
              </span>
              {{ duration }} 
            </span>
            
            <span v-if="item.episode_ids.length">
              <span v-if="remainingEps > 0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="inline-block size-4 relative bottom-0.5 text-gray-400 mr-1">
                  <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 1 1 0 4H4a2 2 0 0 1-2-2ZM2 9.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.25ZM2.75 12.5a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75Z" />
                </svg>
                {{ remainingEps }} remaining
                ({{ item.episode_ids.length }} total)
              </span>
              <span v-if="remainingEps <= 0">
                {{ item.episode_ids.length }} episodes
              </span>
              <span v-show="hasNewEpisodes" class="relative inline-block px-2 text-sm text-white bg-orange-700 rounded-full bottom-0.5 ml-2 font-normal">
                NEW
              </span>
            </span>
            
            <div v-if="!item.episode_ids.length && domain" class="text-gray-600">
              {{ domain }}
            </div>
            
            <ItemRouterLink :itemID="itemID" class="ml-auto"></ItemRouterLink>
            
          </div>
          
        </div>
        
      </div>
      
    </div>
    
    <div class="absolute left-0 right-0 opacity-0 pointer-events-none -top-10 -bottom-10 -z-10" ref="wrapper"></div>
    
  </div>
</template>