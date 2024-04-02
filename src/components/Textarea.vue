<script setup lang="ts">
import { useTextareaAutosize } from '@vueuse/core'
const props = defineProps(['id']);
const { textarea, input } = useTextareaAutosize()
</script>

<template>
  <textarea
    :id="id"
    ref="textarea"
    v-model="input"
    class="resize-none"
    ></textarea>
</template>