<script setup>
import { Archive, ArchiveRestore, ArrowDownToLine, ArrowUpToLine, CloudDownload, Dices, ExternalLink, Folder, Pencil, Rows3, Search, Trash2, Tv } from '@lucide/vue';
import { open } from '@tauri-apps/plugin-shell';
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { Item } from '../classes/Item';
import ArtworkEdit from '../components/ArtworkEdit.vue';
import CheckboxWithLabel from '../components/CheckboxWithLabel.vue';
import EpisodeCard from '../components/EpisodeCard.vue';
import TvdbMatches from '../components/TvdbMatches.vue';
import { useAlphaName, useGet, useGetProp, useMinutesToTimeStr } from '../helpers';
import { store } from '../store.js';
import { getMovieRuntime, searchTvdb } from '../tvdb';

let itemID = ref(null);

let updateTimeoutId = null;
let updateFilterStrTimeoutId = null;

getItemID();

const showEdit = ref(!itemID.value);
const showMatches = ref(true);
const filterStr = ref('');
const filterStrDebounced = ref('');

getRouteView();

function getItemID() {
  let newItemID = null;
  if (store.route.name === 'item.create.show') {
    store.new_item = new Item({ is_new: true, type: 'show', source: 'external' });
  } else if (store.route.name === 'item.create.movie') {
    store.new_item = new Item({ is_new: true, type: 'movie', source: 'external' });
  } else if (store.route.name === 'item.create.ytPlaylist') {
    store.new_item = new Item({ is_new: true, type: 'show', source: 'ytPlaylist' });
  } else {
    newItemID = store.route.params.id;
  }
  itemID.value = newItemID;
}

function getRouteView() {
  const routeView = useGet(store.route, 'query.view');
  if (routeView === 'edit') showEdit.value = true;
  else if (routeView === 'episodes') showEdit.value = false;
}

watch(
  () => store.route.fullPath,
  (newRoute) => {
    getItemID();
    getRouteView();
  }
)

