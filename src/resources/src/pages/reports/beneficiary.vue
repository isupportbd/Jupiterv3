<template>
  <div class="container-fluid pt-1 pb-4 px-0">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h4 class="fw-bold mb-1">
          <i class="bi bi-diagram-3 text-primary me-2"></i>
          Beneficiary LC Transaction Report
        </h4>
        <p class="text-muted small mb-0">Multi-parameter filter across beneficiary transactions, date ranges, and bank distributions.</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-primary btn-sm" @click="fetchRecords(paginationData.current_page)" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1" :class="{ 'spin': loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Filters Toolbar (Exact 2-Row Aligned Layout Matching User Specification) -->
    <div class="card border mb-3 filter-card">
      <div class="card-body p-2 p-md-3">
        <div class="row g-2 align-items-stretch">
          <!-- 1. LC Date Range Card -->
          <div class="col-12 col-md-auto date-col">
            <div class="filter-box border rounded p-2 h-100 d-flex flex-column justify-content-between">
              <div class="small fw-semibold text-body d-flex align-items-center mb-1">
                <i class="bi bi-calendar-check text-info me-1"></i> LC Date Range
              </div>
              <div class="d-flex align-items-center gap-1 w-100">
                <input
                  v-model="filters.lcDateFrom"
                  type="date"
                  class="form-control form-control-sm date-input-field"
                  title="LC Date From"
                  @change="applyFilters" />
                <span class="text-muted small px-1 flex-shrink-0">to</span>
                <input
                  v-model="filters.lcDateTo"
                  type="date"
                  class="form-control form-control-sm date-input-field"
                  title="LC Date To"
                  @change="applyFilters" />
              </div>
            </div>
          </div>

          <!-- 2. Entry Date Range Card -->
          <div class="col-12 col-md-auto date-col">
            <div class="filter-box border rounded p-2 h-100 d-flex flex-column justify-content-between">
              <div class="small fw-semibold text-body d-flex align-items-center mb-1">
                <i class="bi bi-clock-history text-primary me-1"></i> Entry Date Range
              </div>
              <div class="d-flex align-items-center gap-1 w-100">
                <input
                  v-model="filters.entryDateFrom"
                  type="date"
                  class="form-control form-control-sm date-input-field"
                  title="Entry Date From"
                  @change="applyFilters" />
                <span class="text-muted small px-1 flex-shrink-0">to</span>
                <input
                  v-model="filters.entryDateTo"
                  type="date"
                  class="form-control form-control-sm date-input-field"
                  title="Entry Date To"
                  @change="applyFilters" />
              </div>
            </div>
          </div>

          <!-- 3. Beneficiary Multi-Select & Search + Actions (Stacked 2 Rows) -->
          <div class="col-12 col-xl flex-grow-1">
            <div class="d-flex flex-column justify-content-between h-100 gap-2">
              <!-- Top Row: Beneficiary Multi-Select + Reset Button -->
              <div class="d-flex align-items-center gap-2">
                <!-- Beneficiary Multi-Select Field -->
                <div class="position-relative flex-grow-1" ref="benDropdownContainer">
                  <div class="input-group input-group-sm seamless-input-group">
                    <span class="input-group-text">
                      <i class="bi bi-building text-primary"></i>
                    </span>
                    <input
                      v-model="beneficiarySearchInput"
                      type="text"
                      class="form-control"
                      :placeholder="selectedBeneficiariesPlaceholder"
                      @input="onBenSearchInput"
                      @click="onInputClick" />
                    <button
                      v-if="selectedBeneficiaryIds.length > 0 || beneficiarySearchInput"
                      type="button"
                      class="btn btn-clear-icon"
                      title="Clear Selection"
                      @click.stop="clearAllBeneficiaries">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>

                  <!-- Framework Themed Multi-Select Dropdown Menu -->
                  <div
                    v-if="showBenDropdown"
                    class="app-dropdown-panel position-absolute w-100 start-0 z-3 mt-1"
                    style="top: 100%;">
                    <div class="app-dropdown-list" style="max-height: 240px; overflow-y: auto;">
                      <div v-if="benLoading" class="p-3 text-center text-muted small">
                        <div class="spinner-border spinner-border-sm text-primary me-2"></div> Loading beneficiaries...
                      </div>
                      <div v-else-if="benSearchResults.length === 0" class="p-3 text-center text-muted small">
                        No beneficiaries found.
                      </div>
                      <div
                        v-else
                        v-for="b in benSearchResults"
                        :key="b.id"
                        class="app-dropdown-item"
                        :class="{ 'selected': isTempSelected(b.id) }"
                        @click.stop="toggleBeneficiarySelection(b)">
                        <input
                          type="checkbox"
                          class="form-check-input me-2 mt-0 pointer-events-none"
                          :checked="isTempSelected(b.id)" />
                        <div class="text-truncate flex-grow-1">
                          <span class="text-body fw-medium">{{ b.name }}</span>
                          <small v-if="b.address" class="text-muted d-block text-truncate" style="font-size: 0.75rem;">
                            {{ b.address }}
                          </small>
                        </div>
                      </div>
                    </div>

                    <!-- Dropdown Footer with Clear & OK -->
                    <div class="app-dropdown-footer">
                      <span class="small fw-semibold text-body">
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle me-1">
                          {{ tempSelectedIds.length }}
                        </span>
                        Selected
                      </span>
                      <div class="d-flex gap-2">
                        <button
                          type="button"
                          class="btn btn-outline-secondary btn-sm py-1 px-3"
                          @click.stop="clearTempSelection">
                          Clear
                        </button>
                        <button
                          type="button"
                          class="btn btn-primary btn-sm py-1 px-3 fw-semibold"
                          @click.stop="confirmBeneficiarySelection">
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Reset Button -->
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm action-btn d-flex align-items-center justify-content-center gap-1"
                  title="Reset All Filters"
                  @click="resetFilters">
                  <i class="bi bi-arrow-counterclockwise"></i>
                  <span>Reset</span>
                </button>
              </div>

              <!-- Bottom Row: Search Input + Excel Export Button -->
              <div class="d-flex align-items-center gap-2">
                <div class="input-group input-group-sm seamless-input-group flex-grow-1">
                  <span class="input-group-text">
                    <i class="bi bi-search text-muted"></i>
                  </span>
                  <input
                    v-model="filters.search"
                    type="text"
                    class="form-control"
                    placeholder="Search LC ID, Bank, Buyer..."
                    @keyup.enter="applyFilters" />
                </div>

                <!-- Excel Export Button -->
                <button
                  type="button"
                  class="btn btn-success btn-sm action-btn fw-semibold d-flex align-items-center justify-content-center gap-1"
                  title="Export to Excel"
                  :disabled="exporting || records.length === 0"
                  @click="exportExcel">
                  <i class="bi bi-file-earmark-excel" :class="{ 'spin': exporting }"></i>
                  <span>Excel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 12-Column Beneficiary Report Table (Strictly Framework Themed) -->
    <div class="card border">
      <div class="card-header border-bottom py-3 d-flex justify-content-between align-items-center">
        <h6 class="fw-bold mb-0">
          <i class="bi bi-table me-2 text-primary"></i> Beneficiary LC Transaction Records
        </h6>
        <span v-if="paginationData.total > 0" class="badge bg-body-secondary text-body border">
          {{ Number(paginationData.total).toLocaleString() }} Records
        </span>
      </div>

      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover table-sm align-middle mb-0 text-nowrap" style="font-size: 0.8125rem;">
            <thead class="table-light">
              <tr>
                <th class="ps-3 text-center" style="width: 45px;">#</th>
                <th style="max-width: 220px;">Beneficiary Name</th>
                <th style="max-width: 250px;">Address</th>
                <th style="max-width: 170px;">Bank</th>
                <th style="max-width: 150px;">Branch</th>
                <th>LC ID</th>
                <th class="text-end">LC Value</th>
                <th>LC Date</th>
                <th>Expiry Date</th>
                <th style="max-width: 200px;">Exporter Info</th>
                <th style="max-width: 170px;">Beneficiary Bank</th>
                <th class="pe-3">Entry Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="12" class="text-center py-5">
                  <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
                  <span class="text-muted ms-2">Loading beneficiary records...</span>
                </td>
              </tr>
              <tr v-else-if="records.length === 0">
                <td colspan="12" class="text-center py-5 text-muted">
                  <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                  No beneficiary LC records found matching criteria.
                </td>
              </tr>
              <tr v-for="(row, idx) in records" :key="row.id">
                <td class="ps-3 text-center text-muted">
                  {{ (paginationData.current_page - 1) * paginationData.per_page + (idx + 1) }}
                </td>
                <td class="fw-semibold text-truncate" style="max-width: 220px;" :title="row.beneficiaryName">
                  <router-link
                    :to="`/reports/beneficiary-detail?id=${row.beneficiaryId}`"
                    class="text-decoration-none text-primary hover-underline text-truncate d-block"
                    :title="row.beneficiaryName">
                    {{ row.beneficiaryName }}
                  </router-link>
                </td>
                <td class="text-muted text-truncate" style="max-width: 250px;" :title="row.beneficiaryAddress || ''">
                  {{ row.beneficiaryAddress || '-' }}
                </td>
                <td class="text-truncate" style="max-width: 170px;" :title="row.bankName || ''">
                  {{ row.bankName || '-' }}
                </td>
                <td class="text-truncate" style="max-width: 150px;" :title="row.branchName || ''">
                  {{ row.branchName || '-' }}
                </td>
                <td class="font-monospace fw-bold text-primary">{{ formatLcId(row.lcId) }}</td>
                <td class="text-end font-monospace fw-semibold text-success">
                  ${{ Number(row.lcValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </td>
                <td class="font-monospace">{{ formatDate(row.lcDate) }}</td>
                <td class="font-monospace">{{ formatDate(row.lcExpiryDate) }}</td>
                <td class="text-muted text-truncate" style="max-width: 200px;" :title="row.exporterInfo || ''">
                  {{ row.exporterInfo || '-' }}
                </td>
                <td class="text-truncate" style="max-width: 170px;" :title="row.beneficiaryBank || ''">
                  {{ row.beneficiaryBank || '-' }}
                </td>
                <td class="pe-3 font-monospace">{{ formatDate(row.entryDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Framework Native Pagination (10 records per page, Right-Aligned) -->
      <div v-if="paginationData.total > 0" class="card-footer border-top py-3">
        <Pagination :data="paginationData" @load-page="fetchRecords" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import Pagination from "@/components/datatable/Pagination.vue";
import { useExportCsv } from "@/composables/useExportCsv";
import { useFormatters } from "@/composables/useFormatters";
import { toast } from "@/composables/useToast";

const { exportCsv } = useExportCsv();
const { formatDate, formatLcId, formatCurrency } = useFormatters();

const records = ref<any[]>([]);
const loading = ref(false);
const exporting = ref(false);

// Beneficiary Multi-Select State
const benDropdownContainer = ref<HTMLElement | null>(null);
const showBenDropdown = ref(false);
const benLoading = ref(false);
const beneficiarySearchInput = ref("");
const benSearchResults = ref<any[]>([]);

const selectedBeneficiaryIds = ref<number[]>([]);
const selectedBeneficiaryMap = ref<Record<number, string>>({});
const tempSelectedIds = ref<number[]>([]);

const selectedBeneficiariesPlaceholder = computed(() => {
  const count = selectedBeneficiaryIds.value.length;
  if (count === 0) return "Type to search or select Beneficiary...";
  if (count === 1) {
    const id = selectedBeneficiaryIds.value[0];
    return selectedBeneficiaryMap.value[id] || "1 beneficiary selected";
  }
  return `${count} beneficiaries selected`;
});

const filters = reactive({
  lcDateFrom: "",
  lcDateTo: "",
  entryDateFrom: "",
  entryDateTo: "",
  search: ""
});

const paginationData = ref<any>({
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 10,
  from: 0,
  to: 0,
  data: []
});

let benDebounceTimer: any = null;

function isTempSelected(id: number) {
  return tempSelectedIds.value.includes(id);
}

function toggleBeneficiarySelection(b: any) {
  const idx = tempSelectedIds.value.indexOf(b.id);
  if (idx > -1) {
    tempSelectedIds.value.splice(idx, 1);
  } else {
    tempSelectedIds.value.push(b.id);
    selectedBeneficiaryMap.value[b.id] = b.name;
  }
}

function clearTempSelection() {
  tempSelectedIds.value = [];
}

function confirmBeneficiarySelection() {
  selectedBeneficiaryIds.value = [...tempSelectedIds.value];
  showBenDropdown.value = false;
  beneficiarySearchInput.value = "";
  applyFilters();
}

function clearAllBeneficiaries() {
  selectedBeneficiaryIds.value = [];
  tempSelectedIds.value = [];
  beneficiarySearchInput.value = "";
  showBenDropdown.value = false;
  applyFilters();
}

function onInputClick() {
  const q = beneficiarySearchInput.value.trim();
  if (q.length > 0) {
    if (!showBenDropdown.value) {
      tempSelectedIds.value = [...selectedBeneficiaryIds.value];
      showBenDropdown.value = true;
    }
  }
}

async function fetchBeneficiaryOptions(query = "") {
  benLoading.value = true;
  try {
    const res = await axios.get("/api/data-management/beneficiaries/search", {
      params: { q: query.trim() || undefined, limit: 30 }
    });
    benSearchResults.value = res.data?.data || [];
    benSearchResults.value.forEach((b: any) => {
      selectedBeneficiaryMap.value[b.id] = b.name;
    });
  } catch {
    benSearchResults.value = [];
  } finally {
    benLoading.value = false;
  }
}

function onBenSearchInput() {
  clearTimeout(benDebounceTimer);
  const q = beneficiarySearchInput.value.trim();
  if (!q) {
    showBenDropdown.value = false;
    benSearchResults.value = [];
    return;
  }

  if (!showBenDropdown.value) {
    tempSelectedIds.value = [...selectedBeneficiaryIds.value];
  }

  benDebounceTimer = setTimeout(async () => {
    await fetchBeneficiaryOptions(q);
    showBenDropdown.value = true;
  }, 200);
}

function handleClickOutside(event: MouseEvent) {
  if (
    benDropdownContainer.value &&
    !benDropdownContainer.value.contains(event.target as Node)
  ) {
    showBenDropdown.value = false;
  }
}

async function fetchRecords(page = 1) {
  loading.value = true;
  try {
    const res = await axios.get("/api/data-management/reports/beneficiary", {
      params: {
        page,
        per_page: 10,
        beneficiaryIds: selectedBeneficiaryIds.value.length > 0 ? selectedBeneficiaryIds.value.join(",") : undefined,
        lcDateFrom: filters.lcDateFrom || undefined,
        lcDateTo: filters.lcDateTo || undefined,
        entryDateFrom: filters.entryDateFrom || undefined,
        entryDateTo: filters.entryDateTo || undefined,
        search: filters.search || undefined
      }
    });

    records.value = res.data?.data || [];
    const meta = res.data?.meta || {};
    const total = Number(meta.total || 0);
    const perPage = Number(meta.perPage || 10);
    const currentPage = Number(meta.currentPage || page);
    const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const to = Math.min(currentPage * perPage, total);

    paginationData.value = {
      current_page: currentPage,
      last_page: Number(meta.lastPage || 1),
      total,
      per_page: perPage,
      from,
      to,
      data: records.value
    };
  } catch (error: any) {
    toast.danger(error.response?.data?.message || "Failed to load beneficiary report.");
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  fetchRecords(1);
}

function resetFilters() {
  filters.lcDateFrom = "";
  filters.lcDateTo = "";
  filters.entryDateFrom = "";
  filters.entryDateTo = "";
  filters.search = "";
  selectedBeneficiaryIds.value = [];
  tempSelectedIds.value = [];
  beneficiarySearchInput.value = "";
  showBenDropdown.value = false;
  fetchRecords(1);
}

async function exportExcel() {
  exporting.value = true;
  try {
    const res = await axios.get("/api/data-management/reports/beneficiary", {
      params: {
        page: 1,
        per_page: 10000,
        beneficiaryIds: selectedBeneficiaryIds.value.length > 0 ? selectedBeneficiaryIds.value.join(",") : undefined,
        lcDateFrom: filters.lcDateFrom || undefined,
        lcDateTo: filters.lcDateTo || undefined,
        entryDateFrom: filters.entryDateFrom || undefined,
        entryDateTo: filters.entryDateTo || undefined,
        search: filters.search || undefined
      }
    });

    const exportData = res.data?.data || [];
    if (exportData.length === 0) {
      toast.warning("No records to export.");
      return;
    }

    const headers = [
      "#",
      "BENEFICIARY_NAME",
      "BENEFICIARY_ADDRESS",
      "BANK_NAME",
      "BRANCH_NAME",
      "LC_ID",
      "LC_VALUE",
      "LC_DATE",
      "LC_EXPIRY_DATE",
      "EXPORTER_INFO",
      "BENEFICIARY_BANK",
      "ENTRY_DATE"
    ];

    const rows = exportData.map((r: any, idx: number) => [
      idx + 1,
      r.beneficiaryName,
      r.beneficiaryAddress,
      r.bankName,
      r.branchName,
      formatLcId(r.lcId),
      r.lcValue || "0.00",
      formatDate(r.lcDate),
      formatDate(r.lcExpiryDate),
      r.exporterInfo,
      r.beneficiaryBank,
      formatDate(r.entryDate)
    ]);

    exportCsv({
      filename: `beneficiary_lc_report_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    });

    toast.success(`Successfully exported ${exportData.length} records.`);
  } catch (error: any) {
    toast.danger(error.response?.data?.message || "Failed to export report.");
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  fetchRecords(1);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.date-col {
  width: 295px;
  flex: 0 0 295px;
  max-width: 100%;
}
.date-input-field {
  flex: 1 1 0;
  min-width: 0;
  padding-left: 6px;
  padding-right: 6px;
  background-color: var(--app-surface) !important;
  color: var(--app-text) !important;
  border-color: var(--app-border) !important;
}
.filter-box {
  min-height: 72px;
  background-color: var(--app-surface) !important;
  border-color: var(--app-border) !important;
}
.action-btn {
  min-width: 90px;
  height: 31px;
}
.seamless-input-group {
  border: 1px solid var(--app-border) !important;
  border-radius: 0.375rem !important;
  background-color: var(--app-surface) !important;
  height: 31px;
  min-height: 31px;
  align-items: center;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}
.seamless-input-group:focus-within {
  border-color: var(--app-primary) !important;
  box-shadow: 0 0 0 2px rgba(var(--bs-primary-rgb), 0.2) !important;
}
.seamless-input-group .input-group-text {
  background: transparent !important;
  border: none !important;
  padding: 0 0.5rem 0 0.65rem !important;
  color: var(--app-text-muted) !important;
  height: 100%;
  display: flex;
  align-items: center;
}
.seamless-input-group .form-control {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: var(--app-text) !important;
  padding: 0 0.5rem 0 0.25rem !important;
  height: 100%;
  font-size: 0.8125rem;
}
.seamless-input-group .form-control::placeholder {
  color: var(--app-text-muted) !important;
}
.seamless-input-group .form-control:focus {
  outline: none !important;
  box-shadow: none !important;
}
.seamless-input-group .btn-clear-icon {
  background: transparent !important;
  border: none !important;
  color: var(--app-text-muted) !important;
  padding: 0 0.5rem;
  height: 100%;
  display: flex;
  align-items: center;
}
.seamless-input-group .btn-clear-icon:hover {
  color: var(--app-text) !important;
}

/* Framework Dropdown Panel & Items */
.app-dropdown-panel {
  background-color: var(--app-surface) !important;
  border: 1px solid var(--app-border) !important;
  border-radius: 0.375rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  color: var(--app-text) !important;
  overflow: hidden;
}
.app-dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: transparent;
  border: none;
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text) !important;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
}
.app-dropdown-item:last-child {
  border-bottom: none;
}
.app-dropdown-item:hover,
.app-dropdown-item.selected {
  background-color: var(--app-hover) !important;
}
.app-dropdown-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background-color: var(--app-surface) !important;
  border-top: 1px solid var(--app-border) !important;
}
.pointer-events-none {
  pointer-events: none;
}
.hover-underline:hover {
  text-decoration: underline !important;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
