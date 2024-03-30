<script setup>
defineProps(['to', 'isActive'])
</script>

<template>
    <RouterLink :to="to" class="px-1 py-2 font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-gray-600" :class="{ 'text-blue-300 hover:text-blue-400': !isActive, 'text-gray-300 hover:text-gray-400 underline underline-offset-4': isActive }">
        <slot></slot>
    </RouterLink>
</template>