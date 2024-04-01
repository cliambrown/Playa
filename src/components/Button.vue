<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'action'
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
    class="inline-flex items-center px-3 py-2 text-sm font-semibold leading-6 transition duration-150 ease-in-out rounded-md shadow-sm gap-x-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-500 disabled:opacity-60 disabled:pointer-events-none"
    :class="{
      'bg-green-700 hover:bg-green-600': variant === 'action',
      'bg-blue-700 hover:bg-blue-600': variant === 'link',
      'bg-black hover:bg-gray-800 outline outline-1 outline-gray-600': variant === 'black',
      'bg-violet-700 hover:bg-violet-600': variant === 'local-link',
      'bg-amber-700 hover:bg-amber-600': variant === 'archive',
      'bg-red-700 hover:bg-red-600': variant === 'delete',
      
      'whitespace-nowrap': whitespace === 'nowrap',
    }"
    >
    <slot></slot>
  </button>
  
</template>