const item = computed(() => itemID.value ? store.items[itemID.value] : store.new_item);

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
  store.setStatusMsg('Waiting...');
  updateTimeoutId = window.setTimeout(async () => {
    store.setStatusMsg('Saving Item...');
    const response = await item.value.saveToDB();
    if (parseInt(useGetProp(response, 'rowsAffected'))) {
      store.setStatusMsg('Item saved: ' + item.value.name, true, true);
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
  store.setStatusMsg(`${results.added_count} video${results.added_count == 1 ? '' : 's'} added, ${results.updated_count} updated`, true);
  store.loading = false;
}

async function deleteItem() {
  if (!item.value || !item.value.id) return false;
  const confirmed = await confirm('Are you sure you want to delete this item?', { title: 'Playa - Delete Item', type: 'warning' });
  if (!confirmed) return false;
  await item.value.delete();
  store.setStatusMsg('Item deleted: ' + item.value.name, true, true);
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
    class="pt-8 w-full grow"
    :class="{
      'flex flex-col max-h-full mx-auto': item.episode_ids.length,
      'overflow-y-auto': !item.episode_ids.length
    }"
    >
    
    <div
      class="mx-auto px-4 w-full max-w-4xl"
      :class="{
        'shrink-0': item.episode_ids.length,
        'w-full': !item.episode_ids.length
      }"
      >
      
      <div
        class="flex justify-center items-center bg-gray-700"
        :class="{
          'min-h-32': item.type === 'show',
          'min-h-56': item.type === 'movie'
        }"
        >
        <img :src="artworkAssetUrl" :class="{'max-w-80': item.type === 'movie'}">
      </div>
      
      <div class="flex items-start gap-x-4 mt-4">
        
        <h2 class="text-slate-200 text-2xl grow">
          {{ displayName }}
        </h2>
        
        <Button variant="link" @click="item.openTvdbSlug()" :disabled="!item.tvdb_slug">
          <Tv class="bottom-px relative size-5" />
          TVDB
        </Button>
        
        <Button v-if="item.dir_name || item.pathname" variant="link" @click="item.openFileOrFolder()" class="max-w-64">
          <Folder class="size-5" />
          <span class="overflow-hidden text-ellipsis whitespace-nowrap">
            <template v-if="item.dir_name">Folder</template>
            <template v-else>Show File</template>
          </span>
        </Button>
        
        <Button variant="archive" @click="toggleArchived" :disabled="store.loading || !item.id">
          <template v-if="item.is_archived">
            <ArchiveRestore class="size-5" />
            <span>
              Unarchive
            </span>
          </template>
          <template v-else>
            <Archive class="size-5" />
            <span>
              Archive
            </span>
          </template>
        </Button>
        
        <Button v-if="item.source !== 'local'" variant="delete" :disabled="store.loading || !item.id" @click="deleteItem">
          <Trash2 class="size-5" />
          Delete
        </Button>
        
        <Button v-if="item.episode_ids.length" variant="secondary" @click="showEdit = !showEdit" class="justify-center w-28">
          <template v-if="!showEdit">
            <Pencil class="size-5" />
            Edit
          </template>
          <template v-if="showEdit">
            <Rows3 class="size-5" />
            Episodes
          </template>
        </Button>
        
      </div>
      
      <form v-show="showEdit || !item.episode_ids.length" action="" method="get" @submit.prevent class="pt-1 pb-4" autocapitalize="false" autocomplete="off">
        
        <InputWithLabel v-if="item.source === 'external' || item.source === 'ytPlaylist'" class="mt-4" id="url" v-model="item.url" :readonly="store.loading" @input="handleUpdate">
          URL
          <template v-slot:afterInput>
            <Button variant="link" @click="open(item.url)" :disabled="!item.url">
              <ExternalLink class="size-4" />
              Open
            </Button>
          </template>
        </InputWithLabel>
        
        <div v-if="item.id">
            
          <InputWithLabel class="mt-4" id="name" v-model="item.name" :readonly="store.loading" @input="handleUpdate">
            Name
            <template v-slot:afterInput>
              <Button variant="secondary" @click="searchItemInTvdb">
                <Search class="size-5" />
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
        
        <div v-if="item.id && item.source === 'ytPlaylist'" class="mb-3 text-gray-300 text-xs text-right">
          Last updated: {{ updatedFromSourceAt }}
        </div>
        
        <div v-if="item.id" class="flex items-center gap-x-4">
          
          <h3 v-if="item.type === 'show'" class="mr-auto text-slate-200 text-xl">
            {{ item.episode_ids.length }}
            Episodes
          </h3>
          
          <Button variant="secondary" :square="true" @click="item.episodeNav('first')" class="ml-auto" :title="item.episode_ids.length ? 'First' : 'Unfinished'">
            <ArrowUpToLine class="size-6" />
          </Button>
          
          <Button v-if="item.episode_ids.length" variant="secondary" :square="true" @click="item.episodeNav('random')" title="Random">
             <Dices class="size-6" />
          </Button>
          
          <Button variant="secondary" :square="true" @click="item.episodeNav('finished')" title="Finished">
            <ArrowDownToLine class="size-6" />
          </Button>
          
          <InputWithLabel v-if="item.episode_ids.length" :with-label="false" :is-search="true" v-model="filterStr"></InputWithLabel>
          
          <Button v-if="item.type === 'show' && item.source !== 'ytPlaylist'" @click="updateEpisodesFromTvdb" :disabled="!item.tvdb_id || store.loading">
             <CloudDownload class="size-5" />
            Update from TVDB
          </Button>
          
          <Button v-if="item.source === 'ytPlaylist'" @click="updateEpisodesFromYoutube" :disabled="!item.url || store.loading || !store.settings.youtube_api_key">
            <CloudDownload class="size-5" />
            Update from YouTube
          </Button>
          
        </div>
        
      </div>
      
    </div>
    
    <div
      v-if="item.id && (!showEdit || !item.episode_ids.length)"
      class="mt-4 pb-12 overflow-y-scroll grow"
      :class="{
        'min-h-40': item.episode_ids.length,
        'min-h-24': !item.episode_ids.length
      }"
      >
      
      <div class="mx-auto pr-2 pl-6 max-w-4xl">
        
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