<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { store } from '../store.js'
import { useGetProp } from '../helpers';
import TextareaWithLabel from '../components/TextareaWithLabel.vue';
import CheckboxWithLabel from '../components/CheckboxWithLabel.vue';
import Badge from '../components/Badge.vue';
import UnplayedIcon from '../icons/UnplayedIcon.vue';
import PlayedIcon from '../icons/PlayedIcon.vue';
import EditIcon from '../icons/EditIcon.vue';
import ExpandIcon from '../icons/ExpandIcon.vue';
import CollapseIcon from '../icons/CollapseIcon.vue';
import FileIcon from '../icons/FileIcon.vue';
import GlobeIcon from '../icons/GlobeIcon.vue';

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
const expanded = ref(false);
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
      <UnplayedIcon />
      Unfinished
    </div>
    
    <div v-else-if="episodeID === null" class="flex items-center gap-2 px-6 py-4 bg-white rounded-lg">
      <PlayedIcon class="text-green-700" />
      <span>
        Finished
      </span>
    </div>
    
    <div v-else-if="!!episode" class="bg-white rounded-lg">
      
      <div class="px-6 py-4">
        
        <div class="flex items-start gap-4">
          
          <div class="text-xl font-semibold">
            <Badge v-if="episode.is_new" class="relative bottom-0.5 mr-2" variant="new">
              New
            </Badge>
            <Badge v-if="episode.is_updated" class="relative bottom-0.5 mr-2" variant="updated">
              Updated
            </Badge>
            <Badge v-if="episode.is_season_finale && !episode.is_series_finale" class="relative bottom-0.5 mr-2" variant="seasonfinale">
              Season Finale
            </Badge>
            <Badge v-if="episode.is_series_finale" class="relative bottom-0.5 mr-2" variant="seriesfinale">
              Series Finale
            </Badge>
            <span v-if="item.source !== 'ytPlaylist'" class="mr-2">
              {{ episode.sXXeXX }}
            </span>
            <span>{{ episode.name }}</span>
          </div>
          
          <Button variant="tertiary-light" :square="true" class="ml-auto -mx-2 -mt-2" @click.stop="showEdit = !showEdit">
            <EditIcon />
          </Button>
          
          <Button variant="tertiary-light" :square="true" class="-mx-2 -mt-2" @click.stop="expanded = !expanded">
            <CollapseIcon v-if="expanded" />
            <ExpandIcon v-else />
          </Button>
          
        </div>
        
        <div class="mt-1" :class="{ 'whitespace-nowrap text-ellipsis overflow-hidden': !expanded }">
          
          <span>
            <template v-if="playbackPosition">
                {{ playbackPosition }} /
            </template>
            {{ episode.duration ? episode.duration : '?' }}
          </span>
          
          <template v-if="episode.overview || episode.filename || episode.url">
            <span class="mx-2">—</span>
            
            <template v-if="episode.overview">
              {{ episode.overview }}
              <span v-if="releasedOnStr" class="whitespace-nowrap">
                (Aired {{ releasedOnStr }})
              </span>
            </template>
            <template v-else-if="episode.filename">
              {{ episode.filename }}
            </template>
            <template v-else>
              {{ episode.url }}
            </template>
          </template>
          
          <div v-show="expanded && episode.overview && (episode.filename || episode.url)" class="mt-1 text-slate-600">
            <template v-if="episode.filename">
              <FileIcon class="relative inline-block mr-1 text-slate-600 bottom-0.5" />
              {{ episode.filename }}
            </template>
            <template v-else>
              <GlobeIcon class="relative inline-block mr-1 text-slate-600 bottom-0.5" />
              {{ episode.url }}
            </template>
          </div>
          
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
        
        <div class="flex flex-wrap gap-8 mt-4">
          
          <CheckboxWithLabel :input_id="`episode-${episode.id}-is_season_finale`" @checkbox-change="handleUpdate" v-model="episode.is_season_finale" :readonly="store.loading" @input="handleUpdate" :trueValue="1" :falseValue="0">Season Finale</CheckboxWithLabel>
          
          <CheckboxWithLabel :input_id="`episode-${episode.id}-is_series_finale`" @checkbox-change="handleUpdate" v-model="episode.is_series_finale" :readonly="store.loading" @input="handleUpdate" :trueValue="1" :falseValue="0">Series Finale</CheckboxWithLabel>
          
        </div>
        
        <TextareaWithLabel class="mt-4" :isDark="false" :id="`episode-${episode.id}-overview`" v-model="episode.overview" :readonly="store.loading" @input="handleUpdate">
          Overview
        </TextareaWithLabel>
        
      </div>
      
    </div>
    
    <div class="absolute left-0 right-0 opacity-0 pointer-events-none -top-10 -bottom-10 -z-10" ref="wrapper"></div>
    
  </div>
</template>