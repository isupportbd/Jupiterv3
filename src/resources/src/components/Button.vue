<template>
  <button class="btn shadow-none" :type="props.type" :disabled="props.disabled || props.loading" v-bind="$attrs">
    <slot v-if="hasDefaultSlot"></slot>
    <template v-else>
      <span v-if="props.loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
      <span v-if="props.icon && !props.loading" class="me-1"><i :class="props.icon"></i></span>
      <span v-if="props.label" class="text-capitalize">
        {{ props.label }}
      </span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";

interface ButtonProps {
  label?: string;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

defineOptions({ name: "Button", inheritAttrs: false });

const slots = useSlots();
const props = withDefaults(defineProps<ButtonProps>(), {
  type: "button",
  loading: false,
  disabled: false
});

const hasDefaultSlot = computed(() => Boolean(slots.default?.().length));
</script>

<style lang="scss" scoped></style>
