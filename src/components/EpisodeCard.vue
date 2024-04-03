<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { TransitionExpand } from '@morev/vue-transitions';
import { store } from '../store.js'
import { useGet } from '../helpers';
import TextareaWithLabel from '../components/TextareaWithLabel.vue';

const props = defineProps(['episode', 'isSelected', 'playbackPosition']);

let updateTimeoutId = null;
let updateMsgTimoutId = null;

const wrapper = ref(null);
const showOverview = ref(false);
const showEdit = ref(false);

const releasedOnStr = computed(() => {
  if (!props.episode) return null;
  if (!props.episode.released_on) return null;
  const date = new Date(props.episode.released_on * 1000);
  return date.getUTCFullYear() + '-'
    + ((date.getUTCMonth() + 1) + '').padStart(2, '0') + '-'
    + (date.getUTCDate() + '').padStart(2, '0');
});

function scrollIntoView() {
  if (props.isSelected) {
    wrapper.value.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
}

onMounted(async () => {
  await nextTick();
  window.setTimeout(() => {
    scrollIntoView();
  }, 200);
});

watch(
  () => props.isSelected,
  (newVal) => scrollIntoView()
);

watch(showEdit, async (newVal) => {
  if (newVal) {
    await nextTick();
    window.setTimeout(() => {
      scrollIntoView();
    }, 200);
  }
});

async function handleUpdate() {
  if (!store.loaded_from_db) return false;
  window.clearTimeout(updateTimeoutId);
  window.clearTimeout(updateMsgTimoutId);
  store.loading_msg = 'Waiting...'
  updateTimeoutId = window.setTimeout(async () => {
    store.loading_msg = 'Saving Episode...'
    const response = await props.episode.saveToDB();
    if (parseInt(useGet(response, 'rowsAffected'))) {
      store.loading_msg = 'Episode saved';
      updateMsgTimoutId = window.setTimeout(() => {
        store.loading_msg = ''
      }, 5000);
    }
  }, 500);
}

watch(
  () => props.episode ? '' + props.episode.name + props.episode.overview : null,
  (newVal) => {
    if (props.episode) {
      props.episode.setSearchableText();
      handleUpdate();
    }
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
      [Finished]
    </div>
    <div v-else>
      
      <div class="flex items-center gap-4">
        <div class="text-xl font-semibold">
          <span v-if="episode.is_new" class="relative inline-block px-2 text-sm text-white bg-orange-700 rounded-full bottom-0.5 mr-2">
            NEW
          </span>
          <span v-if="episode.is_updated_from_tvdb" class="relative inline-block px-2 text-sm text-white bg-teal-700 rounded-full bottom-0.5 mr-2">
            UPDATED
          </span>
          S{{ (episode.season_num + '').padStart(2, '0') }}E{{ (episode.episode_num + '').padStart(2, '0') }}
          {{ episode.name }}
        </div>
        <Button :variant="showEdit ? 'gray' : 'action-secondary'" class="ml-auto" @click="showEdit = !showEdit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 -mx-1">
            <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
          </svg>
        </Button>
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
      
      <TransitionExpand>
        <div v-show="showEdit" class="py-4">
          
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
          
          <TextareaWithLabel class="mt-4" :isDark="false" :id="`episode-${episode.id}-overview`" v-model="episode.overview" :readonly="store.loading">
            Overview
          </TextareaWithLabel>
          
        </div>
      </TransitionExpand>
      
    </div>
    <div class="absolute left-0 right-0 opacity-0 pointer-events-none -top-10 -bottom-10 -z-10" ref="wrapper"></div>
  </div>
</template>