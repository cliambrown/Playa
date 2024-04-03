<script setup>
import { computed, ref, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { store } from '../store.js';
import { ExternalItem } from '../classes/ExternalItem';
import { useGet } from '../helpers';
import { getArtwork, searchTvdb } from '../tvdb';
import DirSelect from '../components/DirSelect.vue';
import { invoke } from '@tauri-apps/api';

const paramID = useGet(store, 'route.params.id');
if (!paramID) {
  store.new_external_item = new ExternalItem({is_new: true});
}

const item = computed(() => {
  return paramID
    ? store.external_items[paramID]
    : store.new_external_item;
});

const showMatches = ref(true);
const bannerSrc = ref('url');
const bannerSrcUrl = ref('');
const bannerSrcFilepath = ref('');
const banners = ref([]);
const showBanners = ref(true);

let updateTimeoutId = null;
let updateMsgTimoutId = null;

const bannerAssetUrl = computed(() => {
  return (store.banner_dir_url && item.value && item.value.banner_filename)
    ? store.banner_dir_url + item.value.banner_filename
    : '/assets/blank_banner.jpg';
});

function openTvdbSlug(slug) {
  if (slug) open('https://www.thetvdb.com/series/' + slug);
}

function toggleArchived() {
  item.value.is_archived = item.value.is_archived ? 0 : 1;
  handleUpdate();
}

async function deleteItem() {
  if (!item.value || !item.value.id) return false;
  const confirmed = await confirm('Are you sure you want to delete this item?', { title: 'Playa - Delete Item', type: 'warning' });
  if (!confirmed) return false;
  await item.value.delete();
  store.loading_msg = 'Item deleted';
  store.router.push({ name: 'home' });
}

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

async function searchShowInTvdb() {
  if (!item.value || !item.value.name) return false;
  const matches = await searchTvdb(store, item.value.name, 'show');
  if (!matches || !Array.isArray(matches)) return false;
  item.value.tvdb_matches = matches;
  showMatches.value = true;
}

function selectTvdbMatch(match) {
  item.value.name = match.name;
  item.value.tvdb_id = match.tvdb_id;
  item.value.tvdb_slug = match.slug;
  handleUpdate();
}

async function getBannersFromTvdb() {
  if (!item.value || !item.value.tvdb_id) return false;
  const tvdbBanners = await getArtwork(store, item.value.tvdb_id, 'show');
  if (!tvdbBanners) return false;
  banners.value = tvdbBanners;
  showBanners.value = true;
}

async function replaceBanner() {
  if (!item.value.id) return false;
  const oldFilename = item.value.banner_filename;
  const newFilename = `show-${item.value.id}-${Date.now()}`;
  let response, invokeFn, params;
  if (bannerSrc.value === 'url') {
    if (!bannerSrcUrl.value) return false;
    store.loading = true;
    invokeFn = 'download_image';
    params = {
      srcUrl: bannerSrcUrl.value,
      newFilename: newFilename,
      destFolder: 'banners',
    };
  } else if (bannerSrc.value === 'upload') {
    if (!bannerSrcFilepath.value) return false;
    store.loading = true;
    invokeFn = 'copy_local_image';
    params = {
      srcPathname: bannerSrcFilepath.value,
      newFilename: newFilename,
      destFolder: 'banners',
    };
  }
  try {
    response = await invoke(invokeFn, params);
  } catch (error) {
    window.alert(error);
    store.loading = false;
    return false;
  }
  console.log('replaceBanner', response);
  if (newFilename === response.split('.')[0]) {
    item.value.banner_filename = response;
    handleUpdate();
    if (oldFilename) {
      invoke('delete_image', {
        deleteFilename: oldFilename,
        fromFolder: 'banners',
      });
    }
  }
  store.loading = false;
}

function handleKeydown(event) {
  switch (event.key) {
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
  
  <div v-if="!!item" class="flex flex-col max-w-5xl max-h-full px-4 pt-8 mx-auto grow">
    
    <div>
      <img :src="bannerAssetUrl">
    </div>
    
    <div class="flex items-center mt-4 gap-x-4">
      
      <h2 class="text-2xl text-slate-200 grow">
        {{ item.id ? item.name : 'New Item' }}
      </h2>
      
      <Button variant="link" @click="openTvdbSlug(item.tvdb_slug)" :disabled="!item.tvdb_slug">
        <span class="relative bottom-[1px]">📺</span>
        TVDB
      </Button>
        
      <Button variant="archive" @click="toggleArchived" :disabled="store.loading || !item.id">
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
      
    </div>
    
    <form action="" method="get" @submit.prevent class="pt-1 pb-4" autocapitalize="false" autocomplete="off">
      
      <InputWithLabel class="mt-4" id="url" v-model="item.url" :readonly="store.loading" @input="handleUpdate">
        URL
      </InputWithLabel>
      
      <div v-if="item.id">
        
        <InputWithLabel class="mt-4" id="name" v-model="item.name" :readonly="store.loading">
          Name
          <template v-slot:afterInput>
            <Button variant="action-secondary" @click="searchShowInTvdb">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
              </svg>
              Search TVDB
            </Button>
          </template>
        </InputWithLabel>
        
        <div v-if="item.tvdb_matches.length" class="mt-4">
          <div class="flex items-center gap-6">
            <div class="text-sm font-medium uppercase text-slate-200">
              Search results ({{ item.tvdb_matches.length }})
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
              <li v-for="match in item.tvdb_matches" class="flex flex-wrap gap-2 my-2">
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
          
          <InputWithLabel class="max-w-40" id="tvdb_id" v-model="item.tvdb_id" :readonly="store.loading" @input="handleUpdate">
            TVDB ID
          </InputWithLabel>
        
          <InputWithLabel class="max-w-72" id="tvdb_slug" v-model="item.tvdb_slug" :readonly="store.loading" @input="handleUpdate">
            TVDB Slug
          </InputWithLabel>
        
          <InputWithLabel :datepicker="true" id="last_watched_at" v-model="item.last_watched_at" :readonly="store.loading" @input="handleUpdate">
            Last Watched At
          </InputWithLabel>
          
        </div>
      
        <div class="flex items-center mt-4 gap-x-4">
          
          <fieldset class="flex flex-wrap items-center gap-x-6">
            <div>
              <legend class="text-sm font-medium uppercase text-slate-200">
                Replace banner from:
              </legend>
            </div>
            <div class="flex items-center">
              <input id="banner-src-url" name="banner-src" type="radio" value="url" v-model="bannerSrc" class="w-4 h-4 text-blue-500 border-gray-300 cursor-pointer focus:ring-blue-500">
              <label for="banner-src-url" class="block pl-2 text-sm font-medium leading-6 cursor-pointer">URL</label>
            </div>
            <div class="flex items-center">
              <input id="banner-src-upload" name="banner-src" type="radio" value="upload" v-model="bannerSrc" class="w-4 h-4 text-blue-500 border-gray-300 cursor-pointer focus:ring-blue-500">
              <label for="banner-src-upload" class="block pl-2 text-sm font-medium leading-6 cursor-pointer">Upload</label>
            </div>
          </fieldset>
          
          <Button :disabled="store.loading || (bannerSrc === 'url' && !bannerSrcUrl) || (bannerSrc === 'upload' && !bannerSrcFilepath)" @click="replaceBanner" class="ml-auto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clip-rule="evenodd" />
            </svg>
            Replace Banner
          </Button>
          
        </div>
        
        <div v-if="bannerSrc === 'upload'" class="mt-4">
          <InputWithLabel id="tv_dir" v-model="bannerSrcFilepath">
            Banner File Location
            <template v-slot:afterInput>
              <div class="flex items-center gap-x-2">
                <DirSelect v-model="bannerSrcFilepath" :directory="false" defaultPath="%HomeDrive%"/>
              </div>
            </template>
          </InputWithLabel>
        </div>
        
        <div v-if="bannerSrc === 'url'" class="mt-4">
          
          <InputWithLabel id="banner-url" class="" v-model="bannerSrcUrl">
            Banner URL
            <template v-slot:afterInput>
            <Button variant="action-secondary" @click="getBannersFromTvdb" :disabled="!item.tvdb_id || store.loading">
              <span class="relative bottom-[1px]">📺</span>
              Load TVDB Banners
            </Button>
          </template>
          </InputWithLabel>
          
          <div v-if="banners.length" class="mt-4">
            <div class="flex items-center gap-6">
              <div class="text-sm font-medium uppercase text-slate-200">
                Banners ({{ banners.length }})
              </div>
              <button type="button" @click="showBanners = !showBanners" class="text-white">
                <span v-if="showBanners" class="inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
                  </svg>
                  hide
                </span>
                <span v-if="!showBanners" class="inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 ">
                    <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                  </svg>
                  show
                </span>
              </button>
            </div>
            <TransitionExpand>
              <div v-show="showBanners" class="flex flex-wrap gap-2 mt-2">
                <button type="button" v-for="banner in banners" class=" w-80" @click="bannerSrcUrl = banner.image">
                  <img :src="banner.image">
                </button>
              </div>
            </TransitionExpand>
          </div>
          
        </div>
        
      </div>
      
    </form>
    
  </div>
</template>