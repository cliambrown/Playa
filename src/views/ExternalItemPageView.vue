<script setup>
import { computed, ref, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { open } from '@tauri-apps/api/shell';
import { TransitionExpand } from '@morev/vue-transitions';
import { store } from '../store.js';
import { ExternalItem } from '../classes/ExternalItem';
import { useGet, useMinutesToTimeStr } from '../helpers';
import { searchTvdb, getMovieRuntime, getEpisodes } from '../tvdb';
import ExternalItemEpisodeCard from '../components/ExternalItemEpisodeCard.vue';
import TvdbMatches from '../components/TvdbMatches.vue';
import ArtworkEdit from '../components/ArtworkEdit.vue';

let itemID = null;
if (store.route.name === 'createExternalItemShow') {
  store.new_external_item = new ExternalItem({is_new: true, type: 'Show'});
} else if (store.route.name === 'createExternalItemMovie') {
  store.new_external_item = new ExternalItem({is_new: true, type: 'Movie'});
} else if (store.route.name === 'externalItem') {
  itemID = store.route.params.id;
}

let updateTimeoutId = null;
let updateMsgTimoutId = null;

const showEdit = ref(!itemID);
const showMatches = ref(true);
const filterStr = ref('');
const filterStrDebounced = ref('');

const item = computed(() => {
  return itemID
    ? store.external_items[itemID]
    : store.new_external_item;
});

const artworkAssetUrl = computed(() => {
  return (store.artworks_dir_url && item.value && item.value.artwork_filename)
    ? store.artworks_dir_url + item.value.artwork_filename
    : (item.value.type === 'Show'
      ? '/assets/blank_banner.jpg'
      : '/assets/blank_poster.jpg');
});

async function handleUpdate() {
  if (!store.loaded_from_db) return false;
  window.clearTimeout(updateTimeoutId);
  window.clearTimeout(updateMsgTimoutId);
  store.loading_msg = 'Waiting...';
  updateTimeoutId = window.setTimeout(async () => {
    store.loading_msg = 'Saving Item...';
    const response = await item.value.saveToDB();
    if (parseInt(useGet(response, 'rowsAffected'))) {
      store.loading_msg = 'Item saved';
      updateMsgTimoutId = window.setTimeout(() => {
        store.loading_msg = '';
      }, 5000);
    }
  }, 500);
}

watch(
  () => (item.value && item.value.id),
  (newVal, oldVal) => {
    const itemID = item.value.id;
    if (itemID && !store.external_item_ids.includes(itemID)) {
      store.external_items[itemID] = item;
      store.external_item_ids.push(itemID);
      if (item.value.type === 'Show')
        store.home_unfinished_showtype_items.push(item.value);
      else
        store.home_movietype_items.push(item.value);
    }
  }
)

watch(
  () => item.value ? item.value.name : null,
  (newName) => {
    if (item.value) {
      item.value.setName(newName);
      handleUpdate();
    }
  }
)

watch(
  () => item.value ? item.value.current_episode_id : null,
  (newName) => {
    if (item.value) {
      item.value.updateCurrentEpInDB();
    }
  }
)

function openTvdbSlug(slug) {
  if (!slug) return false;
  open(`https://www.thetvdb.com/${item.value.type === 'Show' ? 'series' : 'movies'}/${slug}`);
}

async function searchItemInTvdb() {
  if (!item.value || !item.value.name) return false;
  const matches = await searchTvdb(store, item.value.name, item.value.type);
  if (!matches || !Array.isArray(matches)) return false;
  item.value.tvdb_matches = matches.slice(0, 10);
  showMatches.value = true;
}

async function selectTvdbMatch(match) {
  item.value.name = match.name;
  item.value.tvdb_id = match.tvdb_id;
  item.value.tvdb_slug = match.slug;
  let runtime = await getMovieRuntime(store, match.tvdb_id);
  item.value.duration = useMinutesToTimeStr(runtime);
  handleUpdate();
}

function updateFilterStr(newVal) {
  window.clearTimeout(updateFilterStrTimeoutId);
  updateFilterStrTimeoutId = window.setTimeout(() => {
    filterStrDebounced.value = useAlphaName(newVal);
  }, 500);
}
watch(filterStr, newVal => updateFilterStr(newVal));

function toggleArchived() {
  item.value.is_archived = item.value.is_archived ? 0 : 1;
  handleUpdate();
  if (item.value.type === 'Show') store.sortShowtypeLists();
  else store.sortMovietypeLists();
}

async function updateEpisodesFromTvdb() {
  if (!item.value || !item.value.tvdb_id) return false;
  const tvdbEpisodes = await getEpisodes(store, item.value.tvdb_id);
  if (!tvdbEpisodes) return false;
  store.loading_msg = '';
  let addedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let foundEpisodeIDs = [];
  for (const tvdbEpisode of tvdbEpisodes) {
    let seasonNum = parseInt(tvdbEpisode.seasonNumber);
    if (isNaN(seasonNum) || seasonNum < 1) continue;
    let episodeNum = parseInt(tvdbEpisode.number);
    if (isNaN(episodeNum)) continue;
    tvdbEpisode.season_num = seasonNum;
    tvdbEpisode.episode_num = episodeNum;
    let episode = await item.value.episodeFromSeasonEp(tvdbEpisode, true);
    const origName = episode.name;
    const origOverview = episode.overview;
    const origReleasedOn = episode.released_on;
    const origDuration = episode.duration;
    const aired = tvdbEpisode.aired;
    if (aired && typeof aired === 'string' && /^[\d]{4}-[\d]{2}-[\d]{2}$/.test(aired)) {
      const [y, m, d] = aired.split('-');
      const date = new Date(y, (m-1), d);
      episode.released_on = date.getTime() / 1000;
    }
    episode.name = useGet(tvdbEpisode, 'name');
    episode.overview = useGet(tvdbEpisode, 'overview');
    episode.duration = useMinutesToTimeStr(useGet(tvdbEpisode, 'runtime'));
    if (episode.is_new) {
      addedCount++;
    } else if (
      origName !== episode.name
      || origOverview !== episode.overview
      || origReleasedOn !== episode.released_on
      || origDuration !== episode.duration
    ) {
      updatedCount++;
      episode.is_updated_from_tvdb = true;
    }
    episode.saveToDB();
    foundEpisodeIDs.push(episode.id);
  }
  for (const episodeID of item.value.episode_ids) {
    if (!foundEpisodeIDs.includes(episodeID)) {
      item.value.episodes[episodeID].delete();
    }
  }
  item.value.sortEpisodes();
  item.value.setCurrentEpToNewEp();
  store.loading_msg = `${addedCount} episode${addedCount == 1 ? '' : 's'} added, ${updatedCount} updated`;
}

async function deleteItem() {
  if (!item.value || !item.value.id) return false;
  const confirmed = await confirm('Are you sure you want to delete this item?', { title: 'Playa - Delete Item', type: 'warning' });
  if (!confirmed) return false;
  await item.value.delete();
  store.loading_msg = 'Item deleted';
  store.router.push({ name: 'home' });
}

async function replaceArtwork(newFilename) {
  if (newFilename) item.value.artwork_filename = newFilename;
  handleUpdate();
}

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      if (item.value.type === 'Show') {
        event.preventDefault();
        item.value.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev');
      }
      break;
    case ' ':
      event.preventDefault();
      item.value.play()
      break;
  }
  return true;
}

