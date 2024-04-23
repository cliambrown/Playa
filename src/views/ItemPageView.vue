<script setup>
import { store } from '../store.js';
import { open } from '@tauri-apps/api/shell';
import { computed, ref, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { searchTvdb, getMovieRuntime, getEpisodes } from '../tvdb';
import { getYtPlaylistVideos } from '../youtube';
import { useGetProp, useMinutesToTimeStr, useAlphaName, useOpenOrHomeDir, useShowInExplorer } from '../helpers';
import { Item } from '../classes/Item';
import TvdbMatches from '../components/TvdbMatches.vue';
import ArtworkEdit from '../components/ArtworkEdit.vue';
import EpisodeCard from '../components/EpisodeCard.vue';

let itemID = null;
if (store.route.name === 'item.create.show') {
  store.new_item = new Item({ is_new: true, type: 'show', source: 'external' });
} else if (store.route.name === 'item.create.movie') {
  store.new_item = new Item({ is_new: true, type: 'movie', source: 'external' });
} else if (store.route.name === 'item.create.ytPlaylist') {
  store.new_item = new Item({ is_new: true, type: 'show', source: 'ytPlaylist' });
} else {
  itemID = store.route.params.id;
}

let updateTimeoutId = null;
let updateFilterStrTimeoutId = null;

const showEdit = ref(!itemID);
const showMatches = ref(true);
const filterStr = ref('');
const filterStrDebounced = ref('');

const item = computed(() => itemID ? store.items[itemID] : store.new_item);

const artworkAssetUrl = computed(() => {
  return (store.artworks_dir_url && item.value.artwork_filename)
    ? store.artworks_dir_url + item.value.artwork_filename
    : (item.value.type === 'show' ? '/assets/blank_banner.jpg' : '/assets/blank_poster.jpg');
});

const displayName = computed(() => {
  if (!item.value) return null;
  if (item.value.id) return item.value.name;
  if (item.value.type === 'movie') return 'New External Movie';
  if (item.value.source === 'ytPlaylist') return 'New YT Playlist';
  return 'New External Show';
});

async function handleUpdate() {
  window.clearTimeout(updateTimeoutId);
  store.loading_msg = 'Waiting...';
  updateTimeoutId = window.setTimeout(async () => {
    store.loading_msg = 'Saving Item...';
    const response = await item.value.saveToDB();
    if (parseInt(useGetProp(response, 'rowsAffected'))) {
      store.loading_msg = 'Item saved';
    }
  }, 500);
}

watch(
  () => item.value ? item.value.id : item.value,
  (newVal, oldVal) => {
    if (oldVal === undefined) return false;
    const newItemID = item.value.id;
    if (newItemID && !store.item_ids.includes(newItemID)) {
      store.items[newItemID] = item;
      store.item_ids.push(newItemID);
      if (item.value.type === 'show')
        store.home_unfinished_show_ids.push(newItemID);
      else
        store.home_unfinished_movie_ids.push(newItemID);
    }
  }
)

watch(
  () => item.value ? item.value.name : item.value,
  (newVal, oldVal) => {
    if (oldVal === undefined) return false;
    if (item.value) {
      item.value.setAlphaName(newVal);
    }
  }
)

function openTvdbSlug(slug) {
  if (!slug) return false;
  open(`https://www.thetvdb.com/${item.value.type === 'show' ? 'series' : 'movies'}/${slug}`);
}

async function searchItemInTvdb() {
  if (!item.value || !item.value.name) return false;
  const matches = await searchTvdb(store, item.value.name, item.value.type);
  if (!matches) return false;
  item.value.tvdb_matches = matches;
  showMatches.value = true;
}

async function selectTvdbMatch(match) {
  item.value.name = match.name;
  item.value.tvdb_id = match.tvdb_id;
  item.value.tvdb_slug = match.slug;
  if (item.value.type === 'movie' && item.value.source === 'external') {
    let runtime = await getMovieRuntime(store, match.tvdb_id);
    item.value.duration = useMinutesToTimeStr(runtime);
  }
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
  store.sortItems();
}

async function updateEpisodesFromTvdb() {
  if (!item.value || !item.value.tvdb_id) return false;
  const tvdbEpisodes = await getEpisodes(store, item.value.tvdb_id);
  if (!tvdbEpisodes) return false;
  store.loading = true;
  store.loading_msg = 'Loading episodes...';
  let addedCount = 0;
  let updatedCount = 0;
  
  if (item.value.source === 'local') {
    
    for (const episodeID of item.value.episode_ids) {
      let episode = item.value.episodes[episodeID];
      for (const tvdbEpisode of tvdbEpisodes) {
        if (
          tvdbEpisode.season_num === episode.season_num
          && tvdbEpisode.episode_num === episode.episode_num
        ) {
          const origName = episode.name;
          const origOverview = episode.overview;
          const origReleasedOn = episode.released_on;
          episode.name = tvdbEpisode.name;
          episode.overview = tvdbEpisode.overview;
          episode.released_on = tvdbEpisode.released_on;
          if (
            origName !== episode.name
            || origOverview !== episode.overview
            || origReleasedOn !== episode.released_on
          ) {
            episode.setSearchableText();
            episode.saveToDB();
            updatedCount++;
            episode.is_updated = true;
          }
          break;
        }
      }
    }
    item.value.sortEpisodes();
    store.loading_msg = `${updatedCount} episode${updatedCount == 1 ? '' : 's'} updated`;
    
  } else {
    
    let foundEpisodeIDs = [];
    for (const tvdbEpisode of tvdbEpisodes) {
      if (!tvdbEpisode.season_num || tvdbEpisode.episode_num === null) {
        continue;
      }
      tvdbEpisode.duration = useMinutesToTimeStr(tvdbEpisode.runtime);
      let episode = await item.value.getEpisodeFromData(tvdbEpisode);
      if (episode.is_new) {
        addedCount++;
      } else {
        const origName = episode.name;
        const origOverview = episode.overview;
        const origReleasedOn = episode.released_on;
        const origDuration = episode.duration;
        episode.name = tvdbEpisode.name;
        episode.overview = tvdbEpisode.overview;
        episode.released_on = tvdbEpisode.released_on;
        episode.duration = tvdbEpisode.duration;
        if (
          origName !== episode.name
          || origOverview !== episode.overview
          || origReleasedOn !== episode.released_on
          || origDuration !== episode.duration
        ) {
          episode.setSearchableText();
          episode.saveToDB();
          updatedCount++;
          episode.is_updated = true;
        }
      }
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
  store.loading = false;
}

async function updateEpisodesFromYoutube() {
  if (!store.settings.youtube_api_key) return false;
  let playlistID = null;
  try {
    const params = new URL(item.value.url).searchParams;
    playlistID = params.get('list');
  } catch (e) {
    console.log(e);
    return false;
  }
  if (!playlistID) return false;
  store.loading = true;
  store.loading_msg = 'Loading videos...';
  let addedCount = 0;
  let updatedCount = 0;
  let foundEpisodeIDs = [];
  const videosData = await getYtPlaylistVideos(playlistID, store.settings.youtube_api_key);
  if (!videosData || !Array.isArray(videosData)) {
    store.loading_msg = 'Invalid response';
    store.loading = false;
    return false;
  }
  for (const videoData of videosData) {
    if (!videoData.url) continue;
    let episode = await item.value.getEpisodeFromData(videoData);
    if (episode.is_new) {
      addedCount++;
    } else {
      const origName = episode.name;
      const origOverview = episode.overview;
      const origOrderNum = episode.order_num;
      const origReleasedOn = episode.released_on;
      const origDuration = episode.duration;
      episode.name = videoData.name;
      episode.overview = videoData.overview;
      episode.order_num = videoData.order_num;
      episode.released_on = videoData.released_on;
      episode.duration = videoData.duration;
      if (
        origName !== episode.name
        || origOverview !== episode.overview
        || origOrderNum !== episode.order_num
        || origReleasedOn !== episode.released_on
        || origDuration !== episode.duration
      ) {
        episode.setSearchableText();
        episode.saveToDB();
        updatedCount++;
        episode.is_updated = true;
      }
    }
    foundEpisodeIDs.push(episode.id);
  }
  for (const episodeID of item.value.episode_ids) {
    if (!foundEpisodeIDs.includes(episodeID)) {
      item.value.episodes[episodeID].delete();
    }
  }
  item.value.sortEpisodes();
  item.value.setCurrentEpToNewEp();
  store.loading_msg = `${addedCount} video${addedCount == 1 ? '' : 's'} added, ${updatedCount} updated`;
  store.loading = false;
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
  if (newFilename) {
    item.value.artwork_filename = newFilename;
    handleUpdate();
  }
}

function setCurrentEpisode(episodeID) {
  item.value.current_episode_id = episodeID;
  item.value.updateCurrentEpInDB();
}

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      item.value.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev');
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
      'flex flex-col max-w-5xl max-h-full mx-auto': item.episode_ids.length,
      'overflow-y-auto pb-20': !item.episode_ids.length
    }"
    >
    
    <div
      class="px-12"
      :class="{
        'px-12 shrink-0': item.episode_ids.length,
        'w-full max-w-5xl mx-auto': !item.episode_ids.length
      }"
      >
      
      <div
        class="flex items-center justify-center bg-gray-700"
        :class="{
          'min-h-32': item.type === 'show',
          'min-h-56': item.type === 'movie'
        }"
        >
        <img :src="artworkAssetUrl" :class="{'max-w-80': item.type === 'movie'}">
      </div>
      
      <div class="flex items-center mt-4 gap-x-4">
        
        <h2 class="text-2xl text-slate-200 grow">
          {{ displayName }}
        </h2>
        
        <Button variant="link" @click="openTvdbSlug(item.tvdb_slug)" :disabled="!item.tvdb_slug">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M12 5H4v4h8V5Z" />
            <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
          </svg>
          TVDB
        </Button>
        
        <Button v-if="item.dir_name" variant="link" @click="useOpenOrHomeDir(store.settings.tv_dir + '/' + item.dir_name)"  class="max-w-64">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
          </svg>
          <span class="overflow-hidden whitespace-nowrap text-ellipsis">
            Folder
          </span>
        </Button>
        
        <Button v-if="item.pathname" variant="link" @click="useShowInExplorer(item.pathname)" class="max-w-64">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 shrink-0">
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
          </svg>
          <span class="overflow-hidden whitespace-nowrap text-ellipsis">
            Show File
          </span>
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
        
        <Button v-if="item.source !== 'local'" variant="delete" :disabled="store.loading || !item.id" @click="deleteItem">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clip-rule="evenodd" />
          </svg>
          Delete
        </Button>
        
        <Button v-if="item.episode_ids.length" variant="secondary" @click="showEdit = !showEdit">
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
        <form v-show="showEdit || !item.episode_ids.length" action="" method="get" @submit.prevent class="pt-1 pb-4" autocapitalize="false" autocomplete="off">
          
          <InputWithLabel v-if="item.source === 'external' || item.source === 'ytPlaylist'" class="mt-4" id="url" v-model="item.url" :readonly="store.loading" @input="handleUpdate">
            URL
          </InputWithLabel>
          
          <div v-if="item.id">
              
            <InputWithLabel class="mt-4" id="name" v-model="item.name" :readonly="store.loading" @input="handleUpdate">
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
              :itemTvdbId="item.tvdb_id"
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
              
              <InputWithLabel v-if="item.type === 'movie'" class="max-w-72" id="duration" v-model="item.duration" :readonly="store.loading" @input="handleUpdate">
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
              :itemID="item.id"
              :artworkFilename="item.artwork_filename"
              @replace-artwork="(newFilename) => replaceArtwork(newFilename)"
              >
            </ArtworkEdit>
            
            </div>
          
        </form>
      </TransitionExpand>
      
      <div v-if="item.id" class="flex items-center mt-12 gap-x-4">
        
        <h3 v-if="item.type === 'show'" class="text-xl text-slate-200">
          {{ item.episode_ids.length }}
          Episodes
        </h3>
        
        <Button v-if="item.type === 'show' && item.source !== 'ytPlaylist'" @click="updateEpisodesFromTvdb" :disabled="!item.tvdb_id || store.loading" class="mr-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M12 5H4v4h8V5Z" />
            <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
          </svg>
          Update from TVDB
        </Button>
        
        <Button v-if="item.source === 'ytPlaylist'" @click="updateEpisodesFromYoutube" :disabled="!item.url || store.loading || !store.settings.youtube_api_key" class="mr-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 1 1 0 4H4a2 2 0 0 1-2-2ZM2 9.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.25ZM2.75 12.5a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75Z" />
          </svg>
          Update from YouTube
        </Button>
        
        <Button variant="tertiary" @click="item.episodeNav('first')" class="ml-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z" clip-rule="evenodd" />
          </svg>
          {{ item.episode_ids.length ? 'First' : 'Unfinished' }}
        </Button>
        
        <Button v-if="item.episode_ids.length" variant="tertiary" @click="item.episodeNav('random')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-6 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.293 5.293a1 1 0 1 1 .99 1.667c-.459.134-1.033.566-1.033 1.29v.25a.75.75 0 1 0 1.5 0v-.115a2.5 2.5 0 1 0-2.518-4.153.75.75 0 1 0 1.061 1.06Z" clip-rule="evenodd" />
          </svg>
          Random
        </Button>
        
        <Button variant="tertiary" @click="item.episodeNav('finished')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z" clip-rule="evenodd" />
          </svg>
          Finished
        </Button>
        
        <InputWithLabel v-if="item.episode_ids.length" :with-label="false" :is-search="true" v-model="filterStr"></InputWithLabel>
        
      </div>
      
    </div>
    
    <div
      v-if="item.id"
      class="pb-12 pl-12 pr-8 mt-4 overflow-y-scroll grow"
      :class="{
        'min-h-40': item.episode_ids.length,
        'min-h-24 max-w-5xl mx-auto': !item.episode_ids.length
      }"
      >
      
      <EpisodeCard
        v-if="!item.episode_ids.length"
        :itemID="item.id"
        :episodeID="0"
        @click="setCurrentEpisode(0)"
        >
      </EpisodeCard>
      
      <EpisodeCard
        v-for="episodeID in item.episode_ids"
        :itemID="item.id"
        :episodeID="episodeID"
        @click="setCurrentEpisode(episodeID)"
        :class="{
          'hidden': !item.episodes[episodeID].searchable_text.includes(filterStrDebounced)
        }"
        >
      </EpisodeCard>
      
      <EpisodeCard
        :itemID="item.id"
        :episodeID="null"
        @click="setCurrentEpisode(null)"
        :class="{ 'hidden': item.episode_ids.length && !!filterStrDebounced }"
        >
      </EpisodeCard>
      
    </div>
    
  </div>
  
</template>