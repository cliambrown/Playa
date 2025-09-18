<script setup>
defineProps(['to', 'isActive'])
</script>

<template>
  <RouterLink
    :to="to"
    class="inline-block px-1 py-2 font-medium transition duration-150 ease-in-out rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-600"
    :class="{
      'text-blue-300 hover:text-blue-400': !isActive,
      'text-gray-300 hover:text-gray-400': isActive
    }"
    >
    <div
      class="flex items-center gap-2 p-2 border-b-2"
      :class="{
        'border-transparent': !isActive,
        'border-current': isActive
      }"
      >
      <slot></slot>
    </div>
  </RouterLink>
</template>