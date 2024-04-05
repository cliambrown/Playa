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
  whitespace: {
    type: String,
    default: 'nowrap'
  }
});

defineEmits(['buttonClick']);

// class="inline-flex items-center px-3 py-2 text-sm font-semibold leading-6 transition duration-150 ease-in-out gap-x-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-500 disabled:opacity-60 disabled:pointer-events-none"
// :class="{
//       'rounded-md shadow-sm': variant !== 'close',
//       'rounded-full text-slate-800 hover:bg-gray-100': variant === 'close',
      
//       'bg-green-700 hover:bg-green-600': variant === 'action',
//       'bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800': variant === 'action-secondary',
//       'bg-blue-700 hover:bg-blue-600': variant === 'link',
//       'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800': variant === 'link-secondary',
//       'bg-black hover:bg-gray-800 outline outline-1 outline-gray-600 text-white': variant === 'black',
//       'bg-gray-300 hover:bg-gray-400 text-black': variant === 'gray',
//       'bg-violet-100 hover:bg-violet-200 text-violet-700 hover:text-violet-800': variant === 'local-link',
//       'bg-amber-700 hover:bg-amber-600': variant === 'archive',
//       'bg-red-700 hover:bg-red-600': variant === 'delete',
      
//       'whitespace-nowrap': whitespace === 'nowrap',
//     }"
</script>

<template>
  <button 
    type="button"
    class="inline-flex items-center px-3 py-2 text-sm font-medium leading-6 transition duration-150 ease-in-out disabled:opacity-60 disabled:pointer-events-none gap-x-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
    :class="{
      'rounded-md shadow-sm': variant !== 'close',
      'rounded-full text-slate-800 hover:bg-gray-100': variant === 'close',
      
      'bg-indigo-500 hover:bg-indigo-400': variant === 'primary',
      'text-white hover:text-indigo-100 bg-gray-700': variant === 'secondary',
      
      'whitespace-nowrap': whitespace === 'nowrap',
    }"
    >
    <slot></slot>
  </button>
  
</template>