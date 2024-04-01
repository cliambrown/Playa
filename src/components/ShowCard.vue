<script setup>
import { computed } from 'vue';
import { store } from '../store';

const props = defineProps(['show', 'isSelected']);

const currentEpIndex = computed(() => {
  return props.show.current_episode_id
    ? props.show.episode_ids.indexOf(props.show.current_episode_id)
    : props.show.episode_ids.length
});

const currentEp = computed(() => {
  return props.show.current_episode_id
    ? props.show.episodes[props.show.current_episode_id]
    : null
});

const hasNewEpisodes = computed(() => {
  if (!props.show) return false;
  for (const episodeID of props.show.episode_ids) {
    const episode = props.show.episodes[episodeID];
    if (episode.is_new) return true;
  }
  return false;
});

const playbackPosition = computed(() => {
  if (
    !props.show.current_episode_id
    || !store.playback_positions.hasOwnProperty(currentEp.value.filename)
  ) {
    return '--';
  }
  return store.playback_positions[currentEp.value.filename];
});

const bannerAssetUrl = computed(() => {
  return store.banner_dir_url +
    (props.show && props.show.banner_filename
      ? props.show.banner_filename
      : 'blank.jpg');
});
</script>

<template>
  <div
    @click="store.home.selected_item = show" 
    class="w-[580px] sm:w-auto text-left text-gray-900 text-lg bg-white max-w-full rounded-xl transition duration-150 ease-in-out relative overflow-hidden"
    :class="{
      'ring-[6px] ring-green-400 ring-offset-[6px] ring-offset-slate-900': isSelected,
      'opacity-90': !isSelected,
    }"
    >
    <div class="flex flex-col">
      <div class="">
        <img :src="bannerAssetUrl" class="block w-full">
      </div>
      <div class="px-6 pt-3 pb-4">
        <div class="flex items-center">
          <div class="grow">
            <span v-if="show.is_new" class="relative inline-block px-2 text-sm text-white bg-orange-700 rounded-full bottom-0.5 mr-2">
              NEW
            </span>
            <span class="text-2xl font-semibold">
              {{ show.name }}
            </span>
          </div>
          <RouterLink :to="{ name: 'show', params: { id: show.id } }" @click.stop class="inline-block p-2 -m-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </RouterLink>
        </div>
        <div class="mt-1 text-gray-600">
          {{ (show.episode_ids.length - currentEpIndex) }} unwatched
          <span v-show="hasNewEpisodes">*</span>
          / 
          {{ show.episode_ids.length }} total
        </div>
        <div v-if="currentEp" class="mt-0.5">
          <div class="font-semibold text-gray-700">
            S{{ (currentEp.season_num + '').padStart(2, '0') }}E{{ (currentEp.episode_num + '').padStart(2, '0') }}
            {{ currentEp.name }}
          </div>
          <div>
            {{ playbackPosition }} / {{ currentEp.duration }}
          </div>
        </div>
      </div>
    </div>
    <div class="absolute left-0 right-0 opacity-0 pointer-events-none -top-10 -bottom-10 -z-10" ref="wrapper"></div>
  </div>
</template>