onBeforeMount(() => {
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  
  <div
    v-if="!!item"
    class="w-full px-4 pt-8 grow"
    :class="{
      'flex flex-col max-w-5xl max-h-full mx-auto': item.type === 'Show',
      'overflow-y-auto pb-20': item.type === 'Movie'
    }"
    >
    
    <div
      :class="{
        'px-12 shrink-0': item.type === 'Show',
        'w-full max-w-5xl mx-auto': item.type === 'Movie'
      }"
      >
      
      <div
        class="flex items-center justify-center bg-gray-700"
        :class="{
          'min-h-32': item.type === 'Show',
          'min-h-56': item.type === 'Movie'
        }"
        >
        <img :src="artworkAssetUrl" :class="{'max-w-80': item.type === 'Movie'}">
      </div>
      
      <div class="flex items-center mt-4 gap-x-4">
        
        <h2 class="text-2xl text-slate-200 grow">
          {{ item.id ? item.name : 'New Item' }}
        </h2>
        
        <Button variant="link" @click="openTvdbSlug(item.tvdb_slug)" :disabled="!item.tvdb_slug">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M12 5H4v4h8V5Z" />
            <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
          </svg>
          TVDB
        </Button>
        
        <Button variant="archive" @click="toggleArchived" :disabled="store.loading">
          <svg v-if="item.is_archived" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" />
            <path fill-rule="evenodd" d="M13 6H3v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6ZM5.72 7.47a.75.75 0 0 1 1.06 0L8 8.69l1.22-1.22a.75.75 0 1 1 1.06 1.06L9.06 9.75l1.22 1.22a.75.75 0 1 1-1.06 1.06L8 10.81l-1.22 1.22a.75.75 0 0 1-1.06-1.06l1.22-1.22-1.22-1.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
          <span v-if="item.is_archived">
            Unarchive
          </span>
          <svg v-if="!item.is_archived" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M3 2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3Z" />
            <path fill-rule="evenodd" d="M3 6h10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm3 2.75A.75.75 0 0 1 6.75 8h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 8.75Z" clip-rule="evenodd" />
          </svg>
          <span v-if="!item.is_archived">
            Archive
          </span>
        </Button>
        
        <Button variant="delete" :disabled="store.loading || !item.id" @click="deleteItem">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clip-rule="evenodd" />
          </svg>
          Delete
        </Button>
        
        <Button variant="secondary" @click="showEdit = !showEdit">
          <svg v-show="!showEdit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" clip-rule="evenodd" />
          </svg>
          <svg v-show="showEdit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
          Edit
        </Button>
        
      </div>
      
      <TransitionExpand>
        <form v-show="showEdit || item.type === 'Movie'" action="" method="get" @submit.prevent class="pt-1 pb-4" autocapitalize="false" autocomplete="off">
          
          <InputWithLabel class="mt-4" id="url" v-model="item.url" :readonly="store.loading" @input="handleUpdate">
            URL
          </InputWithLabel>
          
          <div v-if="item.id">
              
            <InputWithLabel class="mt-4" id="name" v-model="item.name" :readonly="store.loading">
              Name
              <template v-slot:afterInput>
                <Button variant="secondary" @click="searchItemInTvdb">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
                  </svg>
                  Search TVDB
                </Button>
              </template>
            </InputWithLabel>
            
            <TvdbMatches
              :matches="item.tvdb_matches"
              class="mt-4"
              :showMatches="showMatches"
              @toggle-show-matches="showMatches = !showMatches"
              @match-select="(match) => selectTvdbMatch(match)"
              @tvdb-link-click="(matchSlug) => openTvdbSlug(matchSlug)"
              >
            </TvdbMatches>
            
            <div class="flex flex-wrap gap-8 mt-4">
              
              <InputWithLabel class="max-w-40" id="tvdb_id" v-model="item.tvdb_id" :readonly="store.loading" @input="handleUpdate">
                TVDB ID
              </InputWithLabel>
            
              <InputWithLabel class="max-w-72" id="tvdb_slug" v-model="item.tvdb_slug" :readonly="store.loading" @input="handleUpdate">
                TVDB Slug
              </InputWithLabel>
              
              <InputWithLabel v-if="item.type === 'Movie'" class="max-w-72" id="duration" v-model="item.duration" :readonly="store.loading" @input="handleUpdate">
                Duration
              </InputWithLabel>
            
              <InputWithLabel :datepicker="true" id="last_watched_at" v-model="item.last_watched_at" :readonly="store.loading" @input="handleUpdate">
                Last Watched At
              </InputWithLabel>
              
            </div>
            
            <ArtworkEdit
              class="mt-4"
              :tvdbID="item.tvdb_id"
              :type="item.type"
              :itemClass="item.class"
              :itemID="item.id"
              :artworkFilename="item.artwork_filename"
              @replace-artwork="(newFilename) => replaceArtwork(newFilename)"
              >
            </ArtworkEdit>
            
            </div>
          
        </form>
      </TransitionExpand>
      
      <div v-if="item.id" class="flex items-center mt-12 gap-x-4">
        
        <h3 class="text-xl text-slate-200">
          {{ item.episode_ids.length }}
          Episodes
        </h3>
        
        <Button @click="updateEpisodesFromTvdb" :disabled="!item.tvdb_id || store.loading" class="mr-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M12 5H4v4h8V5Z" />
            <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
          </svg>
          Update from TVDB
        </Button>
        
        <Button variant="tertiary" @click="item.episodeNav('first')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 -mx-1">
            <path fill-rule="evenodd" d="M11.47 7.72a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 0 1-1.06-1.06l7.5-7.5Z" clip-rule="evenodd" />
          </svg>
        </Button>
        
        <Button variant="tertiary" @click="item.episodeNav('random')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 -mx-1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </Button>
        
        <Button variant="tertiary" @click="item.episodeNav('finished')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 -mx-1">
            <path fill-rule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clip-rule="evenodd" />
          </svg>
        </Button>
        
        <InputWithLabel :with-label="false" :is-search="true" v-model="filterStr"></InputWithLabel>
        
      </div>
      
    </div>
    
    <div v-if="item.type === 'Show' && item.id" class="pl-12 pr-8 mt-4 overflow-y-scroll grow min-h-40">
      
      <ExternalItemEpisodeCard
        v-if="!item.episode_ids.length"
        :episode="{is_unfinished: true}"
        :is-selected="item.current_episode_id === -1"
        @click="item.current_episode_id = -1"
        :class="{
          'hidden': !!filterStrDebounced
        }"
        >
      </ExternalItemEpisodeCard>
      
      <ExternalItemEpisodeCard
        v-for="episodeID in item.episode_ids"
        :episode="item.episodes[episodeID]"
        :is-selected="item.current_episode_id == episodeID"
        @click="item.current_episode_id = episodeID"
        :class="{
          'hidden': !item.episodes[episodeID].searchable_text.includes(filterStrDebounced)
        }"
        >
      </ExternalItemEpisodeCard>
      
      <ExternalItemEpisodeCard
        :episode="{is_finished: true}"
        :is-selected="item.current_episode_id === null"
        :playback-position="null"
        @click="item.current_episode_id = null"
        :class="{ 'hidden': !!filterStrDebounced }"
        >
      </ExternalItemEpisodeCard>
      
    </div>
    
  </div>
  
</template>