<script setup>
import { FolderSearch2 } from '@lucide/vue';
import { open } from '@tauri-apps/plugin-dialog';

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
    <FolderSearch2 class="size-5" />
    Browse
  </Button>
</template>