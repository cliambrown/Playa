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
  if (isSelected.value && item.value && item.value.episode_ids.length) {
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
      'ring-[6px] ring-green-400 ring-offset-[6px] ring-offset-slate-900': isSelected
    }"
    >
    
    <div v-if="episodeID === 0" class="px-6 py-4 bg-white rounded-lg">
      [Unfinished]
    </div>
    
    <div v-else-if="episodeID === null" class="px-6 py-4 bg-white rounded-lg">
      [Finished]
    </div>
    
    <div v-else-if="!!episode" class="bg-white rounded-lg">
      
      <div class="px-6 py-4">
        
        <div class="flex items-center gap-4">
          <div class="text-xl font-semibold">
            <span v-if="episode.is_new" class="relative inline-block px-2 text-sm text-white bg-orange-700 rounded-full bottom-0.5 mr-2">
              NEW
            </span>
            <span v-if="episode.is_updated_from_tvdb" class="relative inline-block px-2 text-sm text-white bg-teal-700 rounded-full bottom-0.5 mr-2">
              UPDATED
            </span>
            {{ episode.sXXeXX }}
            {{ episode.name }}
          </div>
          <Button variant="tertiary-light" class="ml-auto -my-1" @click.stop="showEdit = !showEdit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 my-1">
              <path fill-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" clip-rule="evenodd" />
            </svg>
          </Button>
        </div>
        
        <div class="mt-1 overflow-hidden whitespace-nowrap text-ellipsis">
          <span class="mr-4 font-semibold">
            <span v-if="playbackPosition">
              {{ playbackPosition }} /
            </span>
            {{ episode.duration }}
          </span>
          <span v-if="episode.filename" class="text-gray-600" :title="episode.pathname">
            {{ episode.filename }}
          </span>
          <span v-else-if="episode.url" class="text-gray-600" :title="episode.url">
            {{ episode.url }}
          </span>
        </div>
        
        <div class="flex items-start max-w-full mt-1 gap-x-2">
          <div :class="{ 'whitespace-nowrap text-ellipsis overflow-hidden': !showOverview }">
            <span class="mr-1 text-slate-600">
              [{{ releasedOnStr }}]
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
            <span>overview</span>
          </button>
        </div>
        
      </div>
      
      <div v-show="showEdit" class="px-6 pt-4 pb-6 bg-gray-100 rounded-b-lg" @click.stop>
        
        <InputWithLabel class="w-full" :isDark="false" :id="`episode-${episode.id}-name`" v-model="episode.name" :readonly="store.loading">
          Name
        </InputWithLabel>
        
        <div class="flex flex-wrap gap-8 mt-4">
          
          <InputWithLabel class="max-w-24" :isDark="false" :id="`episode-${episode.id}-season_num`" v-model="episode.season_num" :readonly="store.loading" @input="handleUpdate">
            Season
          </InputWithLabel>
        
          <InputWithLabel class="max-w-24" :isDark="false" :id="`episode-${episode.id}-episode_num`" v-model="episode.episode_num" :readonly="store.loading" @input="handleUpdate">
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