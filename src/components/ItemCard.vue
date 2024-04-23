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
        
        <div v-if="item.type === 'show'">
          
          <div class="flex items-end justify-between mt-1">
            
            <div v-if="item.episode_ids.length" class="text-gray-600">
              {{ (item.episode_ids.length - currentEpIndex) }} unwatched
              <span v-show="hasNewEpisodes" class="relative inline-block px-2 text-sm text-white bg-orange-700 rounded-full bottom-0.5 mr-2">
                NEW
              </span>
              / 
              {{ item.episode_ids.length }} total
            </div>
            
            <div v-else class="text-gray-600">
              [{{ item.current_episode_id === null ? 'Finished' : 'Unfinished' }}]
            </div>
            
            <ItemRouterLink v-show="!currentEp" :itemID="itemID"></ItemRouterLink>
            
          </div>
          
          <div v-if="currentEp" class="mt-1 font-semibold text-gray-700">
            {{ item.source === 'ytPlaylist' ? currentEp.order_num + '.' : currentEp.sXXeXX }}
            {{ currentEp.name }}
          </div>
          
        </div>
        
        <div v-if="!(item.type === 'show' && !currentEp)" class="flex items-center justify-between gap-x-6">
          
          <div>
            
            <span v-if="item.type === 'movie' && item.current_episode_id === null" class="mr-2">
              [Finished]
            </span>
            
            <span v-if="playbackPosition">
              {{ playbackPosition }} /
            </span>
            {{ duration }}
          </div>
          
          <ItemRouterLink :itemID="itemID"></ItemRouterLink>
          
        </div>
        
      </div>
      
    </div>
    
    <div class="absolute left-0 right-0 opacity-0 pointer-events-none -top-10 -bottom-10 -z-10" ref="wrapper"></div>
    
  </div>
</template>