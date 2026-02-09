<script setup lang="ts">
import {withBase} from 'vitepress';
import {data as tutorials} from './tutorials.data.js';
</script>

<template>
  <div class="divide-y divide-gray-200 dark:divide-slate-200/5">
    <div
      v-for="(tutorial, tutorialIndex) of tutorials"
      :key="tutorialIndex"
      class="py-12"
    >
      <article
        class="flex flex-col xl:flex-row xl:items-center gap-8 xl:gap-16"
      >
        <div class="w-full shrink-0 xl:w-1/3">
          <img
            v-if="tutorial.thumbnail"
            :src="withBase(tutorial.thumbnail)"
            alt=""
            class="w-full h-48 object-cover rounded-lg"
          >
        </div>
        <div class="space-y-5 xl:col-span-3">
          <div class="space-y-6">
            <h2 class="mt-0! border-t-0! pt-0!">
              <a :href="withBase(tutorial.url)">{{ tutorial.title }}</a>
            </h2>
            <div
              v-if="tutorial.excerpt"
              v-html="tutorial.excerpt"
            />
          </div>
          <div class="text-base leading-6 font-medium">
            <a
              class="link"
              aria-label="read more"
              :href="withBase(tutorial.url)"
            >Read more →</a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
