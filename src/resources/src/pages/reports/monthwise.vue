<template>
  <div class="container-fluid pt-1 pb-4 px-0">
    <Pagebar title="Monthwise LC Summary" />

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h4 class="fw-bold mb-1">
          <i class="bi bi-calendar3-range text-primary me-2"></i>
          Monthwise LC Summary Report
        </h4>
        <p class="text-muted small mb-0">Monthly breakdown and statistical aggregation across LC records and values.</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-primary btn-sm" @click="fetchSummaries" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1" :class="{ 'spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- ── Filter Toolbar Card (Clean Horizontal Layout Matching Specification) ── -->
    <div class="card border mb-3 shadow-sm filter-toolbar-card">
      <div class="card-body py-2 px-3">
        <div class="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <!-- Filter Inputs (Select Year, From Month, To Month) -->
          <div class="d-flex flex-wrap align-items-end gap-3">
            <!-- 1. Select Year -->
            <div class="filter-item" style="min-width: 140px; width: 140px;">
              <label class="form-label small fw-semibold text-secondary mb-1">Select Year</label>
              <select
                v-model="filters.year"
                class="form-select form-select-sm"
                @change="applyFilters">
                <option value="">All Years</option>
                <option v-for="yr in availableYears" :key="yr" :value="yr">{{ yr }}</option>
              </select>
            </div>

            <!-- 2. From Month -->
            <div class="filter-item" style="min-width: 150px; width: 150px;">
              <label class="form-label small fw-semibold text-secondary mb-1">From Month</label>
              <input
                v-model="filters.fromMonth"
                type="month"
                class="form-control form-control-sm"
                title="From Month"
                @change="applyFilters" />
            </div>

            <!-- 3. To Month -->
            <div class="filter-item" style="min-width: 150px; width: 150px;">
              <label class="form-label small fw-semibold text-secondary mb-1">To Month</label>
              <input
                v-model="filters.toMonth"
                type="month"
                class="form-control form-control-sm"
                title="To Month"
                @change="applyFilters" />
            </div>
          </div>

          <!-- Action Buttons (Reset, Excel) -->
          <div class="d-flex align-items-center gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm px-3 d-inline-flex align-items-center"
              title="Reset all filters"
              @click="resetFilters">
              <i class="bi bi-arrow-clockwise me-1"></i> Reset
            </button>
            <button
              type="button"
              class="btn btn-success btn-sm px-3 d-inline-flex align-items-center"
              style="background-color: #198754; border-color: #198754;"
              title="Export to Excel"
              :disabled="filteredSummaries.length === 0"
              @click="exportExcel">
              <i class="bi bi-file-earmark-excel me-1"></i> Excel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Monthwise Summary Table ── -->
    <div class="card border shadow-sm">
      <div class="card-header border-bottom py-3 d-flex justify-content-between align-items-center">
        <h6 class="fw-bold mb-0">
          <i class="bi bi-table me-2 text-primary"></i> Monthly Breakdown Statistics
        </h6>
        <span class="badge bg-secondary-subtle text-secondary fs-7">
          {{ filteredSummaries.length }} Month(s) Displayed
        </span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Month (Year-MM)</th>
                <th class="text-end">Total Records</th>
                <th class="text-end">Registered LCs</th>
                <th class="text-end">Unique LCs</th>
                <th class="text-end">Beneficiaries (Reg)</th>
                <th class="text-end">Beneficiaries (Unq)</th>
                <th class="text-end">Banks (Reg)</th>
                <th class="text-end" :class="{ 'pe-3': !canManage }">Banks (Unq)</th>
                <th v-if="canManage" class="text-end pe-3" style="width: 70px;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="canManage ? 9 : 8" class="text-center py-5">
                  <div class="spinner-border text-primary" role="status"></div>
                  <div class="text-muted small mt-2">Loading monthwise statistics...</div>
                </td>
              </tr>
              <tr v-else-if="filteredSummaries.length === 0">
                <td :colspan="canManage ? 9 : 8" class="text-center py-5 text-muted">
                  <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                  No monthwise records match the selected filter criteria.
                </td>
              </tr>
              <tr v-for="item in paginatedSummaries" :key="item.month_key || item.monthKey">
                <td class="ps-3 font-monospace fw-bold text-primary">
                  <i class="bi bi-calendar-event me-2 text-muted"></i>{{ item.month_key || item.monthKey }}
                </td>
                <td class="text-end fw-semibold">{{ Number(item.total_records || item.totalRecords || 0).toLocaleString() }}</td>
                <td class="text-end">{{ Number(item.total_lc_reg || item.totalLcReg || 0).toLocaleString() }}</td>
                <td class="text-end text-info fw-semibold">{{ Number(item.total_lc_unq || item.totalLcUnq || 0).toLocaleString() }}</td>
                <td class="text-end">{{ Number(item.total_ben_reg || item.totalBenReg || 0).toLocaleString() }}</td>
                <td class="text-end text-warning fw-semibold">{{ Number(item.total_ben_unq || item.totalBenUnq || 0).toLocaleString() }}</td>
                <td class="text-end">{{ Number(item.total_bank_reg || item.totalBankReg || 0).toLocaleString() }}</td>
                <td class="text-end" :class="{ 'pe-3': !canManage }">{{ Number(item.total_bank_unq || item.totalBankUnq || 0).toLocaleString() }}</td>
                <td v-if="canManage" class="text-end pe-3">
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm d-inline-flex align-items-center justify-content-center"
                    style="width: 32px; height: 32px; padding: 0;"
                    title="Delete all records for this month"
                    @click="openDeleteModal(item.month_key || item.monthKey, Number(item.total_records || item.totalRecords || 0))"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Framework Native Pagination (10 records per page) -->
      <div v-if="filteredSummaries.length > 0" class="card-footer border-top py-3">
        <Pagination :data="paginationData" @load-page="onPageChange" />
      </div>
    </div>

    <!-- Modal: Confirm Delete Month Data (Batch deletion with real-time % progress, no Cancel button) -->
    <div v-if="showDeleteModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.6); z-index: 1055;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border shadow-lg">
          <div class="modal-header border-bottom py-3">
            <h5 class="modal-title fw-bold text-danger d-flex align-items-center gap-2">
              <i class="bi bi-trash3-fill"></i>
              <span>Delete Month Data</span>
            </h5>
            <button v-if="!deleting" type="button" class="btn-close" @click="closeDeleteModal"></button>
          </div>
          <div class="modal-body p-4">
            <template v-if="!deleting">
              <p class="mb-3 text-body">
                Are you sure you want to permanently delete all records for month 
                <strong class="text-primary font-monospace fs-6">{{ targetMonth }}</strong>?
              </p>
              <div class="alert alert-danger-subtle border border-danger-subtle p-3 rounded small text-danger mb-0">
                <div class="fw-bold mb-1"><i class="bi bi-info-circle me-1"></i> What will be deleted:</div>
                <ul class="mb-0 ps-3">
                  <li><strong>{{ targetRecordCount.toLocaleString() }}</strong> shipment transaction records from <code>lc_records</code>.</li>
                  <li>All orphaned LC contracts in <code>lcs</code> master table.</li>
                  <li>Orphaned suppliers and exporters introduced exclusively by this month.</li>
                  <li>Pre-aggregated monthly summary row for <strong>{{ targetMonth }}</strong>.</li>
                </ul>
              </div>
            </template>

            <!-- Real-Time Batch Progress Bar (Zero Server Lock) -->
            <template v-else>
              <div class="py-2">
                <div class="mb-2 d-flex justify-content-between align-items-center small fw-semibold">
                  <span class="text-danger">{{ deleteStatusText }}</span>
                  <span class="fw-bold fs-6 text-danger">{{ deleteProgress }}%</span>
                </div>
                <div class="progress" style="height: 10px;">
                  <div
                    class="progress-bar progress-bar-striped progress-bar-animated bg-danger"
                    role="progressbar"
                    :style="{ width: `${deleteProgress}%` }"
                  ></div>
                </div>
                <small class="text-muted mt-2 d-block text-center">
                  <i class="bi bi-lock me-1"></i> Processing in non-blocking batches to prevent server hang. Please wait...
                </small>
              </div>
            </template>
          </div>
          <div v-if="!deleting" class="modal-footer border-top py-2">
            <button type="button" class="btn btn-danger fw-semibold px-4 w-100" @click="executeDelete">
              <i class="bi bi-trash3 me-1"></i> Confirm & Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, reactive, ref } from "vue";
