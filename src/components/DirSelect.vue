<script setup>
import { open } from '@tauri-apps/api/dialog';

const props = defineProps({
  defaultPath: {
    type: String,
    default: ''
  },
  directory: {
    type: Boolean,
    default: true
  },
});

const emit = defineEmits(['select']);

const dir = defineModel();

const openDir = async () => {
  const selected = await open({
    directory: props.directory,
    multiple: false,
    defaultPath: props.defaultPath,
  });
  if (selected !== null) {
    dir.value = selected;
    emit('select');
  }
}
</script>

<template>
  <Button variant="action-secondary" @click="openDir">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
      <path fill-rule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 4H9.621a1.5 1.5 0 0 1-1.06-.44L7.439 2.44A1.5 1.5 0 0 0 6.38 2H3.5ZM8 6a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 8 6Z" clip-rule="evenodd" />
    </svg>
    Select
  </Button>
</template>