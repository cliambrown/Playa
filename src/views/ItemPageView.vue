<script setup>
import { store } from '../store.js';
import { open } from '@tauri-apps/plugin-shell';
import { computed, ref, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { searchTvdb, getMovieRuntime } from '../tvdb';
import { useGetProp, useMinutesToTimeStr, useAlphaName, useOpenOrHomeDir, useShowInExplorer } from '../helpers';
import { Item } from '../classes/Item';
import CheckboxWithLabel from '../components/CheckboxWithLabel.vue';
import TvdbMatches from '../components/TvdbMatches.vue';
import ArtworkEdit from '../components/ArtworkEdit.vue';
import EpisodeCard from '../components/EpisodeCard.vue';
import TvIcon from '../icons/TvIcon.vue';
import TopIcon from '../icons/TopIcon.vue';
import RandIcon from '../icons/RandIcon.vue';
import BottomIcon from '../icons/BottomIcon.vue';
import FolderIcon from '../icons/FolderIcon.vue';
import ArchiveIcon from '../icons/ArchiveIcon.vue';
import UnarchiveIcon from '../icons/UnarchiveIcon.vue';
import TrashIcon from '../icons/TrashIcon.vue';
import EditIcon from '../icons/EditIcon.vue';
import EpisodesIcon from '../icons/EpisodesIcon.vue';
import SearchIcon from '../icons/SearchIcon.vue';
import ExternalLinkIcon from '../icons/ExternalLinkIcon.vue';
import ScanIcon from '../icons/ScanIcon.vue';

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

const updatedFromSourceAt = computed(() => {
  if (!item.value) return null;
  let r = parseInt(item.value.updated_from_source_at);
  if (!r || isNaN(r)) return 'Never';
  const date = new Date(r * 1000);
  return date.getUTCFullYear() + '-'
    + ((date.getUTCMonth() + 1) + '').padStart(2, '0') + '-'
    + (date.getUTCDate() + '').padStart(2, '0') + ' '
    + date.getHours() + ':'
    + (date.getMinutes() + '').padStart(2, '0') + ' '
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
    if (item.value) item.value.setAlphaName(newVal);
  }
)

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
  if (!item.value) return false;
  store.loading = true;
  await item.value.updateEpisodesFromTvdb();
  store.loading = false;
}

