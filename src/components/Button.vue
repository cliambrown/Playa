<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  btnstyle: {
    type: String,
    default: 'solid'
  },
  btncolor: {
    type: String,
    default: 'blue'
  }
});

defineEmits(['buttonClick']);
</script>

<template>
  <button 
    type="button"
    class="inline-flex items-center px-4 py-3 text-sm font-semibold transition duration-150 ease-in-out border rounded-lg disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600 gap-x-2 whitespace-nowrap"
    :class="{
      'text-white bg-gray-800 border-transparent hover:bg-gray-900 dark:bg-white dark:text-gray-800' : (btnstyle === 'solid' && btncolor === 'black'),
      'text-white bg-gray-500 border-transparent hover:bg-gray-600' : (btnstyle === 'solid' && btncolor === 'gray'),
      'text-white bg-green-600 border-transparent hover:bg-green-700' : (btnstyle === 'solid' && btncolor === 'green'),
      'text-white bg-blue-700 border-transparent hover:bg-blue-800' : (btnstyle === 'solid' && btncolor === 'blue'),
      'text-white bg-red-500 border-transparent hover:bg-red-600' : (btnstyle === 'solid' && btncolor === 'red'),
      'text-white bg-yellow-500 border-transparent hover:bg-yellow-600' : (btnstyle === 'solid' && btncolor === 'yellow'),
      'text-gray-800 bg-white border-transparent hover:bg-gray-200' : (btnstyle === 'solid' && btncolor === 'white'),
    
      'text-gray-800 border-gray-800 hover:border-gray-500 hover:text-gray-500 dark:border-white dark:text-white dark:hover:text-gray-300 dark:hover:border-gray-300' : (btnstyle === 'outline' && btncolor === 'black'),
      'text-gray-500 border-gray-500 hover:border-gray-800 hover:text-gray-800 dark:border-gray-400 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-300' : (btnstyle === 'outline' && btncolor === 'gray'),
      'text-green-500 border-green-500 hover:border-green-400 hover:text-green-400 dark:border-green-300 dark:text-green-300 dark:hover:text-green-400 dark:hover:border-green-400' : (btnstyle === 'outline' && btncolor === 'green'),
      'text-blue-600 border-blue-600 dark:text-blue-300 dark:border-blue-300 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400' : (btnstyle === 'outline' && btncolor === 'blue'),
      'text-red-500 border-red-500 hover:border-red-400 hover:text-red-400' : (btnstyle === 'outline' && btncolor === 'red'),
      'text-yellow-500 border-yellow-500 hover:border-yellow-400 hover:text-yellow-400' : (btnstyle === 'outline' && btncolor === 'yellow'),
      'text-white border-white hover:border-white/70 hover:text-white/70' : (btnstyle === 'outline' && btncolor === 'white'),
    
      'text-gray-800 border-transparent hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700' : (btnstyle === 'ghost' && btncolor === 'black'),
      'text-gray-500 border-transparent hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800' : (btnstyle === 'ghost' && btncolor === 'gray'),
      'text-green-500 dark:text-green-300 border-transparent hover:bg-green-100 hover:text-green-800 dark:hover:bg-green-800/30 dark:hover:text-green-400' : (btnstyle === 'ghost' && btncolor === 'green'),
      'text-blue-600 border-transparent hover:bg-blue-100 hover:text-blue-800 dark:text-blue-500 dark:hover:bg-blue-800/30 dark:hover:text-blue-400' : (btnstyle === 'ghost' && btncolor === 'blue'),
      'text-red-500 border-transparent hover:bg-red-100 hover:text-red-800 dark:hover:bg-red-800/30 dark:hover:text-red-400' : (btnstyle === 'ghost' && btncolor === 'red'),
      'text-yellow-500 border-transparent hover:bg-yellow-100 hover:text-yellow-800 dark:hover:bg-yellow-800/30 dark:hover:text-yellow-400' : (btnstyle === 'ghost' && btncolor === 'yellow'),
      'text-white border-transparent hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-white' : (btnstyle === 'ghost' && btncolor === 'white'),
    
      'text-gray-800 bg-gray-100 border-transparent hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:hover:text-white' : (btnstyle === 'soft' && btncolor === 'black'),
      'text-gray-500 bg-gray-100 border-transparent hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-400 dark:hover:text-gray-300' : (btnstyle === 'soft' && btncolor === 'gray'),
      'text-green-800 bg-green-100 border-transparent hover:bg-green-200 dark:hover:bg-green-900 dark:text-green-500 dark:hover:text-green-400' : (btnstyle === 'soft' && btncolor === 'green'),
      'text-blue-800 bg-blue-100 border-transparent hover:bg-blue-200 dark:hover:bg-blue-900 dark:text-blue-400' : (btnstyle === 'soft' && btncolor === 'blue'),
      'text-red-800 bg-red-100 border-transparent hover:bg-red-200 dark:hover:bg-red-900 dark:text-red-500 dark:hover:text-red-400' : (btnstyle === 'soft' && btncolor === 'red'),
      'text-yellow-800 bg-yellow-100 border-transparent hover:bg-yellow-200 dark:hover:bg-yellow-900 dark:text-yellow-500 dark:hover:text-yellow-400' : (btnstyle === 'soft' && btncolor === 'yellow'),
      'text-white border-transparent bg-white/10 hover:bg-white/20' : (btnstyle === 'soft' && btncolor === 'white'),
    
      'text-gray-800 bg-white border-gray-200 rounded-lg shadow-sm gap-x-2 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800' : (btnstyle === 'white' && btncolor === 'black'),
      'text-gray-500 bg-white border-gray-200 rounded-lg shadow-sm gap-x-2 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800' : (btnstyle === 'white' && btncolor === 'gray'),
      'text-green-500 bg-white border-gray-200 rounded-lg shadow-sm gap-x-2 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:hover:bg-gray-800' : (btnstyle === 'white' && btncolor === 'green'),
      'text-blue-600 bg-white border-gray-200 rounded-lg shadow-sm gap-x-2 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-blue-500 dark:hover:bg-gray-800' : (btnstyle === 'white' && btncolor === 'blue'),
      'text-red-500 bg-white border-gray-200 rounded-lg shadow-sm gap-x-2 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:hover:bg-gray-800' : (btnstyle === 'white' && btncolor === 'red'),
      'text-yellow-500 bg-white border-gray-200 rounded-lg shadow-sm gap-x-2 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:hover:bg-gray-800' : (btnstyle === 'white' && btncolor === 'yellow'),
    }">
    <slot></slot>
  </button>
  
</template>