import Pagebar from "@/components/Pagebar.vue";
import Pagination from "@/components/datatable/Pagination.vue";
import { useAuth } from "@/composables/useAuth";
import { toast } from "@/composables/useToast";

const { user } = useAuth();
const canManage = computed(() => {
  const r = String(user.value?.role?.name || "").toLowerCase().replace(/_/g, "");
  return r === "admin" || r === "superadmin";
});

const summaries = ref<any[]>([]);
const loading = ref(false);

// Deletion states
const showDeleteModal = ref(false);
const targetMonth = ref("");
const targetRecordCount = ref(0);
const deleting = ref(false);
const deleteProgress = ref(0);
const deletedCountSoFar = ref(0);
const deleteStatusText = ref("");

function openDeleteModal(month: string, count: number) {
  targetMonth.value = month;
  targetRecordCount.value = count;
  deleteProgress.value = 0;
  deletedCountSoFar.value = 0;
  deleteStatusText.value = "";
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  if (deleting.value) return;
  showDeleteModal.value = false;
  targetMonth.value = "";
  targetRecordCount.value = 0;
  deleteProgress.value = 0;
}

async function executeDelete() {
  if (!targetMonth.value) return;
  deleting.value = true;
  deleteProgress.value = 0;
  deletedCountSoFar.value = 0;
  deleteStatusText.value = "Starting deletion...";

  const total = Math.max(1, targetRecordCount.value);
  const batchSize = 3000;

  try {
    let done = false;
    while (!done) {
      const res = await axios.post("/api/data-management/reports/monthwise/delete-chunk", {
        month: targetMonth.value,
        batchSize
      });

      const data = res.data?.data || {};
      const inBatch = Number(data.deletedInBatch || 0);
      deletedCountSoFar.value += inBatch;
      const remaining = Number(data.remaining || 0);
      done = Boolean(data.done || remaining === 0);

      const percent = Math.min(99, Math.round(((total - remaining) / total) * 100));
      deleteProgress.value = done ? 100 : Math.max(percent, Math.round((deletedCountSoFar.value / total) * 100));
      deleteStatusText.value = done 
        ? "Finalizing cleanup of entities & summaries..." 
        : `Purging records... ${deleteProgress.value}% (${deletedCountSoFar.value.toLocaleString()} of ${total.toLocaleString()})`;

      if (done) break;
    }

    deleteProgress.value = 100;
    deleteStatusText.value = `Successfully purged all records for ${targetMonth.value}.`;
    toast.success(`Successfully deleted records for ${targetMonth.value}.`);

    setTimeout(async () => {
      showDeleteModal.value = false;
      deleting.value = false;
      await fetchSummaries();
    }, 700);
  } catch (err: any) {
    console.error("Delete month failed:", err);
    toast.danger(err.response?.data?.message || "Failed to delete month records.");
    deleting.value = false;
  }
}

