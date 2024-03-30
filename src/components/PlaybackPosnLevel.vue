<script setup>
import CheckboxWithLabel from '../components/CheckboxWithLabel.vue';
import { store } from '../store.js';

const props = defineProps(['level']);

function handleCheckboxChange(event, level) {
  let checked = event.target.checked;
  level.set_all_checked(checked);
}
</script>

<template>
  
  <div class="mt-2 text-yellow-300">
    <CheckboxWithLabel :input_id="'level-'+level.slug" @checkbox-change="handleCheckboxChange($event, level)" v-model="level.checked" :disabled="store.loading">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
        <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H12.5A1.5 1.5 0 0 1 14 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9c-.546 0-1.059.146-1.5.401V3.5ZM2 9.5v3A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 12.5 8h-9A1.5 1.5 0 0 0 2 9.5Z" />
      </svg>
      <span>
        {{ level.name }}
      </span>
    </CheckboxWithLabel>
  </div>
  
  <div class="ml-6">
    
    <div v-for="levelName in level.sublevel_names">
      <PlaybackPosnLevel :level="level.sublevels[levelName]" />
    </div>
    
    <div class="mt-1" v-for="entry in level.entries">
      <CheckboxWithLabel :input_id="'entry-'+entry.slug" v-model="entry.checked" :disabled="store.loading">
        <div class="break-all">
          {{ entry.media_filename }}
        </div>
      </CheckboxWithLabel>
    </div>
    <div class="mt-1 text-gray-400" v-if="!level.entries.length && !level.sublevel_names.length">
      [no entries]
    </div>
    
  </div>
  
</template>