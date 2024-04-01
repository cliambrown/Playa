<script setup>
import { computed, ref, watch, onBeforeMount, onBeforeUnmount } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';
import { save } from '@tauri-apps/api/dialog';
import { TransitionExpand } from '@morev/vue-transitions';
import { store } from '../store.js'
import { useGet, useOpenOrHomeDir, useAlphaName } from '../helpers';
import { searchShow, getEpisodes, getBanners } from '../tvdb';
import Button from '../components/Button.vue';
import EpisodeCard from '../components/EpisodeCard.vue';
import InputWithLabel from '../components/InputWithLabel.vue';
import DirSelect from '../components/DirSelect.vue';

let updateTimeoutId = null;
let updateMsgTimoutId = null;
let updateFilterStrTimeoutId = null;

const showEdit = ref(false);
const showMatches = ref(true);
// const bannerAssetUrl = ref('');
const bannerSrc = ref('url');
const bannerSrcUrl = ref('');
const bannerSrcFilepath = ref('');
const banners = ref([]);
const filterStr = ref('');
const filterStrDebounced = ref('');

const show = computed(() => store.shows[store.route.params.id]);
const bannerAssetUrl = computed(() => {
  return store.banner_dir_url +
    (show.value
      ? show.value.banner_filename
      : 'blank.jpg');
});

// const bannerFilename = computed(() => show.value ? show.value.banner_filename : null);
// const localDataDir = computed(() => store.local_data_dir);
// async function setBannerAssetUrl() {
//   if (!localDataDir.value) return false;
//   let filename = bannerFilename.value;
//   if (!filename || typeof filename !== 'string') filename = 'blank.jpg';
//   const filePath = await join(localDataDir.value, 'banners', filename);
//   bannerAssetUrl.value = convertFileSrc(filePath);
//   console.log(bannerAssetUrl.value)
// }
// setBannerAssetUrl(show.value ? show.value.banner_filename : null);
// watch(
//   [bannerFilename, localDataDir],
//   newVal => setBannerAssetUrl()
// )

async function handleUpdate() {
  if (!store.loaded_from_db) return false;
  window.clearTimeout(updateTimeoutId);
  window.clearTimeout(updateMsgTimoutId);
  store.loading_msg = 'Waiting...'
  updateTimeoutId = window.setTimeout(async () => {
    store.loading_msg = 'Saving...'
    const response = await show.value.saveToDB();
    console.log('show handleUpdate', response);
    if (parseInt(useGet(response, 'rowsAffected'))) {
      store.loading_msg = 'Show saved';
      updateMsgTimoutId = window.setTimeout(() => {
        store.loading_msg = ''
      }, 5000);
    }
  }, 500);
}

function openTvdbSlug(slug) {
  if (slug) open('https://www.thetvdb.com/series/' + slug);
}

async function searchShowInTvdb() {
  if (!show || !show.value.name) return false;
  const matches = await searchShow(store, show.value.name);
  if (!matches || !Array.isArray(matches)) return false;
  show.value.tvdb_matches = matches;
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
}

async function updateEpisodesFromTvdb() {
  if (!show || !show.value.tvdb_id) return false;
  const tvdbEpisodes = await getEpisodes(store, show.value.tvdb_id);
  if (!tvdbEpisodes) return false;
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
        episode.name = tvdbEpisode.name;
        episode.overview = tvdbEpisode.overview;
        const aired = tvdbEpisode.aired;
        if (aired && typeof aired === 'string' && /^[\d]{4}-[\d]{2}-[\d]{2}$/.test(aired)) {
          const [y, m, d] = aired.split('-');
          const date = new Date(y, (m-1), d);
          episode.released_on = date.getTime() / 1000;
        }
        episode.saveToDB();
        break;
      }
    }
  }
}

