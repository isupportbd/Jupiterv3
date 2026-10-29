<template>
  <div class="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
    <div class="py-1 text-muted small text-start">
      Showing {{ page.from }} to {{ page.to }} of {{ nFormatter(page.total) }} entries
    </div>
    <nav :class="['datatable-pagination', `pagination-${variant}`]" aria-label="Page navigation">
      <ul class="pagination mb-0 justify-content-end">
          <!-- First -->
          <li :class="['page-item', { disabled: noPreviousPage }]">
            <button
              type="button"
              class="page-link"
              :disabled="noPreviousPage"
              :tabindex="noPreviousPage ? -1 : 0"
              title="First Page"
              @click.prevent="!noPreviousPage && loadPage(1)">
              <i class="bi bi-chevron-double-left"></i>
            </button>
          </li>

          <!-- Prev -->
          <li :class="['page-item', { disabled: noPreviousPage }]">
            <button
              type="button"
              class="page-link"
              :disabled="noPreviousPage"
              :tabindex="noPreviousPage ? -1 : 0"
              title="Previous Page"
              @click.prevent="!noPreviousPage && loadPage(props.data.current_page - 1)">
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>

          <!-- Current Page Input -->
          <li class="page-item">
            <input
              v-model.number="page.page"
              type="number"
              class="form-control form-control-sm text-center page-num-input"
              min="1"
              :max="props.data.last_page"
              title="Page Number"
              @keyup.enter="loadPage(page.page)" />
          </li>

          <!-- Total Pages Text -->
          <li class="page-item">
            <span class="page-of-text"> of {{ nFormatter(props.data.last_page) }} </span>
          </li>

          <!-- Next -->
          <li :class="['page-item', { disabled: noNextPage }]">
            <button
              type="button"
              class="page-link"
              :disabled="noNextPage"
              :tabindex="noNextPage ? -1 : 0"
              title="Next Page"
              @click.prevent="!noNextPage && loadPage(props.data.current_page + 1)">
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>

          <!-- Last -->
          <li :class="['page-item', { disabled: noNextPage }]">
            <button
              type="button"
              class="page-link"
              :disabled="noNextPage"
              :tabindex="noNextPage ? -1 : 0"
              title="Last Page"
              @click.prevent="!noNextPage && loadPage(props.data.last_page)">
              <i class="bi bi-chevron-double-right"></i>
            </button>
          </li>
        </ul>
      </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { formatCompactNumber } from "@/helpers/nformatter";
import { useGum } from "@/plugins/gum";

interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  path?: string;
}

interface PaginationProps {
  data: PaginationData;
  selectedoption?: string | number;
  search?: string;
  variant?: string;
}

const props = withDefaults(defineProps<PaginationProps>(), {
  search: "",
  variant: "dark"
});

const emit = defineEmits<{
  (e: "load-page", page: number): void;
  (e: "loadPage", page: number): void;
}>();

const gum = useGum();
const route = useRoute();

const page = reactive({ page: 1, from: 0, to: 0, total: 0 });

const noPreviousPage = computed(() => props.data.current_page - 1 <= 0);
const noNextPage = computed(() => props.data.current_page + 1 > props.data.last_page);

const loadPage = (pageNo: string | number) => {
  let p = parseInt(String(pageNo), 10);

  // fallback if NaN
  if (Number.isNaN(p)) p = props.data.current_page;

  const last = Number(props.data.last_page) || 1;

  // clamp between 1 and last
  if (p < 1) p = 1;
  if (p > last) p = last;

  emit("load-page", p);
  emit("loadPage", p);

  if (props.data.path) {
    return gum.get(props.data.path, {
      query: { page: p, size: props.selectedoption, search: props.search },
      routePath: route.path,
      preserveState: true,
      preserveScroll: true,
      skipFetch: true
    });
  }
};

const nFormatter = formatCompactNumber;

watchEffect(() => {
  page.page = props.data.current_page;
  page.from = props.data.total === 0 ? 0 : (props.data.current_page - 1) * props.data.per_page + 1;
  page.to = Math.min(props.data.current_page * props.data.per_page, props.data.total);
  page.total = props.data.total;
});
</script>

<style lang="scss" scoped>
ul.pagination {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;

  .page-item {
    margin: 0;
  }

  .page-item:not(:first-child) .page-link {
    margin-left: 0 !important;
  }

  :deep(.page-item.disabled .page-link),
  :deep(.page-link:disabled),
  :deep(.page-link[aria-disabled="true"]) {
    pointer-events: none !important;
    cursor: not-allowed !important;
    opacity: 0.4 !important;
    background-color: var(--app-surface) !important;
    color: var(--app-text-muted) !important;
    border-color: var(--app-border) !important;
  }

  .page-link {
    border-radius: 0.375rem !important;
    margin-left: 0 !important;
    border: 1px solid var(--app-border) !important;
    background-color: var(--app-surface) !important;
    color: var(--app-text) !important;
    box-shadow: none !important;
    min-width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    font-size: 0.8125rem;
    transition: background-color 0.15s ease, border-color 0.15s ease;

    &:hover:not([aria-disabled="true"]) {
      background-color: var(--app-hover) !important;
      border-color: var(--app-border) !important;
      color: var(--app-text) !important;
    }
  }

  .page-num-input {
    width: 52px;
    height: 32px;
    border-radius: 0.375rem !important;
    border: 1px solid var(--app-border) !important;
    background-color: var(--app-surface) !important;
    color: var(--app-text) !important;
    font-size: 0.8125rem;
    padding: 0 4px;
    box-shadow: none !important;

    &:focus {
      border-color: var(--app-primary) !important;
      box-shadow: 0 0 0 2px rgba(var(--bs-primary-rgb), 0.2) !important;
    }
  }

  .page-of-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 0.5rem;
    color: var(--app-text-muted) !important;
    font-size: 0.8125rem;
    white-space: nowrap;
  }
}
</style>
