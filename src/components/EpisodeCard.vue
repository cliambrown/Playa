<script setup>
import { computed, ref, watch } from 'vue';
import { store } from '../store.js'

const props = defineProps(['episode', 'isSelected', 'playbackPosition']);

const wrapper = ref(null)
const showOverview = ref(false);

const releasedOnStr = computed(() => {
  if (!props.episode) return null;
  if (!props.episode.released_on) return null;
  const date = new Date(props.episode.released_on * 1000);
  return date.getUTCFullYear() + '-'
    + ((date.getUTCMonth() + 1) + '').padStart(2, '0') + '-'
    + (date.getUTCDate() + '').padStart(2, '0');
});

// scrollWrapperEl.scrollIntoView({behavior: behavior, block: 'nearest'});

watch(
  () => props.isSelected,
  (newVal) => {
    if (newVal) wrapper.value.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
);
</script>

<template>
  <div
    v-if="episode"
    class="relative px-6 py-4 my-6 text-left text-gray-900 transition duration-150 ease-in-out bg-white rounded-lg shadow-md"
    :class="{
      'ring-[6px] ring-green-400 ring-offset-[6px] ring-offset-slate-900': isSelected,
      'opacity-90': !isSelected,
    }"
    >
    <div v-if="episode.is_finished">
      Finished
    </div>
    <div v-else>
      <div class="text-xl font-semibold">
        <span v-if="episode.is_new" class="relative inline-block px-2 text-sm text-white bg-orange-700 rounded-full bottom-0.5 mr-2">
          NEW
        </span>
        S{{ (episode.season_num + '').padStart(2, '0') }}E{{ (episode.episode_num + '').padStart(2, '0') }}
        {{ episode.name }}
      </div>
      <div class="mt-1 overflow-hidden whitespace-nowrap text-ellipsis">
        <span class="mr-4 font-semibold">
          {{ playbackPosition ? playbackPosition : '--' }} / {{ episode.duration }}
        </span>
        <span class="text-gray-600" :title="episode.pathname">
          {{ episode.filename }}
        </span>
      </div>
      <div class="flex items-start max-w-full mt-1 gap-x-2">
        <div :class="{ 'whitespace-nowrap text-ellipsis overflow-hidden': !showOverview }">
          <span class="mr-1 text-slate-600">
            [{{ releasedOnStr ? releasedOnStr : '????-??-??' }}]
          </span>
          <span v-if="episode.overview">
            {{ episode.overview }}
          </span>
        </div>
        <button v-show="episode.overview" type="button" class="flex items-center py-1 ml-auto -my-1 text-slate-600" @click.stop="showOverview = !showOverview">
          <span v-if="showOverview">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="relative inline-block w-4 h-4 bottom-0.5">
              <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
            </svg>
          </span>
          <span v-if="!showOverview">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="relative inline-block w-4 h-4 bottom-0.5">
              <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
          </span>
          <span>summary</span>
        </button>
      </div>
    </div>
    <div class="absolute left-0 right-0 opacity-0 pointer-events-none -top-10 -bottom-10 -z-10" ref="wrapper"></div>
  </div>
</template>