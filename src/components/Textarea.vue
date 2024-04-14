<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTextareaAutosize } from '@vueuse/core'
const props = defineProps(['id']);
const { textarea, input } = useTextareaAutosize();
const val = defineModel();
input.value = val.value ? val.value.toString() : '';
watch(input, newVal => val.value = newVal);
</script>

<template>
  <textarea
    :id="id"
    ref="textarea"
    v-model="input"
    class="resize-none"
    @keydown.up.stop
    @keydown.down.stop
    @keydown.left.stop
    @keydown.right.stop
    @keydown.space.stop
    ></textarea>
</template>