async function getBannersFromTvdb() {
  if (!show || !show.value.tvdb_id) return false;
  // const tvdbBanners = await getBanners(store, show.value.tvdb_id);
  // if (!tvdbBanners) return false;
  // banners.value = tvdbBanners;
  banners.value = [
    {
        "id": 733651,
        "image": "https://artworks.thetvdb.com/banners/graphical/194031-g.jpg",
        "thumbnail": "https://artworks.thetvdb.com/banners/graphical/194031-g_t.jpg",
        "language": "eng",
        "type": 1,
        "score": 100007,
        "width": 758,
        "height": 140,
        "includesText": true,
        "thumbnailWidth": 0,
        "thumbnailHeight": 0,
        "updatedAt": 0,
        "status": {
            "id": 0,
            "name": null
        },
        "tagOptions": null
    },
    {
        "id": 1010095,
        "image": "https://artworks.thetvdb.com/banners/graphical/194031-g3.jpg",
        "thumbnail": "https://artworks.thetvdb.com/banners/graphical/194031-g3_t.jpg",
        "language": "eng",
        "type": 1,
        "score": 100004,
        "width": 758,
        "height": 140,
        "includesText": true,
        "thumbnailWidth": 0,
        "thumbnailHeight": 0,
        "updatedAt": 0,
        "status": {
            "id": 0,
            "name": null
        },
        "tagOptions": null
    },
    {
        "id": 1227345,
        "image": "https://artworks.thetvdb.com/banners/graphical/194031-g4.jpg",
        "thumbnail": "https://artworks.thetvdb.com/banners/graphical/194031-g4_t.jpg",
        "language": "eng",
        "type": 1,
        "score": 100000,
        "width": 758,
        "height": 140,
        "includesText": true,
        "thumbnailWidth": 0,
        "thumbnailHeight": 0,
        "updatedAt": 0,
        "status": {
            "id": 0,
            "name": null
        },
        "tagOptions": null
    },
    {
        "id": 62561947,
        "image": "https://artworks.thetvdb.com/banners/v4/series/194031/banners/6070af335a20f.jpg",
        "thumbnail": "https://artworks.thetvdb.com/banners/v4/series/194031/banners/6070af335a20f_t.jpg",
        "language": null,
        "type": 1,
        "score": 100000,
        "width": 758,
        "height": 140,
        "includesText": false,
        "thumbnailWidth": 0,
        "thumbnailHeight": 0,
        "updatedAt": 0,
        "status": {
            "id": 0,
            "name": null
        },
        "tagOptions": null
    }
];
}

