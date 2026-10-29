<template>
  <!-- PageBar manages page document title -->
</template>

<script setup lang="ts">
import { useHead } from "@vueuse/head";

defineOptions({ name: "PageBar", inheritAttrs: false });

interface PageBarProps {
  title?: string;
}

const props = defineProps<PageBarProps>();

if (props.title) {
  useHead({ title: `${props.title} - Jupiter V3` });
}
</script>

<style lang="scss" scoped></style>
