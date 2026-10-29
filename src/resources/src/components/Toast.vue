<template>
  <Teleport to="#toast-show">
    <div
      ref="notify"
      class="toast position-fixed"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style="z-index: 1000000; top: 18px; right: 24px"
      data-bs-delay="3500">
      <div :class="`text-bg-${bgcolor} align-items-center rounded-2 shadow`">
        <div class="d-flex align-items-center">
          <div class="toast-body d-flex align-items-center py-2 px-3">
            <i :class="toastIcon" class="me-2 fs-5"></i>
            <span>{{ message }}</span>
          </div>
          <button
            type="button"
            class="btn-close btn-close-white me-2 m-auto shadow-none"
            data-bs-dismiss="toast"
            aria-label="Close"></button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Toast from "bootstrap/js/dist/toast.js";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { registerToastHandler, unregisterToastHandler } from "@/composables/useToast";

defineOptions({ name: "Toast", inheritAttrs: false });

interface ToastProps {
  icon?: string;
}

const props = defineProps<ToastProps>();

const notify = ref<HTMLElement | null>(null);
const message = ref("");
const bgcolor = ref("primary");

const toastIcon = computed(() => {
  if (props.icon) return props.icon;
  switch (bgcolor.value) {
    case "success":
      return "bi bi-check-circle-fill";
    case "danger":
      return "bi bi-exclamation-octagon-fill";
    case "warning":
      return "bi bi-exclamation-triangle-fill";
    case "info":
      return "bi bi-info-circle-fill";
    default:
      return "bi bi-bell-fill";
  }
});

const toastme = (msg: string, bg: string = "primary") => {
  message.value = msg;
  let cleanBg = bg.replace(/^alert-/, "").trim().toLowerCase();
  if (cleanBg === "error") cleanBg = "danger";
  bgcolor.value = cleanBg || "primary";

  if (!notify.value) {
    return;
  }
  const toastInstance = Toast.getOrCreateInstance(notify.value);
  toastInstance.show();
};

onMounted(() => {
  registerToastHandler(toastme);
});

onBeforeUnmount(() => {
  unregisterToastHandler(toastme);
});

defineExpose({ toastme });
</script>

<style lang="scss" scoped>
.toast {
  min-width: 280px;
  max-width: 420px;
}
</style>
