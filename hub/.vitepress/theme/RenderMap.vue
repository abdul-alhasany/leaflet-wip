<template>
  <div
    ref="map"
    class="z-1"
    style="height: 400px;"
  />
</template>

<script setup lang="ts">
import {onMounted, useTemplateRef} from 'vue';
const emits = defineEmits(['mapReady']);
const mapRef = useTemplateRef('map');

onMounted(() => {
    setTimeout(() => {
        if (typeof window === 'undefined' || !L) {
            console.warn('Leaflet is not loaded yet');
            return;
        }
        const map = new L.Map(mapRef.value).setView([50.4501, 30.5234], 4);
        emits('mapReady', map, L);

    }, 100);
});
</script>
