<script setup>
import { computed, ref, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { open } from '@tauri-apps/api/shell';
import { save } from '@tauri-apps/api/dialog';
import { TransitionExpand } from '@morev/vue-transitions';
import { store } from '../store.js';
import { useGet, useOpenOrHomeDir, useAlphaName } from '../helpers';
import { searchTvdb, getEpisodes } from '../tvdb';
import EpisodeCard from '../components/EpisodeCard.vue';
import TvdbMatches from '../components/TvdbMatches.vue';
import ArtworkEdit from '../components/ArtworkEdit.vue';

let updateTimeoutId = null;
let updateMsgTimoutId = null;
let updateFilterStrTimeoutId = null;

const showEdit = ref(false);
const showMatches = ref(true);
const filterStr = ref('');
const filterStrDebounced = ref('');

const show = computed(() => store.shows[store.route.params.id]);

const artworkAssetUrl = computed(() => {
  return (store.artworks_dir_url && show.value && show.value.artwork_filename)
    ? store.artworks_dir_url + show.value.artwork_filename
    : '/assets/blank_banner.jpg';
});

async function handleUpdate() {
  if (!store.loaded_from_db) return false;
  window.clearTimeout(updateTimeoutId);
  window.clearTimeout(updateMsgTimoutId);
  store.loading_msg = 'Waiting...';
  updateTimeoutId = window.setTimeout(async () => {
    store.loading_msg = 'Saving Show...';
    const response = await show.value.saveToDB();
    if (parseInt(useGet(response, 'rowsAffected'))) {
      store.loading_msg = 'Show saved';
      updateMsgTimoutId = window.setTimeout(() => {
        store.loading_msg = '';
      }, 5000);
    }
  }, 500);
}

watch(
  () => show.value ? show.value.name : null,
  (newName) => {
    if (show.value) {
      show.value.setName(newName);
      handleUpdate();
    }
  }
)

function openTvdbSlug(slug) {
  if (slug) open('https://www.thetvdb.com/series/' + slug);
}

async function searchShowInTvdb() {
  if (!show.value || !show.value.name) return false;
  const matches = await searchTvdb(store, show.value.name, show.value.type);
  if (!matches || !Array.isArray(matches)) return false;
  show.value.tvdb_matches = matches.slice(0, 10);
  showMatches.value = true;
}

function selectTvdbMatch(match) {
  show.value.name = match.name;
  show.value.tvdb_id = match.tvdb_id;
  show.value.tvdb_slug = match.slug;
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
  show.value.is_archived = show.value.is_archived ? 0 : 1;
  handleUpdate();
  store.sortShowtypeLists();
}

async function updateEpisodesFromTvdb() {
  if (!show.value || !show.value.tvdb_id) return false;
  const tvdbEpisodes = await getEpisodes(store, show.value.tvdb_id);
  if (!tvdbEpisodes) return false;
  store.loading_msg = '';
  let updatedCount = 0;
  for (const episodeID of show.value.episode_ids) {
    let episode = show.value.episodes[episodeID];
    let seasonNum = parseInt(episode.season_num);
    if (isNaN(seasonNum)) continue;
    let episodeNum = parseInt(episode.episode_num);
    if (isNaN(episodeNum)) continue;
    for (const tvdbEpisode of tvdbEpisodes) {
      if (
        tvdbEpisode.seasonNumber === seasonNum
        && tvdbEpisode.number === episodeNum
      ) {
        const origName = episode.name;
        const origOverview = episode.overview;
        const origReleasedOn = episode.released_on;
        episode.name = tvdbEpisode.name;
        episode.overview = tvdbEpisode.overview;
        const aired = tvdbEpisode.aired;
        if (aired && typeof aired === 'string' && /^[\d]{4}-[\d]{2}-[\d]{2}$/.test(aired)) {
          const [y, m, d] = aired.split('-');
          const date = new Date(y, (m-1), d);
          episode.released_on = date.getTime() / 1000;
        }
        if (
          origName !== episode.name
          || origOverview !== episode.overview
          || origReleasedOn !== episode.released_on
        ) {
          updatedCount++;
          episode.is_updated_from_tvdb = true;
          episode.saveToDB();
        }
        break;
      }
    }
  }
  show.value.sortEpisodes();
  store.loading_msg = `${updatedCount} episode${updatedCount == 1 ? '' : 's'} updated`;
}

function replaceArtwork(newFilename) {
  if (newFilename) show.value.artwork_filename = newFilename;
  handleUpdate();
}

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      show.value.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev');
      break;
    case ' ':
      event.preventDefault();
      show.value.play()
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
  
  <div v-if="!!show" class="flex flex-col w-full max-w-5xl max-h-full px-4 pt-8 mx-auto grow">
    
    <div class="px-12 shrink-0">
      
      <div class="flex items-center justify-center bg-gray-700 min-h-32">
        <img :src="artworkAssetUrl">
      </div>
      
      <div class="flex items-center mt-4 gap-x-4">
        
        <h2 class="text-2xl text-slate-200 grow">
          {{ show.name }}
        </h2>
        
        <Button variant="link" @click="openTvdbSlug(show.tvdb_slug)" :disabled="!show.tvdb_slug">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M12 5H4v4h8V5Z" />
            <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
          </svg>
          TVDB
        </Button>
        
        <Button variant="link" @click="useOpenOrHomeDir(store.settings.tv_dir + '/' + show.dir_name)"  class="max-w-64">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
          </svg>
          <span class="overflow-hidden whitespace-nowrap text-ellipsis">
            Folder
          </span>
        </Button>
        
        <Button variant="archive" @click="toggleArchived" :disabled="store.loading">
          <svg v-if="show.is_archived" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" />
            <path fill-rule="evenodd" d="M13 6H3v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6ZM5.72 7.47a.75.75 0 0 1 1.06 0L8 8.69l1.22-1.22a.75.75 0 1 1 1.06 1.06L9.06 9.75l1.22 1.22a.75.75 0 1 1-1.06 1.06L8 10.81l-1.22 1.22a.75.75 0 0 1-1.06-1.06l1.22-1.22-1.22-1.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
          <span v-if="show.is_archived">
            Unarchive
          </span>
          <svg v-if="!show.is_archived" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M3 2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3Z" />
            <path fill-rule="evenodd" d="M3 6h10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm3 2.75A.75.75 0 0 1 6.75 8h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 8.75Z" clip-rule="evenodd" />
          </svg>
          <span v-if="!show.is_archived">
            Archive
          </span>
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
        <form action="" method="get" @submit.prevent v-show="showEdit" class="pt-1 pb-4" autocapitalize="false" autocomplete="off">
          
          <InputWithLabel class="mt-4" id="name" v-model="show.name" :readonly="store.loading">
            Name
            <template v-slot:afterInput>
              <Button variant="secondary" @click="searchShowInTvdb">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
                </svg>
                Search TVDB
              </Button>
            </template>
          </InputWithLabel>
          
          <TvdbMatches
            :matches="show.tvdb_matches"
            class="mt-4"
            :showMatches="showMatches"
            @toggle-show-matches="showMatches = !showMatches"
            @match-select="(match) => selectTvdbMatch(match)"
            @tvdb-link-click="(matchSlug) => openTvdbSlug(matchSlug)"
            >
          </TvdbMatches>
          
          <div class="flex flex-wrap gap-8 mt-4">
            
            <InputWithLabel class="max-w-40" id="tvdb_id" v-model="show.tvdb_id" :readonly="store.loading" @input="handleUpdate">
              TVDB ID
            </InputWithLabel>
          
            <InputWithLabel class="max-w-72" id="tvdb_slug" v-model="show.tvdb_slug" :readonly="store.loading" @input="handleUpdate">
              TVDB Slug
            </InputWithLabel>
          
            <InputWithLabel :datepicker="true" id="last_watched_at" v-model="show.last_watched_at" :readonly="store.loading" @input="handleUpdate">
              Last Watched At
            </InputWithLabel>
            
          </div>
          
          <ArtworkEdit
            class="mt-4"
            :tvdbID="show.tvdb_id"
            :type="show.type"
            :itemClass="show.class"
            :itemID="show.id"
            :artworkFilename="show.artwork_filename"
            @replace-artwork="(newFilename) => replaceArtwork(newFilename)"
            >
          </ArtworkEdit>
          
        </form>
      </TransitionExpand>
      
      <div class="flex items-center mt-12 gap-x-4">
        
        <h3 class="text-xl text-slate-200">
          {{ show.episode_ids.length }}
          Episodes
        </h3>
        
        <Button @click="updateEpisodesFromTvdb" :disabled="!show.tvdb_id || store.loading" class="mr-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M12 5H4v4h8V5Z" />
            <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
          </svg>
          Update from TVDB
        </Button>
        
        <Button variant="tertiary" @click="show.episodeNav('first')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 -mx-1">
            <path fill-rule="evenodd" d="M11.47 7.72a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 0 1-1.06-1.06l7.5-7.5Z" clip-rule="evenodd" />
          </svg>
        </Button>
        
        <Button variant="tertiary" @click="show.episodeNav('random')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 -mx-1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </Button>
        
        <Button variant="tertiary" @click="show.episodeNav('finished')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 -mx-1">
            <path fill-rule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clip-rule="evenodd" />
          </svg>
        </Button>
        
        <InputWithLabel :with-label="false" :is-search="true" v-model="filterStr"></InputWithLabel>
        
      </div>
      
    </div>
      
    <div class="pl-12 pr-8 mt-4 overflow-y-scroll grow min-h-40">
      
      <EpisodeCard
        v-for="episodeID in show.episode_ids"
        :episode="show.episodes[episodeID]"
        :is-selected="show.current_episode_id == episodeID"
        :playback-position="store.playback_positions[show.episodes[episodeID].filename]"
        @click="show.current_episode_id = episodeID"
        :class="{
          'hidden': !show.episodes[episodeID].searchable_text.includes(filterStrDebounced)
        }"
        >
      </EpisodeCard>
      
      <EpisodeCard
        :episode="{is_finished: true}"
        :is-selected="show.current_episode_id === null"
        :playback-position="null"
        @click="show.current_episode_id = null"
        :class="{ 'hidden': !!filterStrDebounced }"
        >
      </EpisodeCard>
      
    </div>
    
  </div>
  
</template>