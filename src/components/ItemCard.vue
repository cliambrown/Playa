<script setup>
import { MonitorCheck } from '@lucide/vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useGetProp } from '../helpers.js';
import { store } from '../store';
import Badge from './Badge.vue';

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
  return filename ? useGetProp(store.playback_positions, filename, '--') : null;
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
    class="relative w-full sm:w-auto transition duration-150 ease-in-out"
    :class="{
      'rounded-xl': item.type === 'show',
      'rounded-b-xl': item.type === 'movie',
      'ring-[6px] ring-green-400 ring-offset-[6px] ring-offset-slate-800': isSelected,
      'opacity-90': !isSelected,
    }"
    >
    
    <div
      class="overflow-hidden text-gray-900 text-lg text-left"
      :class="{
        'rounded-xl': item.type === 'show',
        'rounded-b-xl': item.type === 'movie',
      }"
      >
      
      <div class="bg-gray-700">
        <img :src="artworkAssetUrl" class="block" :class="{ 'w-full aspect-[758/140_auto]': item.type === 'show', 'aspect-[680/1000_auto]': item.type === 'movie' }">
      </div>
      
      <div class="bg-white px-6 pt-3 pb-4">
        
        <div>
          <Badge v-if="item.is_new" class="bottom-1 relative mr-2" variant="new">New</Badge>
          <span class="font-semibold text-2xl">
            {{ item.name }}
          </span>
        </div>
          
        <div v-if="currentEp" class="mt-1 font-semibold text-gray-700">
          <Badge v-if="currentEp.episode_num == 1 && currentEp.season_num != 0" class="bottom-0.5 relative mr-2" variant="premiere">
            Season Premiere
          </Badge>
          <Badge v-if="currentEp.is_season_finale && !currentEp.is_series_finale" class="bottom-0.5 relative mr-2" variant="seasonfinale">
            Season Finale
          </Badge>
          <Badge v-if="currentEp.is_series_finale" class="bottom-0.5 relative mr-2" variant="seriesfinale">
            Series Finale
          </Badge>
          <Badge v-if="currentEp.is_special" class="bottom-0.5 relative mr-2" variant="special">
            Special
          </Badge>
          <span v-if="item.source !== 'ytPlaylist'" class="mr-2">{{ currentEp.sXXeXX }}</span>
          <span>{{ currentEp.name }}</span>
        </div>
        
        <div>
          
          <div class="flex justify-between items-center gap-8 mt-1 text-gray-900">
            
            <MonitorCheck v-if="item.current_episode_id === null" class="-mr-4 size-5 text-green-600" />
            
            <span v-if="duration && (currentEp || item.type === 'movie')" class="">
              <span v-show="playbackPosition">
                {{ playbackPosition }} /
              </span>
              {{ duration }} 
            </span>
            
            <div class="flex items-center gap-2 ml-auto">
              
              <template v-if="item.episode_ids.length">
                <span v-if="remainingEps > 0" class="text-black">
                  {{ remainingEps }} remaining
                  /
                  {{ item.episode_ids.length }}
                  total
                </span>
                <span v-else class="text-black">
                  {{ item.episode_ids.length }} episodes
                </span>
                <Badge v-if="hasNewEpisodes" class="bottom-px relative ml-2" variant="new">New</Badge>
              </template>
              
              <RouterLink :to="{ name: 'item', params: { id: itemID } }" @click.stop class="flex justify-center items-center bg-gray-100 hover:bg-gray-200 -my-2 -mr-3 ml-4 rounded-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 size-10 text-indigo-600 transition duration-150 ease-in-out">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-icon lucide-ellipsis"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </RouterLink>
              
            </div>
            
          </div>
          
        </div>
        
      </div>
      
    </div>
    
    <div class="-top-10 right-0 -bottom-10 left-0 -z-10 absolute opacity-0 pointer-events-none" ref="wrapper"></div>
    
  </div>
</template>