const filters = reactive({
  year: "",
  fromMonth: "",
  toMonth: ""
});

const availableYears = computed(() => {
  const years = new Set<string>();
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    years.add(String(y));
  }
  for (const item of summaries.value) {
    const key = String(item.month_key || item.monthKey || "");
    const yr = key.split("-")[0];
    if (yr && yr.length === 4) years.add(yr);
  }
  return Array.from(years).sort().reverse();
});

const filteredSummaries = computed(() => {
  let list = summaries.value;
  if (filters.year) {
    list = list.filter((row) => {
      const key = String(row.month_key || row.monthKey || "");
      return key.startsWith(`${filters.year}-`);
    });
  }
  if (filters.fromMonth) {
    list = list.filter((row) => {
      const key = String(row.month_key || row.monthKey || "");
      return key >= filters.fromMonth;
    });
  }
  if (filters.toMonth) {
    list = list.filter((row) => {
      const key = String(row.month_key || row.monthKey || "");
      return key <= filters.toMonth;
    });
  }
  return list;
});

// 10 items per page pagination
const currentPage = ref(1);
const perPage = ref(10);

const paginatedSummaries = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return filteredSummaries.value.slice(start, start + perPage.value);
});

const paginationData = computed(() => {
  const total = filteredSummaries.value.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage.value));
  return {
    current_page: currentPage.value,
    last_page: lastPage,
    per_page: perPage.value,
    total
  };
});