async function replaceBanner() {
  if (bannerSrc.value === 'upload') {
    if (!bannerSrcFilepath.value) return false;
    store.loading = true;
    let response;
    try {
      response = await invoke('copy_local_image', {
        srcPathname: bannerSrcFilepath.value,
        currentBannerPathnames: []
      });
    } catch (error) {
      window.alert(error);
      store.loading = false;
      return false;
    }
    console.log('replaceBanner', response);
    store.loading = false;
  }
}

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      show.value.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev')
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
  
  <div v-if="!!show" class="max-w-3xl mx-auto dark">
    
    <img :src="bannerAssetUrl">
    <!-- <img :src="'https://asset.localhost/C%3A%5CUsers%5CLiam%5CAppData%5CLocal%5Ccom.tauri.dev%5Cbanners%5C' + 'bb.jpg'"> -->
    
    <div class="flex mt-4">
      <h2 class="text-2xl text-slate-200">
        {{ show.name }}
      </h2>
      <!-- <RouterLink :to="{ name: 'clearPlayback' }" class="px-1 py-2 ml-auto font-medium text-blue-300 transition duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-gray-600 hover:text-blue-400">
        Clear playback positions
      </RouterLink> -->
    </div>
    
    <div class="flex gap-8 mt-6">
      
      <Button variant="black" @click="showEdit = !showEdit">
        <svg v-show="!showEdit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" clip-rule="evenodd" />
        </svg>
        <svg v-show="showEdit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
        Edit
      </Button>
      
      <Button variant="archive" @click="toggleArchived">
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
      
      <Button variant="link" @click="openTvdbSlug(show.tvdb_slug)" :disabled="!show.tvdb_slug">
        <span class="relative bottom-[1px]">📺</span>
        TVDB
      </Button>
      
      <Button variant="local-link" @click="useOpenOrHomeDir(store.settings.tv_dir + '/' + show.dir_name)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
        </svg>
        {{ show.dir_name }}
      </Button>
      
    </div>
    
    <TransitionExpand>
      <form action="" method="get" @submit.prevent v-show="showEdit" class="pt-1 pb-8" autocapitalize="false" autocomplete="off">
        
        <InputWithLabel class="max-w-2xl mt-8" id="name" v-model="show.name" :readonly="store.loading" @input="handleUpdate">
          Name
          <template v-slot:afterInput>
            <Button @click="searchShowInTvdb">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
              </svg>
              Search TVDB
            </Button>
          </template>
        </InputWithLabel>
        
        <div v-if="show.tvdb_matches.length" class="mt-4">
          <div class="mb-1 text-sm font-medium text-slate-200">
            Search results ({{ show.tvdb_matches.length }})
            <button type="button" @click="showMatches = !showMatches" class="ml-6 text-white">
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
              <li v-for="match in show.tvdb_matches" class="flex flex-wrap gap-2 my-2">
                <Button @click="selectTvdbMatch(match)" whitespace="normal">
                  {{ match.name }}
                  ({{ match.country }} {{ match.year }})
                </Button>
                <Button variant="black" @click="openTvdbSlug(match.slug)">
                  <span class="relative bottom-0.5">📺</span>
                  <span>TVDB</span>
                </Button>
              </li>
            </ul>
          </TransitionExpand>
        </div>
        
        <div class="flex flex-wrap gap-8 mt-4">
          
          <div class="">
            <InputWithLabel class="max-w-40" id="tvdb_id" v-model="show.tvdb_id" :readonly="store.loading" @input="handleUpdate">
              TVDB ID
            </InputWithLabel>
          </div>
          
          <div class="">
            <InputWithLabel class="max-w-72" id="tvdb_slug" v-model="show.tvdb_slug" :readonly="store.loading" @input="handleUpdate">
              TVDB Slug
            </InputWithLabel>
          </div>
          
          <div>
            <InputWithLabel :datepicker="true" id="last_watched_at" v-model="show.last_watched_at" :readonly="store.loading" @input="handleUpdate">
              Last Watched At
            </InputWithLabel>
          </div>
          
        </div>
        
        <div class="flex items-center mt-8">
          
          <fieldset class="flex flex-wrap items-center gap-x-6">
            <div>
              <legend class="text-sm font-medium text-slate-200">
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
          
          <div class="ml-auto">
            <Button :disabled="store.loading || (bannerSrc === 'url' && !bannerSrcUrl) || (bannerSrc === 'upload' && !bannerSrcFilepath)" @click="replaceBanner">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clip-rule="evenodd" />
              </svg>
              Replace Banner
            </Button>
          </div>
          
        </div>
        
        <div v-if="bannerSrc === 'url'" class="mt-4">
          
          <InputWithLabel id="banner-url" class="max-w-2xl" v-model="bannerSrcUrl">
            URL
            <template v-slot:afterInput>
            <Button @click="getBannersFromTvdb" :disabled="!show.tvdb_id || store.loading">
              <span class="relative bottom-[1px]">📺</span>
              Get from TVDB
            </Button>
          </template>
          </InputWithLabel>
          
          <div v-if="banners.length" class="flex flex-wrap gap-2 mt-4">
            <button type="button" v-for="banner in banners" class=" w-80" @click="bannerSrcUrl = banner.image">
              <img :src="banner.image">
            </button>
          </div>
          
        </div>
        
        <div v-if="bannerSrc !== 'url'" class="mt-4">
          <InputWithLabel id="tv_dir" v-model="bannerSrcFilepath">
            File location
            <template v-slot:afterInput>
              <div class="flex items-center gap-x-2">
                <DirSelect v-model="bannerSrcFilepath" :directory="false" defaultPath="%HomeDrive%"/>
              </div>
            </template>
          </InputWithLabel>
        </div>
        
      </form>
    </TransitionExpand>
    
    <div class="flex items-center mt-12 gap-x-4">
      <h3 class="text-xl text-slate-200">
        {{ show.episode_ids.length }}
        Episodes
        {{ filterStrDebounced }}
      </h3>
      <Button @click="updateEpisodesFromTvdb" :disabled="!show.tvdb_id || store.loading">
        <span class="relative bottom-[1px]">📺</span>
        Update from TVDB
      </Button>
      <InputWithLabel class="ml-auto" :with-label="false" :is-search="true" v-model="filterStr"></InputWithLabel>
    </div>
    
    <div class="mt-8">
      
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