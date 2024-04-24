<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { store } from '../store.js'
import { useGetProp } from '../helpers';
import TextareaWithLabel from '../components/TextareaWithLabel.vue';

const props = defineProps(['itemID', 'episodeID']);

const item = computed(() => store.items[props.itemID]);
const episode = computed(() => item.value ? item.value.episodes[props.episodeID] : null);
const isSelected = computed(() => {
  return item.value
    && item.value.current_episode_id == props.episodeID
});

const playbackPosition = computed(() => {
  let filename = useGetProp(episode.value, 'filename');
  if (!filename) return null;
  return useGetProp(store.playback_positions, filename, '--');
});

let updateTimeoutId = null;

const wrapper = ref(null);
const showOverview = ref(false);
const showEdit = ref(false);

const releasedOnStr = computed(() => {
  if (!episode.value || !episode.value.released_on) return '????-??-??';
  const date = new Date(episode.value.released_on * 1000);
  return date.getUTCFullYear() + '-'
    + ((date.getUTCMonth() + 1) + '').padStart(2, '0') + '-'
    + (date.getUTCDate() + '').padStart(2, '0');
});

function scrollIntoView() {
  if (isSelected.value && item.value && item.value.episode_ids.length && wrapper.value) {
    wrapper.value.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
}

onMounted(async () => {
  await nextTick();
  window.setTimeout(() => {
    scrollIntoView();
  }, 200);
});

watch(() => isSelected.value, (newVal) => scrollIntoView());

watch(showEdit, async (newVal) => {
  if (newVal) {
    await nextTick();
    window.setTimeout(() => {
      scrollIntoView();
    }, 200);
  }
});

async function handleUpdate() {
  window.clearTimeout(updateTimeoutId);
  store.loading_msg = 'Waiting...';
  updateTimeoutId = window.setTimeout(async () => {
    store.loading_msg = 'Saving Episode...';
    const response = await episode.value.saveToDB();
    if (parseInt(useGetProp(response, 'rowsAffected'))) {
      store.loading_msg = 'Episode saved';
    }
  }, 500);
}

watch(
  () => episode.value ? '' + episode.value.season_num + episode.value.episode_num : episode.value,
  (newVal, oldVal) => {
    if (oldVal === undefined) return false;
    episode.value.setSXXEXX();
  }
)

watch(
  () => episode.value ? '' + episode.value.name + episode.value.overview + episode.value.sXXeXX : episode.value,
  (newVal, oldVal) => {
    if (oldVal === undefined) return false;
    episode.value.setSearchableText();
  }
)

</script>

<template>
  <div
    class="relative my-6 text-left text-gray-900 transition duration-150 ease-in-out rounded-lg shadow-md"
    :class="{
      'ring-[6px] ring-green-400 ring-offset-[6px] ring-offset-gray-900': isSelected
    }"
    >
    
    <div v-if="episodeID === 0" class="flex items-center gap-2 px-6 py-4 bg-white rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
        <path d="M2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
      </svg>
      Unfinished
    </div>
    
    <div v-else-if="episodeID === null" class="flex items-center gap-2 px-6 py-4 bg-white rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-green-600">
        <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clip-rule="evenodd" />
      </svg>
      <span>
        Finished
      </span>
    </div>
    
    <div v-else-if="!!episode" class="bg-white rounded-lg">
      
      <div class="px-6 py-4">
        
        <div class="flex items-center gap-4">
          <div class="text-xl font-semibold">
            <span v-if="episode.is_new" class="relative inline-block px-2 text-sm text-white bg-orange-700 rounded-full bottom-0.5 mr-2">
              NEW
            </span>
            <span v-if="episode.is_updated" class="relative inline-block px-2 text-sm text-white bg-teal-700 rounded-full bottom-0.5 mr-2">
              UPDATED
            </span>
            <span v-if="item.source !== 'ytPlaylist'">
              {{ episode.sXXeXX }}
            </span>
            {{ episode.name }}
          </div>
          <Button variant="tertiary-light" class="ml-auto -my-1" @click.stop="showEdit = !showEdit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 my-1">
              <path fill-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" clip-rule="evenodd" />
            </svg>
          </Button>
        </div>
        
        <div class="mt-1 overflow-hidden whitespace-nowrap text-ellipsis">
          <span class="inline-flex items-center gap-2 mr-4 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-gray-400">
              <path fill-rule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clip-rule="evenodd" />
            </svg>
            <span>
              <span v-if="playbackPosition">
                {{ playbackPosition }} /
              </span>
              {{ episode.duration ? episode.duration : '?' }}
            </span>
          </span>
          <span v-if="episode.filename" class="inline-flex items-center gap-2 text-gray-600" :title="episode.pathname">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-gray-400">
              <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h4.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12a1.5 1.5 0 0 1 .439 1.061V12.5A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
            </svg>
            <span>
              {{ episode.filename }}
            </span>
          </span>
          <span v-else-if="episode.url" class="inline-flex items-center gap-2 text-gray-600" :title="episode.url">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-gray-400">
              <path fill-rule="evenodd" d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.828.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
              <path fill-rule="evenodd" d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.828.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
            </svg>
            {{ episode.url }}
          </span>
        </div>
        
        <div class="flex items-baseline max-w-full mt-1 gap-x-2">
          <div :class="{ 'whitespace-nowrap text-ellipsis overflow-hidden': !showOverview }">
            <span class="inline-flex items-baseline gap-2 text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="relative w-4 h-4 top-0.5 text-gray-400">
                <path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 6a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-7Z" clip-rule="evenodd" />
              </svg>
              {{ releasedOnStr }}
            </span>
            <span v-if="episode.overview" class="ml-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 inline-block relative bottom-0.5 text-gray-400 mr-1">
                <path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clip-rule="evenodd" />
              </svg>
              {{ episode.overview }}
            </span>
          </div>
          <button v-show="episode.overview" type="button" class="flex items-center py-1 ml-auto -my-1 text-gray-600" @click.stop="showOverview = !showOverview">
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
            <span>overview</span>
          </button>
        </div>
        
      </div>
      
      <div v-show="showEdit" class="px-6 pt-4 pb-6 bg-gray-100 rounded-b-lg" @click.stop>
        
        <InputWithLabel class="w-full" :isDark="false" :id="`episode-${episode.id}-name`" v-model="episode.name" :readonly="store.loading">
          Name
        </InputWithLabel>
        
        <div class="flex flex-wrap gap-8 mt-4">
          
          <InputWithLabel v-if="item.source !== 'ytPlaylist'" class="max-w-24" :isDark="false" :id="`episode-${episode.id}-season_num`" v-model="episode.season_num" :readonly="store.loading" @input="handleUpdate">
            Season
          </InputWithLabel>
        
          <InputWithLabel v-if="item.source !== 'ytPlaylist'" class="max-w-24" :isDark="false" :id="`episode-${episode.id}-episode_num`" v-model="episode.episode_num" :readonly="store.loading" @input="handleUpdate">
            Episode
          </InputWithLabel>
        
          <InputWithLabel :isDark="false" :datepicker="true" :enableTimePicker="false" :id="`episode-${episode.id}-released_on`" v-model="episode.released_on" :readonly="store.loading" @input="handleUpdate">
            Release Date
          </InputWithLabel>
        
          <InputWithLabel class="max-w-24" :isDark="false" :id="`episode-${episode.id}-duration`" v-model="episode.duration" :readonly="store.loading" @input="handleUpdate">
            Duration
          </InputWithLabel>
          
        </div>
        
        <TextareaWithLabel class="mt-4" :isDark="false" :id="`episode-${episode.id}-overview`" v-model="episode.overview" :readonly="store.loading" @input="handleUpdate">
          Overview
        </TextareaWithLabel>
        
      </div>
      
    </div>
    
    <div class="absolute left-0 right-0 opacity-0 pointer-events-none -top-10 -bottom-10 -z-10" ref="wrapper"></div>
    
  </div>
</template>