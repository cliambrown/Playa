<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'text'
  },
  id: String,
  readonly: {
    type: Boolean,
    default: false,
  },
  withLabel: {
    type: Boolean,
    default: true,
  },
  isDark: {
    type: Boolean,
    default: true,
  },
  isSearch: {
    type: Boolean,
    default: false,
  },
  datepicker: {
    type: Boolean,
    default: false
  },
  enableTimePicker: {
    type: Boolean,
    default: true
  }
})

const val = defineModel();

const input = ref(null);
defineExpose({input});

defineEmits(['input']);

// Convert between ms (js) and seconds (db)
let valMs = null;
if (props.datepicker) {
  valMs = ref(val.value ? val.value * 1000 : null);
  watch(valMs, newValMs => {
      val.value = valMs.value ? Math.floor(valMs.value / 1000) : null;
    }
  );
  watch(val, newVal => {
    valMs.value = newVal ? newVal * 1000 : null;
  });
}

// Use random text to block webkit's insanely persistent autocomplete
let randstr = '-';
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const charactersLength = characters.length;
let counter = 0;
while (counter < 8) {
  randstr += characters.charAt(Math.floor(Math.random() * charactersLength));
  counter += 1;
}

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowLeft':
    case 'ArrowDown':
    case 'ArrowUp':
    case ' ':
      event.preventDefault();
      break;
  }
  return true;
}
</script>

<template>
  <div @keydown="handleKeydown">
    <label
      v-if="withLabel"
      :for="datepicker ? 'dp-input-'+id : id"
      class="block mb-2 text-sm font-medium uppercase"
      :class="{
        'text-slate-200': isDark,
        'text-slate-600': !isDark
      }"
      >
      <slot></slot>
    </label>
    <div class="relative flex items-center gap-x-2">
      
      <input
        v-if="!datepicker"
        :type="type"
        :id="id"
        :name="id + randstr"
        ref="input"
        class="block w-full px-3 py-2 text-sm leading-6 text-gray-900 border-0 rounded-md ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-500"
        :class="{
          'pr-10': isSearch
        }"
        v-model="val"
        :readonly="readonly"
        autocomplete="new-password"
        spellcheck="false"
        @input="$emit('input')"
        />
        
      <svg v-if="isSearch" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="absolute w-6 h-6 text-gray-900 right-2">
        <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clip-rule="evenodd" />
      </svg>

      <VueDatePicker
        v-if="datepicker"
        v-model="valMs"
        model-type="timestamp"
        :format="'yyyy-MM-dd' + (enableTimePicker ? ' HH:mm' : '')"
        :uid="id"
        :enable-time-picker="enableTimePicker"
        @update:model-value="$emit('input')"
        >
      </VueDatePicker>
      
      <slot name="afterInput"></slot>
      
    </div>
  </div>
</template>