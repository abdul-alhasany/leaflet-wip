<template>
  <div class="flex flex-col">
    <div
      class="flex gap-2 items-center cursor-pointer"
      @click="isOpen = !isOpen"
    >
      <span :class="isOpen && 'rotate-90'">➤</span>
      <div>
        {{ title }}
      </div>
    </div>
    <div
      v-if="isOpen"
      class=""
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue';
const isOpen = ref(false);
defineProps({
    title: {
        type: String,
        required: true
    }

});
</script>

<style scoped>

</style>
