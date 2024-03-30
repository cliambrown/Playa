<script setup>
import { computed } from 'vue';
import { store } from '../store';

const props = defineProps(['movie', 'isSelected']);

const playbackPosition = computed(() => {
  if (
    !store.playback_positions.hasOwnProperty(props.movie.filename)
  ) {
    return '--';
  }
  return store.playback_positions[props.movie.filename];
});
</script>

<template>
    <button type="button" @click="store.home.selected_item = movie" class="text-left">
      <div>
        <span v-show="isSelected">
          ✔
        </span>
        {{ movie.name }}
      </div>
      <div>
        {{ playbackPosition }} / {{ movie.duration }}
      </div>
    </button>
  </template>