function onPageChange(page: number) {
  currentPage.value = page;
}

const totalRecordsCount = computed(() => {
  return filteredSummaries.value.reduce((acc, row) => acc + Number(row.total_records || row.totalRecords || 0), 0);
});

const totalValueSum = computed(() => {
  return filteredSummaries.value.reduce((acc, row) => acc + Number(row.total_value || row.totalValue || 0), 0);
});

const totalUniqueLcs = computed(() => {
  return filteredSummaries.value.reduce((acc, row) => acc + Number(row.total_lc_unq || row.totalLcUnq || 0), 0);
});

const totalUniqueBen = computed(() => {
  return filteredSummaries.value.reduce((acc, row) => acc + Number(row.total_ben_unq || row.totalBenUnq || 0), 0);
});

async function fetchSummaries() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filters.year) params.year = filters.year;
    if (filters.fromMonth) params.fromMonth = filters.fromMonth;
    if (filters.toMonth) params.toMonth = filters.toMonth;

    const res = await axios.get("/api/data-management/reports/monthwise", { params });
    summaries.value = res.data?.data || [];
  } catch (error: any) {
    toast.danger(error.response?.data?.message || "Failed to load monthwise report.");
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  currentPage.value = 1;
  // If year is selected and month range conflicts, update accordingly
  if (filters.fromMonth && filters.toMonth && filters.fromMonth > filters.toMonth) {
    const temp = filters.fromMonth;
    filters.fromMonth = filters.toMonth;
    filters.toMonth = temp;
  }
  fetchSummaries();
}

function resetFilters() {
  currentPage.value = 1;
  filters.year = "";
  filters.fromMonth = "";
  filters.toMonth = "";
  fetchSummaries();
  toast.info("Filters reset.");
}

function exportExcel() {
  if (filteredSummaries.value.length === 0) return;
  const headers = [
    "Month",
    "Total Records",
    "Registered LCs",
    "Unique LCs",
    "Beneficiaries (Reg)",
    "Beneficiaries (Unq)",
    "Banks (Reg)",
    "Banks (Unq)"
  ];
  const csvRows = [headers.join(",")];

  for (const row of filteredSummaries.value) {
    const values = [
      `"${row.month_key || row.monthKey}"`,
      row.total_records || row.totalRecords || 0,
      row.total_lc_reg || row.totalLcReg || 0,
      row.total_lc_unq || row.totalLcUnq || 0,
      row.total_ben_reg || row.totalBenReg || 0,
      row.total_ben_unq || row.totalBenUnq || 0,
      row.total_bank_reg || row.totalBankReg || 0,
      row.total_bank_unq || row.totalBankUnq || 0
    ];
    csvRows.push(values.join(","));
  }

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `monthwise_lc_summary_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Excel CSV exported successfully.");
}

onMounted(() => {
  fetchSummaries();
});
</script>

<style scoped>
.filter-toolbar-card {
  background: var(--app-surface, #ffffff);
}

.fs-7 {
  font-size: 0.8rem;
}
</style>
