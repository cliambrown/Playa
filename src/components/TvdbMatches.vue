<script setup>
import { ref } from 'vue';
import { TransitionExpand } from '@morev/vue-transitions';
const props = defineProps(['matches','showMatches']);
defineEmits(['matchSelect', 'tvdbLinkClick']);
const showMatches = ref(true);
</script>

<template>
  
  <div v-if="matches.length">
    
    <div class="flex items-center gap-6">
      <div class="text-sm font-medium uppercase text-slate-200">
        Search results ({{ matches.length }})
      </div>
      <button type="button" @click="showMatches = !showMatches" class="text-white">
        <span v-if="showMatches" class="inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
          </svg>
          hide
        </span>
        <span v-if="!showMatches" class="inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 ">
            <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
          show
        </span>
      </button>
    </div>
    
    <TransitionExpand>
      <ul v-show="showMatches" class="p-1">
        <li v-for="match in matches" class="flex flex-wrap gap-2 my-2">
          <Button variant="secondary" @click="$emit('matchSelect', match)" whitespace="normal">
            {{ match.name }}
            ({{ match.country }} {{ match.year }})
          </Button>
          <Button variant="link" @click="$emit('tvdbLinkClick', match.slug)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path d="M12 5H4v4h8V5Z" />
              <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
            </svg>
            <span>TVDB</span>
          </Button>
        </li>
      </ul>
    </TransitionExpand>
    
  </div>
  
</template>