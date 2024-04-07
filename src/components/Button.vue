<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary'
  },
  circular: {
    type: Boolean,
    default: false
  },
  whitespace: {
    type: String,
    default: 'nowrap'
  }
});

defineEmits(['buttonClick']);
</script>

<template>
  <button 
    type="button"
    class="inline-flex items-center px-3 py-2 text-sm font-medium leading-6 transition duration-150 ease-in-out disabled:opacity-60 disabled:pointer-events-none gap-x-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
    :class="{
      'shadow-sm': variant !== 'tertiary' && variant !== 'tertiary-light',
      'rounded-md': !circular,
      'rounded-full h-10': circular,
      
      'bg-indigo-500 hover:bg-indigo-400': variant === 'primary',
      'text-white bg-sky-900 hover:bg-sky-800': variant === 'secondary',
      'text-white hover:text-gray-100 ': variant === 'tertiary',
      'text-indigo-800 hover:text-gray-700': variant === 'tertiary-light',
      'text-blue-300 hover:text-blue-400': variant === 'link',
      'text-blue-200 bg-sky-900 hover:bg-sky-800': variant === 'link-bg',
      'text-amber-400 bg-sky-900 hover:bg-sky-800': variant === 'archive',
      'text-red-400 bg-sky-900 hover:bg-sky-800': variant === 'delete',
      
      'whitespace-nowrap': whitespace === 'nowrap',
    }"
    >
    <slot></slot>
  </button>
  
</template>