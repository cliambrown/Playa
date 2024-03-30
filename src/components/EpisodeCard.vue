<script setup>
import { computed } from 'vue';
import { store } from '../store.js'

const props = defineProps(['episode', 'isSelected', 'playbackPosition']);

const releasedOnStr = computed(() => {
  if (!props.episode) return null;
  if (!props.episode.released_on) return null;
  const date = new Date(props.episode.released_on * 1000);
  return date.getUTCFullYear() + '-'
    + (date.getUTCMonth() + '').padStart(2, '0') + '-'
    + (date.getUTCDate() + '').padStart(2, '0');
});

</script>

<template>
  <div v-if="episode" class="my-6">
    <div>
      S{{ (episode.season_num + '').padStart(2, '0') }}E{{ (episode.episode_num + '').padStart(2, '0') }}
      {{ episode.name }}
    </div>
    <div>
      {{ playbackPosition ? playbackPosition : '--' }} / {{ episode.duration }}
      {{ episode.filename }}
    </div>
    <div>
      {{ releasedOnStr ? releasedOnStr : '????-??-??' }}
      {{ episode.overview }}
    </div>
  </div>
</template>