<script setup>
import { store } from '../store.js';
import CheckboxWithLabel from '../components/CheckboxWithLabel.vue';
import FolderIcon from '../icons/FolderIcon.vue';

const props = defineProps(['level']);

function handleCheckboxChange(event, level) {
  let checked = event.target.checked;
  level.set_all_checked(checked);
}
</script>

<template>
  
  <div class="mt-2 text-yellow-300">
    <CheckboxWithLabel :input_id="'level-'+level.slug" @checkbox-change="handleCheckboxChange($event, level)" v-model="level.checked" :disabled="store.loading">
      <FolderIcon />
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