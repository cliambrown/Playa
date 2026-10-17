<script setup>
import { CirclePlus, Eye, EyeOff, Film, FolderSearch, Keyboard, RefreshCcw, Search, Tv } from '@lucide/vue';
import { TransitionExpand } from '@morev/vue-transitions';
import { onClickOutside } from '@vueuse/core';
import { onBeforeMount, onBeforeUnmount, ref } from 'vue';
import ItemCard from '../components/ItemCard.vue';
import SearchModal from '../components/SearchModal.vue';
import { useGetProp } from '../helpers';
import YoutubeIcon from '../icons/YoutubeIcon.vue';
import { store } from '../store';

let ctrlIsDown = false;

const keyboardMenu = ref(null);
const showKeyboardMenu = ref(false);
function toggleShowKeyboardMenu() {
  showKeyboardMenu.value = !showKeyboardMenu.value;
}
onClickOutside(keyboardMenu, e => { if (showKeyboardMenu.value) showKeyboardMenu.value = false } );

const scanMenu = ref(null);
const showScanMenu = ref(false);
function toggleShowScanMenu() {
  showScanMenu.value = !showScanMenu.value;
}
onClickOutside(scanMenu, e => { if (showScanMenu.value) showScanMenu.value = false } );

const extItemMenu = ref(null);
const showExtItemMenu = ref(false);
function toggleShowExtItemMenu() {
  showExtItemMenu.value = !showExtItemMenu.value;
}
onClickOutside(extItemMenu, e => { if (showExtItemMenu.value) showExtItemMenu.value = false });

async function toggleShowFinished() {
  if (
    store.show_finished_items
    && store.home_selected_item_id
    && store.items[store.home_selected_item_id].current_episode_id === null
  ) {
    store.selectFirstHomeItem();
  }
  store.show_finished_items = !store.show_finished_items;
}

async function refresh() {
  if (store.loading) return false;
  store.loading = true;
  store.setStatusMsg(null);
  await store.loadFromDB();
  await store.getPlaybackPositions();
  store.selectFirstHomeItem();
  store.selectFirstArchivesItem();
  store.loading = false;
}

function scanShows() {
  store.scanShows();
}

function scanMovies() {
  store.scanMovies();
}

function updateAllYtPlaylistsFromSource() {
  store.updateAllYtPlaylistsFromSource(true);
}

function handleKeydown(event) {
  if (store.show_search) return false;
  let item;
  switch (event.key) {
    case 'Control':
      ctrlIsDown = true;
      break;
    case 'k':
      if (ctrlIsDown) {
        event.preventDefault();
        store.show_search = !store.show_search;
      }
      break;
    case 'ArrowLeft':
      event.preventDefault();
      store.homeItemNav(false)
      break;
    case 'ArrowRight':
      event.preventDefault();
      store.homeItemNav(true);
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      item = useGetProp(store.items, store.home_selected_item_id);
      if (item) item.episodeNav(event.key === 'ArrowDown' ? 'next' : 'prev');
      break;
    case ' ':
      event.preventDefault();
      item = useGetProp(store.items, store.home_selected_item_id);
      if (item) item.play();
      break;
    case 'r':
      if (ctrlIsDown) {
        event.preventDefault();
        refresh();
      }
      break;
    case 'Enter':
      item = useGetProp(store.items, store.home_selected_item_id);
      if (item) {
        event.preventDefault();
        store.router.push({ name: 'item', params: { id: item.id } });
      }
      break;
    case 't':
      item = useGetProp(store.items, store.home_selected_item_id);
      if (item) {
        event.preventDefault();
        item.openTvdbSlug();
      }
      break;
    case 'f':
      item = useGetProp(store.items, store.home_selected_item_id);
      if (item) {
        event.preventDefault();
        item.openFileOrFolder();
      }
      break;
  }
  return true;
}

function handleKeyup(event) {
  if (event.key === 'Control') ctrlIsDown = false;
}

onBeforeMount(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
});

</script>

