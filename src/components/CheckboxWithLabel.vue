<script setup>
const props = defineProps({
  input_id: String,
  disabled: {
    type: Boolean,
    default: false
  }
});

defineEmits(['checkboxChange']);

const checkboxVal = defineModel();
</script>

<template>
  <div class="flex">
    <input :id="input_id" type="checkbox" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-600" @change="$emit('checkboxChange', $event)" v-model="checkboxVal" :disabled="disabled">
    <label :for="input_id" class="flex items-center cursor-pointer ps-3 gap-x-2">
      <slot></slot>
    </label>
  </div>
</template>