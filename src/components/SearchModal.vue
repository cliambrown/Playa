<script setup>
import { ref, watch, onBeforeMount, onMounted, onBeforeUnmount } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { store } from '../store';
import InputWithLabel from './InputWithLabel.vue';

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
      class="relative z-20"
      aria-labelledby="modal-title" role="dialog" aria-modal="true"
      >
      <div class="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"></div>
      <div class="fixed inset-0 z-20 w-screen h-screen">
        <Transition name="panel-fade">
          <div v-show="show" class="flex items-start justify-center h-full p-4 text-center">
            
            <div ref="panel" class="flex flex-col w-full max-w-xl max-h-full text-left text-gray-900 transition-all transform bg-white rounded-lg shadow-xl">
              
              <div class="px-6 pt-6">
                <div class="flex justify-between">
                  <h3 class="text-lg font-semibold">
                    Search Titles
                  </h3>
                  <Button variant="close" @click="show = false" class="-mt-3 -mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 -mx-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
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
                <div v-if="loadingMsg && !store.search_results.length" class="px-2 mt-4 text-gray-600">
                  {{ loadingMsg }}
                </div>
                <div v-for="itemInfo in store.search_results" class="overflow-x-visible">
                  <RouterLink :to="{ name: itemInfo.route_name, params: { id: itemInfo.id } }" class="flex items-center gap-2 px-2 py-2 mt-2 transition duration-150 ease-in-out rounded hover:bg-gray-100 focus:outline-none focus:bg-blue-500 focus:text-white">
                    <div class="overflow-hidden font-semibold grow text-ellipsis whitespace-nowrap">
                      {{ itemInfo.name }}
                    </div>
                    <div class="shrink-0">
                      <div class="w-20 text-right">
                        <div class="inline-block px-2 text-sm bg-gray-100 rounded-full text-slate-900">
                          {{ itemInfo.type }}
                        </div>
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 shrink-0">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
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
.backdrop-fade-enter-active { @apply ease-out duration-300; }
.backdrop-fade-enter-from { @apply opacity-0; }
.backdrop-fade-enter-to { @apply opacity-100; }
.backdrop-fade-leave-active { @apply ease-in duration-200; }
.backdrop-fade-leave-from { @apply opacity-100; }
.backdrop-fade-leave-to { @apply opacity-0; }

.panel-fade-enter-active { @apply ease-out duration-300; }
.panel-fade-enter-from { @apply opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95; }
.panel-fade-enter-to { @apply opacity-100 translate-y-0 sm:scale-100; }
.panel-fade-leav-active { @apply ease-in duration-200; }
.panel-fade-leave-from { @apply opacity-100 translate-y-0 sm:scale-100; }
.panel-fade-leave-to { @apply opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95; }
</style>