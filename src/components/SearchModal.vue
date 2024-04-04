<script setup>
import { ref, watch, onBeforeMount, onMounted, onBeforeUnmount } from 'vue';
import { onClickOutside } from '@vueuse/core';
import InputWithLabel from './InputWithLabel.vue';

const show = defineModel();

const panel = ref(null);
const searchInput = ref(null);

onClickOutside(panel, e => show.value = false);

function handleKeydown(event) {
  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      show.value = false;
      break;
    case 'ArrowRight':
    case 'ArrowLeft':
    case 'ArrowDown':
    case 'ArrowUp':
    case ' ':
      event.preventDefault();
      break;
  }
  return true;
}

onMounted(() => {
  searchInput.value.input.focus();
});

watch(
  () => show.value,
  (newVal) => { 
    if (newVal) {
      window.setTimeout(() => {
        searchInput.value.input.focus();
      }, 10);
    }
  }
);

onBeforeMount(() => {
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});

</script>

<template>
  <Transition name="backdrop-fade">
    <div v-show="show" class="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"></div>
      <div class="fixed inset-0 z-10 w-screen h-screen">
        <Transition name="panel-fade">
          <div v-show="show" class="flex items-start justify-center h-full p-4 text-center">
            
            <div ref="panel" class="flex flex-col w-full max-w-xl max-h-full gap-6 p-6 text-left text-gray-900 transition-all transform bg-white rounded-lg shadow-xl">
              
              <div class="flex items-center gap-6">
                <div class="grow">
                  <InputWithLabel ref="searchInput" id="search-items" :withLabel="false" :isDark="false" :isSearch="true" class="w-full"></InputWithLabel>
                </div>
                <Button variant="gray" @click="show = false">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 -mx-1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              <div class="overflow-y-auto">
                
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