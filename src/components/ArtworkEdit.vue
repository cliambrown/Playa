<script setup>
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { store } from '../store.js';
import { useGet } from '../helpers';
import { getArtwork } from '../tvdb';
import DirSelect from '../components/DirSelect.vue';

const props = defineProps([
  'tvdbID',
  'type',
  'itemID',
  'artworkFilename',
]);

const emit = defineEmits(['replaceArtwork']);

const artworkSrc = ref('url');
const artworkSrcUrl = ref('');
const artworkSrcFilepath = ref('');
const showArtworks = ref(true);
const artworks = computed(() => useGet(store, ['items', props.itemID, 'artwork_matches']) );

async function getArtworksFromTvdb() {
  if (!props.tvdbID) return false;
  const tvdbArtworks = await getArtwork(store, props.tvdbID, props.type);
  if (!tvdbArtworks) return false;
  if (store.items[props.itemID]) {
    store.items[props.itemID].artwork_matches = tvdbArtworks;
  }
  showArtworks.value = true;
}

async function replaceArtwork() {
  const oldFilename = props.artworkFilename;
  const newFilename = `item-${props.itemID}-${Date.now()}`;
  let response, invokeFn, params;
  if (artworkSrc.value === 'url') {
    if (!artworkSrcUrl.value) return false;
    store.loading = true;
    invokeFn = 'download_image';
    params = {
      srcUrl: artworkSrcUrl.value,
      newFilename: newFilename,
    };
  } else if (artworkSrc.value === 'upload') {
    if (!artworkSrcFilepath.value) return false;
    store.loading = true;
    invokeFn = 'copy_local_image';
    params = {
      srcPathname: artworkSrcFilepath.value,
      newFilename: newFilename,
    };
  }
  try {
    response = await invoke(invokeFn, params);
  } catch (error) {
    window.alert(error);
    store.loading = false;
    return false;
  }
  console.log('replaceArtwork', response);
  store.loading = false;
  if (newFilename === response.split('.')[0]) {
    if (oldFilename) {
      invoke('delete_image', {
        deleteFilename: oldFilename,
      });
    }
    emit('replaceArtwork', response);
  } else {
    emit('replaceArtwork', false);
  }
}
</script>

<template>
  
  <div>
    
    <div class="flex items-center mt-4 gap-x-4">
      
      <fieldset class="flex flex-wrap items-center mr-auto gap-x-6">
        <div>
          <legend class="text-sm font-medium uppercase text-slate-200">
            Replace artwork from:
          </legend>
        </div>
        <div class="flex items-center">
          <input id="artwork-src-url" name="artwork-src" type="radio" value="url" v-model="artworkSrc" class="w-4 h-4 text-blue-500 border-gray-300 cursor-pointer focus:ring-blue-500">
          <label for="artwork-src-url" class="block pl-2 text-sm font-medium leading-6 cursor-pointer">URL</label>
        </div>
        <div class="flex items-center">
          <input id="artwork-src-upload" name="artwork-src" type="radio" value="upload" v-model="artworkSrc" class="w-4 h-4 text-blue-500 border-gray-300 cursor-pointer focus:ring-blue-500">
          <label for="artwork-src-upload" class="block pl-2 text-sm font-medium leading-6 cursor-pointer">Local file</label>
        </div>
      </fieldset>
      
    </div>
    
    <div v-if="artworkSrc === 'upload'" class="mt-4">
      <InputWithLabel id="tv_dir" v-model="artworkSrcFilepath">
        Artwork File Location
        <template v-slot:afterInput>
          <div class="flex items-center gap-x-2">
            <Button :disabled="store.loading || !artworkSrcFilepath" @click="replaceArtwork">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
                <path d="M8.75 6h-1.5V3.56L6.03 4.78a.75.75 0 0 1-1.06-1.06l2.5-2.5a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 1 1-1.06 1.06L8.75 3.56V6H11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.25v5.25a.75.75 0 0 0 1.5 0V6Z" />
              </svg>
              Replace
            </Button>
            <DirSelect v-model="artworkSrcFilepath" :directory="false" defaultPath="%HomeDrive%"/>
          </div>
        </template>
      </InputWithLabel>
    </div>
    
    <div v-if="artworkSrc === 'url'" class="mt-4">
      
      <InputWithLabel id="artwork-url" class="" v-model="artworkSrcUrl">
        Artwork URL
        <template v-slot:afterInput>
          <Button :disabled="store.loading || !artworkSrcUrl" @click="replaceArtwork">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
              <path d="M8.75 6h-1.5V3.56L6.03 4.78a.75.75 0 0 1-1.06-1.06l2.5-2.5a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 1 1-1.06 1.06L8.75 3.56V6H11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.25v5.25a.75.75 0 0 0 1.5 0V6Z" />
            </svg>
            Replace
          </Button>
          <Button variant="secondary" @click="getArtworksFromTvdb" :disabled="!tvdbID || store.loading">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path d="M12 5H4v4h8V5Z" />
              <path fill-rule="evenodd" d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4v1.5h2.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H6V12H2a1 1 0 0 1-1-1V3Zm1.5 7.5v-7h11v7h-11Z" clip-rule="evenodd" />
            </svg>
            Load TVDB Artworks
          </Button>
        </template>
      </InputWithLabel>
      
      <div v-if="artworks.length" class="mt-4">
        <div class="flex items-center gap-6">
          <div class="text-sm font-medium uppercase text-slate-200">
            Artworks ({{ artworks.length }})
          </div>
          <button type="button" @click="showArtworks = !showArtworks" class="text-white">
            <span v-if="showArtworks" class="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
              </svg>
              hide
            </span>
            <span v-if="!showArtworks" class="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 ">
                <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
              </svg>
              show
            </span>
          </button>
        </div>
        <TransitionExpand>
          <div v-show="showArtworks" class="flex flex-wrap gap-2 mt-2">
            <button
              v-for="artwork in artworks"
              type="button"
              :class="{
                'w-80': type === 'show',
                'w-40': type === 'movie',
                'ring-[2px] ring-green-400 ring-offset-[2px] ring-offset-slate-800': artworkSrcUrl === artwork.image
              }"
              @click="artworkSrcUrl = artwork.image; replaceArtwork()"
              >
                <img :src="artwork.image">
            </button>
          </div>
        </TransitionExpand>
      </div>
      
    </div>
    
  </div>
  
</template>