<template>
  
  <div class="px-12 pt-8 pb-20 overflow-y-scroll grow">
    
    <div class="flex justify-end gap-6">
      
      <div class="relative" ref="keyboardMenu">
        
        <Button :variant="showKeyboardMenu ? 'link-bg' : 'link'" :square="true" @click="toggleShowKeyboardMenu">
          <Keyboard class="size-5" />
        </Button>
        
        <!-- <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0"> -->
          <div v-if="showKeyboardMenu" class="left-1/2 z-10 absolute bg-slate-900 ring-opacity-5 shadow-black shadow-lg mt-2 px-4 py-1 border border-gray-600 rounded-md focus:outline-hidden ring-1 ring-black w-auto text-sm origin-top-center -translate-x-1/2" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            
            <table class="w-full whitespace-nowrap">
              <tbody class="*:border-gray-700 [&>*:not(:last-child)]:border-b">
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Next/prev item
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 mr-1 rounded-sm size-6">
                      →
                    </span>
                    <span class="inline-flex justify-center items-center bg-gray-700 rounded-sm size-6">
                      ←
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Next/prev episode
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 mr-1 rounded-sm size-6">
                      ↓
                    </span>
                    <span class="inline-flex justify-center items-center bg-gray-700 rounded-sm size-6">
                      ↑
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Play item
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 px-2 rounded-sm h-6">
                      Space
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Open item
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 px-2 rounded-sm h-6">
                      Enter
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Open TVDB
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 rounded-sm size-6">
                      T
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Show File/Folder
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 rounded-sm size-6">
                      F
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Search items
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 px-2 rounded-sm h-6">
                      Ctrl
                    </span>
                    +
                    <span class="inline-flex justify-center items-center bg-gray-700 rounded-sm size-6">
                      K
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Reload
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 px-2 rounded-sm h-6">
                      Ctrl
                    </span>
                    +
                    <span class="inline-flex justify-center items-center bg-gray-700 rounded-sm size-6">
                      R
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Go back
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 px-2 rounded-sm h-6">
                      Esc
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-1 py-2 pr-2">
                    Close app
                  </td>
                  <td class="px-1 py-2 text-right">
                    <span class="inline-flex justify-center items-center bg-gray-700 px-2 rounded-sm h-6">
                      Ctrl
                    </span>
                    +
                    <span class="inline-flex justify-center items-center bg-gray-700 rounded-sm size-6">
                      W
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            
          </div>
        <!-- </transition> -->
        
      </div>
      
      <Button variant="secondary" @click="toggleShowFinished" :disabled="!store.home_finished_show_ids.length">
        <EyeOff v-if="store.show_finished_items" class="size-5" />
        <Eye v-else class="size-5" />
        {{ store.home_finished_show_ids.length + store.home_finished_movie_ids.length }}
        Finished
      </Button>
      
      <Button variant="primary" @click="refresh" :disabled="store.loading">
        <RefreshCcw class="size-4" />
        Refresh
      </Button>
      
      <div class="relative" ref="scanMenu">
        
        <Button @click="toggleShowScanMenu" :disabled="store.loading">
          <FolderSearch class="size-5" />
          Scan for Updates
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </Button>
        
        <!-- <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0"> -->
          <div v-if="showScanMenu" class="left-0 z-10 absolute bg-slate-900 ring-opacity-5 shadow-black shadow-lg mt-2 border border-gray-600 rounded-md focus:outline-hidden ring-1 ring-black w-full origin-top-right" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            <div class="py-1">
              <button type="button" @click="scanShows" class="flex items-center gap-2 px-4 py-2 font-semibold text-blue-300 hover:text-blue-400 text-sm cursor-pointer">
                <Tv class="bottom-px relative size-5" />
                Local Shows
              </button>
              <button type="button" @click="scanMovies" class="flex items-center gap-2 px-4 py-2 font-semibold text-blue-300 hover:text-blue-400 text-sm cursor-pointer">
                <Film class="size-5" />
                Local Movies
              </button>
              <button type="button" @click="updateAllYtPlaylistsFromSource" class="flex justify-left items-center gap-2 px-4 py-2 font-semibold text-blue-300 hover:text-blue-400 text-sm whitespace-nowrap cursor-pointer">
                <YoutubeIcon />
                YouTube Playlists
              </button>
            </div>
          </div>
        <!-- </transition> -->
        
      </div>
      
      <div class="relative" ref="extItemMenu">
        
        <Button @click="toggleShowExtItemMenu" :disabled="store.loading">
          <CirclePlus class="size-5" />
          External Item
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </Button>
        
        <!-- <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0"> -->
          <div v-if="showExtItemMenu" class="left-0 z-10 absolute bg-slate-900 ring-opacity-5 shadow-black shadow-lg mt-2 border border-gray-600 rounded-md focus:outline-hidden ring-1 ring-black w-full origin-top-right" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabindex="-1">
            <div class="py-1">
              <RouterLink :to="{ name: 'item.create.show' }" class="flex items-center gap-2 px-4 py-2 font-semibold text-blue-300 hover:text-blue-400 text-sm">
                <Tv class="bottom-px relative size-5" />
                Show
              </RouterLink>
              <RouterLink :to="{ name: 'item.create.movie' }" class="flex items-center gap-2 px-4 py-2 font-semibold text-blue-300 hover:text-blue-400 text-sm">
                <Film class="size-5" />
                Movie
              </RouterLink>
              <RouterLink :to="{ name: 'item.create.ytPlaylist' }" class="flex items-center gap-2 px-4 py-2 font-semibold text-blue-300 hover:text-blue-400 text-sm">
                <YoutubeIcon />
                YT Playlist
              </RouterLink>
            </div>
          </div>
        <!-- </transition> -->
        
      </div>
      
      <Button variant="secondary" @click="store.show_search = true" :disabled="store.loading">
        <Search class="size-5" />
        Search
      </Button>
      
    </div>
    
    <div v-if="store.home_unfinished_show_ids.length" class="flex flex-wrap justify-center items-start gap-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,570px))] mt-12">
      <ItemCard
        v-for="itemID in store.home_unfinished_show_ids"
        :itemID="itemID"
      ></ItemCard>
    </div>
    
    <TransitionExpand>
      <div v-show="store.show_finished_items && store.home_finished_show_ids.length" class="flex flex-wrap justify-center items-start gap-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(520px,570px))] mt-12">
        <ItemCard
          v-for="itemID in store.home_finished_show_ids"
          :itemID="itemID"
        ></ItemCard>
      </div>
    </TransitionExpand>
    
    <div v-if="store.home_unfinished_movie_ids.length" class="flex flex-wrap justify-center items-start gap-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,360px))] mt-12">
      <ItemCard
        v-for="itemID in store.home_unfinished_movie_ids"
        :itemID="itemID"
      ></ItemCard>
    </div>
    
    <TransitionExpand>
      <div v-show="store.show_finished_items && store.home_finished_movie_ids.length" class="flex flex-wrap justify-center items-start gap-12 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,360px))] mt-12">
        <ItemCard
          v-for="itemID in store.home_finished_movie_ids"
          :itemID="itemID"
        ></ItemCard>
      </div>
    </TransitionExpand>
    
  </div>
    
  <SearchModal v-model="store.show_search"></SearchModal>
  
</template>