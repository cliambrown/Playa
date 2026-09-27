<script setup>
import { ref, watch, onBeforeMount, onMounted, onBeforeUnmount } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { store } from '../store';
import InputWithLabel from './InputWithLabel.vue';
import CloseIcon from '../icons/CloseIcon.vue';
import TvIcon from '../icons/TvIcon.vue';
import MovieIcon from '../icons/MovieIcon.vue';
import YoutubeIcon from '../icons/YoutubeIcon.vue';

const show = defineModel();

const panel = ref(null);
const searchInputRef = ref(null);
const searchStrInput = ref(store.search_string);
const loadingMsg = ref(null);

let updateSearchStrTimeoutId = null;

onClickOutside(panel, e => show.value = false);

onMounted(() => {
  searchInputRef.value.input.focus();
});

watch(
  () => show.value,
  (newVal) => { 
    if (newVal) {
      window.setTimeout(() => {
        searchInputRef.value.input.focus();
      }, 10);
    }
  }
);

function updateSearchStr(newVal) {
  loadingMsg.value = 'Loading...';
  window.clearTimeout(updateSearchStrTimeoutId);
  updateSearchStrTimeoutId = window.setTimeout(() => {
    store.searchAllItems(newVal);
    loadingMsg.value = null;
  }, 500);
}
watch(searchStrInput, newVal => updateSearchStr(newVal));

function handleKeydown(event) {
  switch (event.key) {
    case 'Escape':
      store.show_search = false;
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
  <Transition name="backdrop-fade">
    <div
      v-show="show"
      class="z-20 relative"
      aria-labelledby="modal-title" role="dialog" aria-modal="true"
      >
      <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"></div>
      <div class="z-20 fixed inset-0 w-screen h-screen">
        <Transition name="panel-fade">
          <div v-show="show" class="flex justify-center items-start p-4 h-full text-center">
            
            <div ref="panel" class="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-xl max-h-full text-gray-900 text-left transition-all transform">
              
              <div class="px-6 pt-6">
                <div class="flex justify-between">
                  <h3 class="font-semibold text-lg">
                    Search Titles
                  </h3>
                  <Button variant="close" :circular="true" @click="show = false" class="-mt-3 -mr-3">
                    <CloseIcon />
                  </Button>
                </div>
                <div class="mt-2">
                  <InputWithLabel v-model="searchStrInput" ref="searchInputRef" id="search-items" :withLabel="false" :isDark="false" :isSearch="true" class="w-full"></InputWithLabel>
                </div>
                <div class="mt-4 text-gray-600">
                  {{ store.search_results.length }} matches
                </div>
              </div>
              
              <div class="px-4 pb-6 overflow-y-auto">
                <div v-if="loadingMsg && !store.search_results.length" class="mt-4 px-2 text-gray-600">
                  {{ loadingMsg }}
                </div>
                <div v-for="itemInfo in store.search_results" class="overflow-x-visible">
                  <RouterLink :to="{ name: 'item', params: { id: itemInfo.id } }" class="group flex justify-start items-center gap-2 hover:bg-gray-100 focus:bg-blue-500 mt-2 px-2 py-2 rounded-sm focus:outline-hidden focus:text-white transition duration-150 ease-in-out">
                    <span class="text-slate-600 group-focus:text-white shrink">
                      <template v-if="itemInfo.type === 'movie'">
                        <MovieIcon />
                      </template>
                      <template v-else-if="itemInfo.source === 'ytPlaylist'">
                        <YoutubeIcon />
                      </template>
                      <template v-else>
                        <TvIcon />
                      </template>
                    </span>
                    <div class="overflow-hidden text-ellipsis whitespace-nowrap grow">
                      {{ itemInfo.name }}
                    </div>
                  </RouterLink>
                </div>
              </div>
              
            </div>
            
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@reference 'tailwindcss';
.backdrop-fade-enter-active { @apply duration-300 ease-out; }
.backdrop-fade-enter-from { @apply opacity-0; }
.backdrop-fade-enter-to { @apply opacity-100; }
.backdrop-fade-leave-active { @apply duration-200 ease-in; }
.backdrop-fade-leave-from { @apply opacity-100; }
.backdrop-fade-leave-to { @apply opacity-0; }

.panel-fade-enter-active { @apply duration-300 ease-out; }
.panel-fade-enter-from { @apply opacity-0 sm:scale-95 translate-y-4 sm:translate-y-0; }
.panel-fade-enter-to { @apply opacity-100 sm:scale-100 translate-y-0; }
.panel-fade-leav-active { @apply duration-200 ease-in; }
.panel-fade-leave-from { @apply opacity-100 sm:scale-100 translate-y-0; }
.panel-fade-leave-to { @apply opacity-0 sm:scale-95 translate-y-4 sm:translate-y-0; }
</style>