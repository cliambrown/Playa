<script setup>
import { computed, ref, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';
import { store } from '../store.js';
import { useGet, useShowInExplorer } from '../helpers';
import { searchTvdb, getArtwork } from '../tvdb';
import TvdbMatches from '../components/TvdbMatches.vue';
import ArtworkEdit from '../components/ArtworkEdit.vue';

let updateTimeoutId = null;
let updateMsgTimoutId = null;

const showMatches = ref(true);

const movie = computed(() => store.movies[store.route.params.id]);

const artworkAssetUrl = computed(() => {
  return (store.artworks_dir_url && movie.value && movie.value.artwork_filename)
    ? store.artworks_dir_url + movie.value.artwork_filename
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
  const matches = await searchTvdb(store, movie.value.name, movie.value.type);
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
  store.sortMovietypeLists();
}

function replaceArtwork(newFilename) {
  if (newFilename) movie.value.artwork_filename = newFilename;
  handleUpdate();
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
  
  <div v-if="!!movie" class="w-full px-4 pt-8 pb-20 overflow-y-auto grow">
    <div class="w-full max-w-5xl mx-auto">
      
      <div class="flex items-center justify-center bg-gray-700 min-h-56">
        <img :src="artworkAssetUrl" class="max-w-80">
      </div>
      
      <div class="flex items-center mt-4 gap-x-4">
        
        <h2 class="text-2xl text-slate-200 grow">
          {{ movie.name }}
        </h2>
        
        <Button variant="link" @click="openTvdbSlug(movie.tvdb_slug)" :disabled="!movie.tvdb_slug">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M12 5H4v4h8V5Z" />
            <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
          </svg>
          TVDB
        </Button>
        
        <Button variant="link" @click="useShowInExplorer(movie.pathname)" class="max-w-64">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 shrink-0">
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
          </svg>
          <span class="overflow-hidden whitespace-nowrap text-ellipsis">
            Show File
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
            <Button variant="secondary" @click="searchMovieInTvdb">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
              </svg>
              Search TVDB
            </Button>
          </template>
        </InputWithLabel>
        
        <TvdbMatches
          :matches="movie.tvdb_matches"
          class="mt-4"
          :showMatches="showMatches"
          @toggle-show-matches="showMatches = !showMatches"
          @match-select="(match) => selectTvdbMatch(match)"
          @tvdb-link-click="(matchSlug) => openTvdbSlug(matchSlug)"
          >
        </TvdbMatches>
        
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
        
        <ArtworkEdit
          class="mt-4"
          :tvdbID="movie.tvdb_id"
          :type="movie.type"
          :itemClass="movie.class"
          :itemID="movie.id"
          :artworkFilename="movie.artwork_filename"
          @replace-artwork="(newFilename) => replaceArtwork(newFilename)"
          >
        </ArtworkEdit>
        
      </form>
      
    </div>
    
  </div>
  
</template>