async function updateEpisodesFromYoutube() {
  if (!item.value) return false;
  store.loading = true;
  const results = await item.value.updateEpisodesFromYoutube();
  store.loading_msg = `${results.added_count} video${results.added_count == 1 ? '' : 's'} added, ${results.updated_count} updated`;
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
    case 't':
      event.preventDefault();
      item.value.openTvdbSlug();
      break;
    case 'f':
      event.preventDefault();
      item.value.openFileOrFolder();
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
    class="w-full pt-8 grow"
    :class="{
      'flex flex-col max-h-full mx-auto': item.episode_ids.length,
      'overflow-y-auto': !item.episode_ids.length
    }"
    >
    
    <div
      class="w-full max-w-4xl px-4 mx-auto"
      :class="{
        'shrink-0': item.episode_ids.length,
        'w-full': !item.episode_ids.length
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
      
      <div class="flex items-start mt-4 gap-x-4">
        
        <h2 class="text-2xl text-slate-200 grow">
          {{ displayName }}
        </h2>
        
        <Button variant="link" @click="item.openTvdbSlug()" :disabled="!item.tvdb_slug">
          <TvIcon />
          TVDB
        </Button>
        
        <Button v-if="item.dir_name || item.pathname" variant="link" @click="item.openFileOrFolder()" class="max-w-64">
          <FolderIcon />
          <span class="overflow-hidden whitespace-nowrap text-ellipsis">
            <template v-if="item.dir_name">Folder</template>
            <template v-else>Show File</template>
          </span>
        </Button>
        
        <Button variant="archive" @click="toggleArchived" :disabled="store.loading || !item.id">
          <template v-if="item.is_archived">
            <UnarchiveIcon />
            <span>
              Unarchive
            </span>
          </template>
          <template v-else>
            <ArchiveIcon />
            <span>
              Archive
            </span>
          </template>
        </Button>
        
        <Button v-if="item.source !== 'local'" variant="delete" :disabled="store.loading || !item.id" @click="deleteItem">
          <TrashIcon />
          Delete
        </Button>
        
        <Button v-if="item.episode_ids.length" variant="secondary" @click="showEdit = !showEdit" class="justify-center w-28">
          <template v-if="!showEdit">
            <EditIcon />
            Edit
          </template>
          <template v-if="showEdit">
            <EpisodesIcon />
            Episodes
          </template>
        </Button>
        
      </div>
      
      <form v-show="showEdit || !item.episode_ids.length" action="" method="get" @submit.prevent class="pt-1 pb-4" autocapitalize="false" autocomplete="off">
        
        <InputWithLabel v-if="item.source === 'external' || item.source === 'ytPlaylist'" class="mt-4" id="url" v-model="item.url" :readonly="store.loading" @input="handleUpdate">
          URL
          <template v-slot:afterInput>
            <Button variant="link" @click="open(item.url)" :disabled="!item.url">
              <ExternalLinkIcon />
              Open
            </Button>
          </template>
        </InputWithLabel>
        
        <div v-if="item.id">
            
          <InputWithLabel class="mt-4" id="name" v-model="item.name" :readonly="store.loading" @input="handleUpdate">
            Name
            <template v-slot:afterInput>
              <Button variant="secondary" @click="searchItemInTvdb">
                <SearchIcon />
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
            @tvdb-link-click="(matchSlug) => item.openTvdbSlug(matchSlug)"
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
          
          <div class="flex flex-wrap gap-8 mt-4" v-if="item.source === 'ytPlaylist'">
            
            <div class="self-end mb-2">
              <CheckboxWithLabel input_id="order_is_reversed" v-model="item.order_is_reversed" :disabled="store.loading" @checkbox-change="handleUpdate" :trueValue="1" :falseValue="null">
                Reverse Order
              </CheckboxWithLabel>
            </div>
            
            <div class="self-end mb-2">
              <CheckboxWithLabel input_id="open_list_not_ep" v-model="item.open_list_not_ep" :disabled="store.loading" @checkbox-change="handleUpdate" :trueValue="1" :falseValue="null">
                Open Playlist URL Instead of Episode
              </CheckboxWithLabel>
            </div>
            
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
      
      <div v-if="item.id && (!showEdit || !item.episode_ids.length)" class="mt-12">
        
        <div v-if="item.id && item.source === 'ytPlaylist'" class="mb-3 text-xs text-right text-gray-300">
          Last updated: {{ updatedFromSourceAt }}
        </div>
        
        <div v-if="item.id" class="flex items-center gap-x-4">
          
          <h3 v-if="item.type === 'show'" class="mr-auto text-xl text-slate-200">
            {{ item.episode_ids.length }}
            Episodes
          </h3>
          
          <Button variant="secondary" :square="true" @click="item.episodeNav('first')" class="ml-auto" :title="item.episode_ids.length ? 'First' : 'Unfinished'">
            <TopIcon />
          </Button>
          
          <Button v-if="item.episode_ids.length" variant="secondary" :square="true" @click="item.episodeNav('random')" title="Random">
             <RandIcon />
          </Button>
          
          <Button variant="secondary" :square="true" @click="item.episodeNav('finished')" title="Finished">
            <BottomIcon />
          </Button>
          
          <InputWithLabel v-if="item.episode_ids.length" :with-label="false" :is-search="true" v-model="filterStr"></InputWithLabel>
          
          <Button v-if="item.type === 'show' && item.source !== 'ytPlaylist'" @click="updateEpisodesFromTvdb" :disabled="!item.tvdb_id || store.loading">
            <ScanIcon />
            Update from TVDB
          </Button>
          
          <Button v-if="item.source === 'ytPlaylist'" @click="updateEpisodesFromYoutube" :disabled="!item.url || store.loading || !store.settings.youtube_api_key">
            <ScanIcon />
            Update from YouTube
          </Button>
          
        </div>
        
      </div>
      
    </div>
    
    <div
      v-if="item.id && (!showEdit || !item.episode_ids.length)"
      class="pb-12 mt-4 overflow-y-scroll grow"
      :class="{
        'min-h-40': item.episode_ids.length,
        'min-h-24': !item.episode_ids.length
      }"
      >
      
      <div class="max-w-4xl pl-6 pr-2 mx-auto">
        
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
    
  </div>
  
</template>