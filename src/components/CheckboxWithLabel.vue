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
    <input :id="input_id" type="checkbox" class="mt-1 text-blue-600 transition duration-150 ease-in-out bg-gray-200 border-gray-700 rounded cursor-pointer  shrink-0 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none checked:bg-blue-500 checked:border-blue-500 focus:ring-offset-gray-800" @change="$emit('checkboxChange', $event)" v-model="checkboxVal" :disabled="disabled">
    <label :for="input_id" class="flex items-center cursor-pointer ps-3 gap-x-2">
      <slot></slot>
    </label>
  </div>
</template>