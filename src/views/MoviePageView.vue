<script setup>
import { computed, ref, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';
import { store } from '../store.js';
import { useGet, useShowInExplorer } from '../helpers';
import { searchTvdb, getArtwork } from '../tvdb';
import DirSelect from '../components/DirSelect.vue';

let updateTimeoutId = null;
let updateMsgTimoutId = null;

const showMatches = ref(true);
const posterSrc = ref('url');
const posterSrcUrl = ref('');
const posterSrcFilepath = ref('');
const posters = ref([]);
const showPosters = ref(true);

const movie = computed(() => store.movies[store.route.params.id]);

const posterAssetUrl = computed(() => {
  return (store.poster_dir_url && movie.value && movie.value.poster_filename)
    ? store.poster_dir_url + movie.value.poster_filename
    : '/assets/blank_poster.jpg';
});

async function handleUpdate() {
  if (!store.loaded_from_db) return false;
  window.clearTimeout(updateTimeoutId);
  window.clearTimeout(updateMsgTimoutId);
  store.loading_msg = 'Waiting...';
  updateTimeoutId = window.setTimeout(async () => {
    store.loading_msg = 'Saving Movie...';
    const response = await movie.value.saveToDB();
    if (parseInt(useGet(response, 'rowsAffected'))) {
      store.loading_msg = 'Movie saved';
      updateMsgTimoutId = window.setTimeout(() => {
        store.loading_msg = '';
      }, 5000);
    }
  }, 500);
}

watch(
  () => movie.value ? movie.value.name : null,
  (newName) => {
    if (movie.value) {
      movie.value.setName(newName);
      handleUpdate();
    }
  }
)

function openTvdbSlug(slug) {
  if (slug) open('https://www.thetvdb.com/movies/' + slug);
}

async function searchMovieInTvdb() {
  if (!movie.value || !movie.value.name) return false;
  const matches = await searchTvdb(store, movie.value.name, 'movie');
  if (!matches || !Array.isArray(matches)) return false;
  movie.value.tvdb_matches = matches;
  showMatches.value = true;
}

function selectTvdbMatch(match) {
  movie.value.name = match.name;
  movie.value.tvdb_id = match.tvdb_id;
  movie.value.tvdb_slug = match.slug;
  handleUpdate();
}

function toggleArchived() {
  movie.value.is_archived = movie.value.is_archived ? 0 : 1;
  handleUpdate();
}

async function getPostersFromTvdb() {
  if (!movie.value || !movie.value.tvdb_id) return false;
  const tvdbPosters = await getArtwork(store, movie.value.tvdb_id, 'movie');
  if (!tvdbPosters) return false;
  posters.value = tvdbPosters;
  showPosters.value = true;
}

async function replacePoster() {
  const oldFilename = movie.value.poster_filename;
  const newFilename = `movie-${movie.value.id}-${Date.now()}`;
  let response, invokeFn, params;
  if (posterSrc.value === 'url') {
    if (!posterSrcUrl.value) return false;
    store.loading = true;
    invokeFn = 'download_image';
    params = {
      srcUrl: posterSrcUrl.value,
      newFilename: newFilename,
      destFolder: 'posters',
    };
  } else if (posterSrc.value === 'upload') {
    if (!posterSrcFilepath.value) return false;
    store.loading = true;
    invokeFn = 'copy_local_image';
    params = {
      srcPathname: posterSrcFilepath.value,
      newFilename: newFilename,
      destFolder: 'posters',
    };
  }
  try {
    response = await invoke(invokeFn, params);
  } catch (error) {
    window.alert(error);
    store.loading = false;
    return false;
  }
  console.log('replacePoster', response);
  if (newFilename === response.split('.')[0]) {
    movie.value.poster_filename = response;
    handleUpdate();
    if (oldFilename) {
      invoke('delete_image', {
        deleteFilename: oldFilename,
        fromFolder: 'posters',
      });
    }
  }
  store.loading = false;
}

function handleKeydown(event) {
  switch (event.key) {
    case ' ':
      event.preventDefault();
      movie.value.play()
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
  
  <div v-if="!!movie" class="px-4 pt-8 mx-auto max-w-7xl grow sm:flex sm:flex-row-reverse sm:items-start sm:gap-8">
    
    <div>
      <img :src="posterAssetUrl" class="max-w-96">
    </div>
    
    <div class="grow">
      
      <div class="flex items-center mt-4 gap-x-4">
        
        <h2 class="text-2xl text-slate-200 grow">
          {{ movie.name }}
        </h2>
        
        <Button variant="link" @click="openTvdbSlug(movie.tvdb_slug)" :disabled="!movie.tvdb_slug">
          <span class="relative bottom-[1px]">📺</span>
          TVDB
        </Button>
        
        <Button variant="local-link" @click="useShowInExplorer(movie.pathname)" class="max-w-72">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 shrink-0">
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
          </svg>
          <span class="overflow-hidden whitespace-nowrap text-ellipsis">
            {{ movie.filename }}
          </span>
        </Button>
        
        <Button variant="archive" @click="toggleArchived" :disabled="store.loading">
          <svg v-if="movie.is_archived" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" />
            <path fill-rule="evenodd" d="M13 6H3v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6ZM5.72 7.47a.75.75 0 0 1 1.06 0L8 8.69l1.22-1.22a.75.75 0 1 1 1.06 1.06L9.06 9.75l1.22 1.22a.75.75 0 1 1-1.06 1.06L8 10.81l-1.22 1.22a.75.75 0 0 1-1.06-1.06l1.22-1.22-1.22-1.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
          <span v-if="movie.is_archived">
            Unarchive
          </span>
          <svg v-if="!movie.is_archived" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M3 2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3Z" />
            <path fill-rule="evenodd" d="M3 6h10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm3 2.75A.75.75 0 0 1 6.75 8h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 8.75Z" clip-rule="evenodd" />
          </svg>
          <span v-if="!movie.is_archived">
            Archive
          </span>
        </Button>
        
      </div>
      
      <form action="" method="get" @submit.prevent class="pt-1 pb-4" autocapitalize="false" autocomplete="off">
          
        <InputWithLabel class="mt-4" id="name" v-model="movie.name" :readonly="store.loading">
          Name
          <template v-slot:afterInput>
            <Button variant="action-secondary" @click="searchMovieInTvdb">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
              </svg>
              Search TVDB
            </Button>
          </template>
        </InputWithLabel>
        
        <div v-if="movie.tvdb_matches.length" class="mt-4">
          <div class="flex items-center gap-6">
            <div class="text-sm font-medium uppercase text-slate-200">
              Search results ({{ movie.tvdb_matches.length }})
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
              <li v-for="match in movie.tvdb_matches" class="flex flex-wrap gap-2 my-2">
                <Button variant="action-secondary" @click="selectTvdbMatch(match)" whitespace="normal">
                  {{ match.name }}
                  ({{ match.country }} {{ match.year }})
                </Button>
                <Button variant="link-secondary" @click="openTvdbSlug(match.slug)">
                  <span class="relative bottom-0.5">📺</span>
                  <span>TVDB</span>
                </Button>
              </li>
            </ul>
          </TransitionExpand>
        </div>
        
        <div class="flex flex-wrap gap-8 mt-4">
          
          <InputWithLabel class="max-w-40" id="tvdb_id" v-model="movie.tvdb_id" :readonly="store.loading" @input="handleUpdate">
            TVDB ID
          </InputWithLabel>
        
          <InputWithLabel class="max-w-72" id="tvdb_slug" v-model="movie.tvdb_slug" :readonly="store.loading" @input="handleUpdate">
            TVDB Slug
          </InputWithLabel>
        
          <InputWithLabel :datepicker="true" id="last_watched_at" v-model="movie.last_watched_at" :readonly="store.loading" @input="handleUpdate">
            Last Watched At
          </InputWithLabel>
          
        </div>
        
        <div class="flex items-center mt-4 gap-x-4">
            
          <fieldset class="flex flex-wrap items-center gap-x-6">
            <div>
              <legend class="text-sm font-medium uppercase text-slate-200">
                Replace poster from:
              </legend>
            </div>
            <div class="flex items-center">
              <input id="poster-src-url" name="poster-src" type="radio" value="url" v-model="posterSrc" class="w-4 h-4 text-blue-500 border-gray-300 cursor-pointer focus:ring-blue-500">
              <label for="poster-src-url" class="block pl-2 text-sm font-medium leading-6 cursor-pointer">URL</label>
            </div>
            <div class="flex items-center">
              <input id="poster-src-upload" name="poster-src" type="radio" value="upload" v-model="posterSrc" class="w-4 h-4 text-blue-500 border-gray-300 cursor-pointer focus:ring-blue-500">
              <label for="poster-src-upload" class="block pl-2 text-sm font-medium leading-6 cursor-pointer">Upload</label>
            </div>
          </fieldset>
          
          <Button :disabled="store.loading || (posterSrc === 'url' && !posterSrcUrl) || (posterSrc === 'upload' && !posterSrcFilepath)" class="ml-auto" @click="replacePoster">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clip-rule="evenodd" />
            </svg>
            Replace Poster
          </Button>
          
        </div>
        
        <div v-if="posterSrc === 'upload'" class="mt-4">
          <InputWithLabel id="tv_dir" v-model="posterSrcFilepath">
            Banner File Location
            <template v-slot:afterInput>
              <div class="flex items-center gap-x-2">
                <DirSelect v-model="posterSrcFilepath" :directory="false" defaultPath="%HomeDrive%"/>
              </div>
            </template>
          </InputWithLabel>
        </div>
        
        <div v-if="posterSrc === 'url'" class="mt-4">
          
          <InputWithLabel id="poster-url" class="" v-model="posterSrcUrl">
            Banner URL
            <template v-slot:afterInput>
            <Button variant="action-secondary" @click="getPostersFromTvdb" :disabled="!movie.tvdb_id || store.loading">
              <span class="relative bottom-[1px]">📺</span>
              Load TVDB Posters
            </Button>
          </template>
          </InputWithLabel>
          
          <div v-if="posters.length" class="mt-4">
            <div class="flex items-center gap-6">
              <div class="text-sm font-medium uppercase text-slate-200">
                Posters ({{ posters.length }})
              </div>
              <button type="button" @click="showPosters = !showPosters" class="text-white">
                <span v-if="showPosters" class="inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
                  </svg>
                  hide
                </span>
                <span v-if="!showPosters" class="inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 ">
                    <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                  </svg>
                  show
                </span>
              </button>
            </div>
            <TransitionExpand>
              <div v-show="showPosters" class="flex flex-wrap gap-2 mt-2">
                <button type="button" v-for="poster in posters" class="w-40" @click="posterSrcUrl = poster.image">
                  <img :src="poster.image">
                </button>
              </div>
            </TransitionExpand>
          </div>
          
        </div>
        
      </form>
      
    </div>
    
  </div>
  
</template>