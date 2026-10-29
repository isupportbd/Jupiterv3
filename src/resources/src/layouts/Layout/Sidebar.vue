<template>
  <!-- Quick Menu Floating Panel (Hidden by default, shown when ui.sidebarOpen is true) -->
  <aside
    v-if="ui.sidebarOpen"
    ref="panelRef"
    class="quick-menu-panel"
    :style="panelStyle"
    aria-label="Quick Navigation"
  >
    <!-- Header -->
    <div class="quick-menu-header d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
      <div class="d-flex align-items-center">
        <i class="bi bi-compass fs-5 me-2"></i>
        <h5 class="mb-0 fw-bold fs-6 text-body">Quick Navigation</h5>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn-close shadow-none"
          style="font-size: 0.72rem;"
          aria-label="Close Quick Menu"
          title="Close"
          @click="ui.closeSidebar"
        ></button>
      </div>
    </div>

    <!-- Body: Single-Column List of Navigation Items -->
    <div class="quick-menu-body p-2 overflow-y-auto">
      <div class="quick-menu-list">
        <button
          v-for="item in menuItems"
          :key="item.label"
          type="button"
          class="quick-menu-item"
          :class="{ active: isActive(item.path) }"
          @click="handleNavigate(item.path)"
        >
          <div class="quick-item-icon" :style="{ color: item.color }">
            <i :class="item.icon"></i>
          </div>
          <span class="quick-item-label">{{ item.label }}</span>
          <i class="bi bi-chevron-right quick-item-arrow ms-auto"></i>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAdminUiStore } from "@/stores/admin-ui";
import { useAuthStore } from "@/stores/auth";

defineProps<{ onToggleSidebar?: () => void; }>();

const ui = useAdminUiStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const panelRef = ref<HTMLElement | null>(null);

function handleNavigate(path: string) {
  ui.closeSidebar();
  if (route.path !== path) {
    router.push(path);
  }
}

const panelStyle = ref<Record<string, string>>({
  top: "0px",
  left: "0px"
});

function updatePosition() {
  const trigger = document.getElementById("off-canvas");
  if (trigger) {
    const rect = trigger.getBoundingClientRect();
    const topPos = Math.round(rect.bottom + 4);
    const viewportHeight = window.innerHeight;
    panelStyle.value = {
      top: `${topPos}px`,
      left: `${Math.round(rect.left)}px`,
      maxHeight: `${Math.max(150, viewportHeight - topPos - 16)}px`
    };
  }
}

watch(
  () => ui.sidebarOpen,
  (open) => {
    if (open) {
      nextTick(() => {
        updatePosition();
      });
    }
  },
  { immediate: true }
);

const roleNormalized = computed(() => {
  return String(auth.user?.role?.name || "").toLowerCase().replace(/_/g, "");
});

const isSuperAdmin = computed(() => roleNormalized.value === "superadmin");
const isAdmin = computed(() => roleNormalized.value === "admin");

function isActive(path: string) {
  return route.path === path;
}

interface QuickItem {
  label: string;
  path: string;
  icon: string;
  color: string;
}

const menuItems = computed<QuickItem[]>(() => {
  if (isSuperAdmin.value) {
    return [
      {
        label: "Dashboard",
        path: "/",
        icon: "bi bi-speedometer2",
        color: "#10b981",
      },
      {
        label: "Office Approvals",
        path: "/users",
        icon: "bi bi-building-check",
        color: "#059669",
      },
      {
        label: "Payment Approvals",
        path: "/settings/payments",
        icon: "bi bi-wallet2",
        color: "#f59e0b",
      },
      {
        label: "Billing Settings",
        path: "/settings/billing",
        icon: "bi bi-sliders",
        color: "#8b5cf6",
      },
      {
        label: "Database Backup",
        path: "/system/backup",
        icon: "bi bi-database-down",
        color: "#6366f1",
      },
    ];
  }

  // Regular Office Admin & Staff
  const items: QuickItem[] = [
    {
      label: "Dashboard",
      path: "/",
      icon: "bi bi-speedometer2",
      color: "#10b981",
    },
    {
      label: "Monthwise Report",
      path: "/reports/monthwise",
      icon: "bi bi-calendar3-range",
      color: "#f59e0b",
    },
    {
      label: "Beneficiary Report",
      path: "/reports/beneficiary",
      icon: "bi bi-diagram-3",
      color: "#14b8a6",
    },
    {
      label: "Beneficiary Details",
      path: "/reports/beneficiary-detail",
      icon: "bi bi-person-badge",
      color: "#06b6d4",
    },
    {
      label: "LC Records",
      path: "/reports/local-lc",
      icon: "bi bi-file-earmark-spreadsheet",
      color: "#8b5cf6",
    },
  ];

  if (isAdmin.value) {
    items.push({
      label: "My Wallet",
      path: "/settings/payments",
      icon: "bi bi-wallet2",
      color: "#10b981",
    });
    items.push({
      label: "Staff Accounts",
      path: "/users",
      icon: "bi bi-people-fill",
      color: "#059669",
    });
    items.push({
      label: "Billing & Invoices",
      path: "/settings/billing",
      icon: "bi bi-receipt",
      color: "#8b5cf6",
    });
  }

  return items;
});

function onClickOutside(event: MouseEvent) {
  if (!ui.sidebarOpen) return;
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (panelRef.value && (panelRef.value === target || panelRef.value.contains(target))) {
    return;
  }
  if (target.closest("#off-canvas")) {
    return;
  }
  ui.closeSidebar();
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" && ui.sidebarOpen) {
    ui.closeSidebar();
  }
}

onMounted(() => {
  updatePosition();
  window.addEventListener("resize", updatePosition, { passive: true });
  window.addEventListener("scroll", updatePosition, { passive: true });
  document.addEventListener("click", onClickOutside, true);
  document.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updatePosition);
  window.removeEventListener("scroll", updatePosition);
  document.removeEventListener("click", onClickOutside, true);
  document.removeEventListener("keydown", onKeyDown);
});
</script>

<style lang="scss" scoped>
.quick-menu-panel {
  display: flex;
  flex-direction: column;
  position: fixed;
  width: 250px;
  max-width: calc(100vw - 1rem);
  max-height: calc(100vh - 1rem);
  background-color: var(--app-surface) !important;
  border: 1px solid var(--app-border) !important;
  border-radius: 0.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  z-index: 1100;
  transition: none !important;
}

.quick-menu-header {
  border-bottom-color: var(--app-border) !important;
}

.quick-menu-body {
  flex: 1 1 auto;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--app-border);
    border-radius: 4px;
  }
}

.quick-menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.quick-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.6rem 0.75rem;
  background-color: transparent !important;
  border: 1px solid transparent !important;
  border-radius: 0.375rem;
  text-decoration: none;
  color: var(--app-text) !important;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    border-color: var(--app-border) !important;
    background-color: var(--app-hover) !important;
    color: var(--app-text) !important;
  }

  &.router-link-exact-active,
  &.active {
    border-color: var(--app-border) !important;
    background-color: var(--app-hover) !important;
    color: var(--app-text) !important;
    font-weight: 600;
  }
}

.quick-item-icon {
  font-size: 1.15rem;
  line-height: 1;
  width: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.65rem;
  flex-shrink: 0;
}

.quick-item-label {
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.25;
  color: inherit;
}

.quick-item-arrow {
  font-size: 0.75rem;
  opacity: 0.45;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.quick-menu-item:hover .quick-item-arrow {
  opacity: 0.9;
  transform: translateX(2px);
}
</style>
