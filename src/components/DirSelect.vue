<script setup>
import { open } from '@tauri-apps/plugin-dialog';
import BrowseFoldersIcon from '../icons/BrowseFoldersIcon.vue';

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
  <Button variant="secondary" @click="openDir">
    <BrowseFoldersIcon />
    Browse
  </Button>
</template>