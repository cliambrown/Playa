<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'new'
  },
  color: {
    type: String,
    default(rawProps) {
      switch (rawProps.variant) {
        case 'new':
          return 'emerald';
        case 'updated':
          return 'slate';
        case 'premiere':
          return 'teal';
        case 'seasonfinale':
          return 'violet';
        case 'seriesfinale':
          return 'rose';
        case 'special':
          return 'fuchsia';
        default:
          return 'green';
      }
    }
  }
});
</script>

<template>
  <span
    class="inline-block bottom-0.5 px-2 rounded-full font-semibold text-white text-sm tracking-wider"
    :class="{
      'bg-slate-700': color === 'slate',
      'bg-gray-700': color === 'gray',
      'bg-zinc-700': color === 'zinc',
      'bg-neutral-700': color === 'neutral',
      'bg-stone-700': color === 'stone',
      'bg-red-700': color === 'red',
      'bg-orange-700': color === 'orange',
      'bg-amber-700': color === 'amber',
      'bg-yellow-700': color === 'yellow',
      'bg-lime-700': color === 'lime',
      'bg-green-700': color === 'green',
      'bg-emerald-700': color === 'emerald',
      'bg-teal-700': color === 'teal',
      'bg-cyan-700': color === 'cyan',
      'bg-sky-700': color === 'sky',
      'bg-blue-700': color === 'blue',
      'bg-indigo-700': color === 'indigo',
      'bg-violet-700': color === 'violet',
      'bg-purple-700': color === 'purple',
      'bg-fuchsia-700': color === 'fuchsia',
      'bg-pink-700': color === 'pink',
      'bg-rose-700': color === 'rose',
    }"
    >
    <slot></slot>
  </span>
  
</template>