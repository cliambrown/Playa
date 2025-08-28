<script setup>
const props = defineProps({
  input_id: String,
  disabled: {
    type: Boolean,
    default: false
  },
  trueValue: {
    default: true
  },
  falseValue: {
    default: false
  }
});

defineEmits(['checkboxChange']);

const checkboxVal = defineModel();
</script>

<template>
  <div class="flex items-center">
    <input type="checkbox"
      :id="input_id"
      class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-600"
      @change="$emit('checkboxChange', $event)"
      v-model="checkboxVal"
      :disabled="disabled"
      :true-value="trueValue"
      :false-value="falseValue"
      @keydown.up.stop
      @keydown.down.stop
      @keydown.left.stop
      @keydown.right.stop
      @keydown.space.stop
      @keydown.t.stop
      @keydown.f.stop
      />
    <label :for="input_id" class="flex items-center cursor-pointer ps-3 gap-x-2">
      <slot></slot>
    </label>
  </div>
</template>