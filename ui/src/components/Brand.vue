<script setup lang="ts">
import { publicUrl } from "../public-url";
</script>
<template>
  <a class="brand" :href="publicUrl()"
    ><span class="brand-mark">文</span
    ><span>文章工作台<small>ARTICLE WORKBENCH</small></span></a
  >
</template>
