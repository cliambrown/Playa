<script setup>
defineProps({
  type: {
    type: String,
    default: 'text'
  },
  id: String,
  readonly: {
    type: Boolean,
    default: false,
  },
})

const val = defineModel();
</script>

<template>
  <div>
    <label :for="id" class="block mb-2 text-sm font-medium">
      <slot></slot>
    </label>
    <div class="flex gap-x-2">
      <input
        :type="type"
        :id="id"
        class="block w-full px-4 py-3 text-sm text-gray-900 transition duration-150 ease-in-out bg-white border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none read-only:opacity-70"
        v-model="val"
        :readonly="readonly"
        autocomplete="off"
        >
        <slot name="afterInput"></slot>
    </div>
  </div>
</template>