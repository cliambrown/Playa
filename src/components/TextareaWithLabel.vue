<script setup>
import Textarea from './Textarea.vue';

const props = defineProps({
  id: String,
  readonly: {
    type: Boolean,
    default: false,
  },
  isDark: {
    type: Boolean,
    default: true,
  },
})

const val = defineModel();

defineEmits(['input']);

// Use random text to block webkit's insanely persistent autocomplete
let randstr = '-';
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const charactersLength = characters.length;
let counter = 0;
while (counter < 8) {
  randstr += characters.charAt(Math.floor(Math.random() * charactersLength));
  counter += 1;
}
</script>

<template>
  <div>
    <label
      :for="id"
      class="block mb-2 text-sm font-medium uppercase"
      :class="{
        'text-slate-200': isDark,
        'text-slate-600': !isDark
      }"
      >
      <slot></slot>
    </label>
    <div class="relative flex items-center gap-x-2">
      
      <Textarea
        :id="id"
        class="block w-full px-3 py-2 text-sm leading-6 text-gray-900 transition duration-150 ease-in-out border-0 rounded-md resize-none ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        v-model="val"
        :readonly="readonly"
        autocomplete="new-password"
        spellcheck="false"
        @input="$emit('input')"
        >
      </Textarea>
    </div>
  </div>
</template>