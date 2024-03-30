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

const playbackPosition = computed(() => {
  if (
    !props.show.current_episode_id
    || !store.playback_positions.hasOwnProperty(currentEp.value.filename)
  ) {
    return '--';
  }
  return store.playback_positions[currentEp.value.filename];
});
</script>

<template>
  <button type="button" @click="store.home.selected_item = show" class="text-left">
    <div>
      <span v-show="isSelected">
        ✔
      </span>
      {{ show.name }}
    </div>
    <div>
      {{ (show.episode_ids.length - currentEpIndex) }} unwatched / 
      {{ show.episode_ids.length }} total
    </div>
    <div v-if="currentEp">
      <div>
        S{{ (currentEp.season_num + '').padStart(2, '0') }}E{{ (currentEp.episode_num + '').padStart(2, '0') }}
        {{ currentEp.name }}
      </div>
      <div>
        {{ playbackPosition }} / {{ currentEp.duration }}
      </div>
      <div>
        <RouterLink :to="{ name: 'show', params: { id: show.id } }" @click.stop>Edit</RouterLink>
      </div>
    </div>
  </button>
</template>