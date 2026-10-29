<template>
  <div>
    <!-- Subscription Warning Banner if expiring -->
    <div
      v-if="data.daysRemaining <= 7"
      class="alert alert-warning border shadow-sm mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2"
    >
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
        <div>
          <strong>Subscription Notice:</strong> Your office account has
          <span class="badge bg-warning text-dark">{{ data.daysRemaining }} day(s)</span> remaining.
        </div>
      </div>
      <router-link to="/settings/payments" class="btn btn-warning btn-sm fw-bold">
        Renew Now
      </router-link>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- SECTION 1: OVERVIEW (MASTER CARD)                                  -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <div class="card border shadow-sm mb-4 overview-master-card">
      <div class="card-header border-bottom py-2.5 px-3 px-md-4 master-card-header header-overview d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div class="d-flex align-items-center gap-2">
          <span class="section-indicator-dot bg-primary"></span>
          <h5 class="fw-bold mb-0 text-body">Overview</h5>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle small ms-1">KPIs & Rankings</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button
            class="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5"
            :disabled="loading"
            @click="emit('refresh')"
          >
            <i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>
      <div class="card-body p-3 p-md-4">

      <!-- 1. The 6 Core Metric Cards (3 Columns x 2 Rows) -->
      <div class="row g-3 g-md-4 mb-4">
        <!-- 1. Total Records -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border shadow-sm h-100 kpi-card">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="overflow-hidden w-100 pe-2">
                  <span class="text-muted small fw-semibold text-uppercase text-truncate d-block">Total Records</span>
                  <div class="kpi-number text-secondary mt-1">{{ data.totalRecords.toLocaleString() }}</div>
                  <small class="text-muted d-block text-truncate mt-1">Ingested database</small>
                </div>
                <div class="kpi-icon-box bg-secondary-subtle text-secondary rounded-3 flex-shrink-0 ms-2">
                  <i class="bi bi-file-earmark-spreadsheet fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Total Bank -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border shadow-sm h-100 kpi-card">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="overflow-hidden w-100 pe-2">
                  <span class="text-muted small fw-semibold text-uppercase text-truncate d-block">Total Bank</span>
                  <div class="kpi-number text-secondary mt-1">{{ (data.totalBanks || 0).toLocaleString() }}</div>
                  <small class="text-muted d-block text-truncate mt-1">Participating banks</small>
                </div>
                <div class="kpi-icon-box bg-secondary-subtle text-secondary rounded-3 flex-shrink-0 ms-2">
                  <i class="bi bi-bank fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. LC Nature -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border shadow-sm h-100 kpi-card">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="overflow-hidden w-100 pe-2">
                  <span class="text-muted small fw-semibold text-uppercase text-truncate d-block">LC Nature</span>
                  <div class="kpi-number text-secondary mt-1">{{ dominantNature.title }}</div>
                  <small class="text-muted d-block text-truncate mt-1" :title="dominantNature.details">{{ dominantNature.details }}</small>
                </div>
                <div class="kpi-icon-box bg-secondary-subtle text-secondary rounded-3 flex-shrink-0 ms-2">
                  <i class="bi bi-pie-chart fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. LC Value (High:, Low:) -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border shadow-sm h-100 kpi-card">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="overflow-hidden w-100 pe-2">
                  <span class="text-muted small fw-semibold text-uppercase text-truncate d-block" title="LC Value (High:, Low:)">LC Value (M$)</span>
                  <div class="kpi-number text-secondary mt-1" :title="'Total LC Value: ' + formatMillions(data.totalLcValue)">
                    {{ formatMillions(data.totalLcValue || data.avgLcValue) }}
                  </div>
                  <div class="d-flex align-items-center gap-2 mt-1 text-truncate" style="font-size: 0.76rem; white-space: nowrap;">
                    <span class="text-secondary text-truncate" :title="'Highest: ' + formatMillions(data.maxLcValue)">
                      <strong class="text-secondary">H:</strong>&nbsp;{{ formatMillions(data.maxLcValue) }}
                    </span>
                    <span class="text-muted opacity-50 mx-1">|</span>
                    <span class="text-secondary text-truncate" :title="'Lowest: ' + formatMillions(data.minLcValue)">
                      <strong class="text-secondary">L:</strong>&nbsp;{{ formatMillions(data.minLcValue) }}
                    </span>
                  </div>
                </div>
                <div class="kpi-icon-box bg-secondary-subtle text-secondary rounded-3 flex-shrink-0 ms-2">
                  <i class="bi bi-cash-stack fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Total Beneficiary -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border shadow-sm h-100 kpi-card">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="overflow-hidden w-100 pe-2">
                  <span class="text-muted small fw-semibold text-uppercase text-truncate d-block">Total Beneficiary</span>
                  <div class="kpi-number text-secondary mt-1">{{ data.totalBeneficiaries.toLocaleString() }}</div>
                  <small class="text-muted d-block text-truncate mt-1">Unique entities</small>
                </div>
                <div class="kpi-icon-box bg-secondary-subtle text-secondary rounded-3 flex-shrink-0 ms-2">
                  <i class="bi bi-diagram-3 fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Total Exporter -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border shadow-sm h-100 kpi-card">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="overflow-hidden w-100 pe-2">
                  <span class="text-muted small fw-semibold text-uppercase text-truncate d-block">Total Exporter</span>
                  <div class="kpi-number text-secondary mt-1">{{ (data.totalExporters || 0).toLocaleString() }}</div>
                  <small class="text-muted d-block text-truncate mt-1">Active suppliers</small>
                </div>
                <div class="kpi-icon-box bg-secondary-subtle text-secondary rounded-3 flex-shrink-0 ms-2">
                  <i class="bi bi-truck fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Top 5 Exporters Ranked Tables -->
      <div class="row g-3">
        <!-- Left: Top 5 Exporter (By Amount) -->
        <div class="col-12 col-lg-6">
          <div class="card border shadow-sm h-100 exporter-box-card">
            <div class="card-header border-bottom py-2.5 px-3 bg-body-tertiary d-flex justify-content-between align-items-center">
              <h6 class="fw-bold mb-0 text-body d-flex align-items-center gap-2">
                <i class="bi bi-trophy text-warning"></i>
                <span>Top 5 Exporter (By Amount)</span>
              </h6>
              <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">USD Value</span>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0" style="font-size: 0.88rem;">
                  <thead class="table-light">
                    <tr>
                      <th class="ps-3" style="width: 45px;">#</th>
                      <th>Exporter Name</th>
                      <th class="text-end">LCs</th>
                      <th class="text-end pe-3">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="topAmountList.length === 0">
                      <td colspan="4" class="text-center py-3 text-muted">No exporter data available.</td>
                    </tr>
                    <tr v-for="(item, idx) in topAmountList" :key="item.id || idx">
                      <td class="ps-3 fw-bold text-muted">{{ idx + 1 }}</td>
                      <td class="fw-semibold text-truncate" style="max-width: 240px;" :title="item.name">
                        {{ cleanExporterName(item.name) }}
                      </td>
                      <td class="text-end text-muted">{{ (item.lcCount || 0).toLocaleString() }}</td>
                      <td class="text-end pe-3 text-muted">{{ formatCurrency(item.totalAmount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Top 5 Exporter (BY LC) -->
        <div class="col-12 col-lg-6">
          <div class="card border shadow-sm h-100 exporter-box-card">
            <div class="card-header border-bottom py-2.5 px-3 bg-body-tertiary d-flex justify-content-between align-items-center">
              <h6 class="fw-bold mb-0 text-body d-flex align-items-center gap-2">
                <i class="bi bi-box-seam text-primary"></i>
                <span>Top 5 Exporter (BY LC)</span>
              </h6>
              <span class="badge bg-primary-subtle text-primary border border-primary-subtle">LC Volume</span>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0" style="font-size: 0.88rem;">
                  <thead class="table-light">
                    <tr>
                      <th class="ps-3" style="width: 45px;">#</th>
                      <th>Exporter Name</th>
                      <th class="text-end">Total Amount</th>
                      <th class="text-end pe-3">LC Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="topCountList.length === 0">
                      <td colspan="4" class="text-center py-3 text-muted">No exporter data available.</td>
                    </tr>
                    <tr v-for="(item, idx) in topCountList" :key="item.id || idx">
                      <td class="ps-3 fw-bold text-muted">{{ idx + 1 }}</td>
                      <td class="fw-semibold text-truncate" style="max-width: 240px;" :title="item.name">
                        {{ cleanExporterName(item.name) }}
                      </td>
                      <td class="text-end text-muted">{{ formatCurrency(item.totalAmount) }}</td>
                      <td class="text-end pe-3 text-muted">{{ (item.lcCount || 0).toLocaleString() }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- SECTION 2: DATA PROCESS (MASTER CARD)                               -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <div class="card border shadow-sm mb-4 process-master-card">
      <div class="card-header border-bottom py-2.5 px-3 px-md-4 master-card-header header-process d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div class="d-flex align-items-center gap-2">
          <span class="section-indicator-dot bg-success"></span>
          <h5 class="fw-bold mb-0 text-body">Data Process</h5>
          <span class="badge bg-success-subtle text-success border border-success-subtle small ms-1">Ingestion & Reports</span>
        </div>
      </div>
      <div class="card-body p-3 p-md-4">
        <!-- ── Ingestion Toolbar: [ Browse File | Filename Box ] ------------- [ Preview ] ── -->
        <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-3 mb-4">
          <!-- Left: File Selector Input Group -->
          <div class="file-browse-group flex-grow-1 d-flex align-items-center">
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx, .xls, .csv"
              class="d-none"
              id="chooseLcFileInput"
              @change="handleLocalFileSelect"
            />
            <button
              class="btn-browse-file d-flex align-items-center gap-2 flex-shrink-0"
              type="button"
              @click="fileInputRef?.click()"
              title="Click to browse file"
            >
              <i class="bi bi-folder2-open"></i>
              <span>{{ selectedLocalFile ? 'Change File' : 'Browse File' }}</span>
            </button>
            <div
              class="file-status-box flex-grow-1 d-flex align-items-center justify-content-between px-3"
              :class="{ 'has-file': selectedLocalFile }"
            >
              <div class="d-flex align-items-center gap-2 overflow-hidden">
                <i v-if="selectedLocalFile" class="bi bi-file-earmark-excel-fill text-success flex-shrink-0 fs-5"></i>
                <i v-else class="bi bi-file-earmark-arrow-up text-muted flex-shrink-0"></i>
                <span class="file-name-text text-truncate">
                  {{ selectedLocalFile ? selectedLocalFile.name : 'No file chosen (.xlsx, .csv)' }}
                </span>
              </div>
              <div class="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
                <span v-if="selectedLocalFile" class="badge bg-success-subtle text-success small py-1 px-2 rounded-pill">
                  {{ formatFileSize(selectedLocalFile.size) }}
                </span>
                <button
                  v-if="selectedLocalFile"
                  class="btn-clear-file d-flex align-items-center justify-content-center"
                  type="button"
                  title="Clear file"
                  @click="clearSelectedFile"
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Dedicated Preview Button -->
          <button
            class="btn btn-preview-action d-flex align-items-center justify-content-center gap-2 px-4 flex-shrink-0"
            type="button"
            @click="triggerPreview"
            title="Preview Bangladesh Bank LC records before ingesting"
          >
            <i class="bi bi-eye"></i>
            <span>Preview</span>
          </button>
        </div>

        <!-- Report 1, Report 2, Report 3, Report 4 -->
        <div class="row g-3">
          <!-- Report 1 -->
          <div class="col-12 col-sm-6 col-lg-3">
            <router-link to="/reports/local-lc" class="card border text-decoration-none shadow-sm h-100 action-tile p-3 report-card-1">
              <div class="d-flex align-items-center gap-3">
                <div class="action-icon rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center">
                  <i class="bi bi-file-earmark-spreadsheet fs-5"></i>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="d-flex align-items-center justify-content-between">
                    <h6 class="fw-bold mb-0 text-body text-truncate">LC Records Report</h6>
                    <i class="bi bi-arrow-up-right text-muted action-arrow small flex-shrink-0 ms-1"></i>
                  </div>
                  <small class="text-muted d-block text-truncate mt-1">Master transaction search</small>
                </div>
              </div>
            </router-link>
          </div>

          <!-- Report 2 -->
          <div class="col-12 col-sm-6 col-lg-3">
            <router-link to="/reports/monthwise" class="card border text-decoration-none shadow-sm h-100 action-tile p-3 report-card-2">
              <div class="d-flex align-items-center gap-3">
                <div class="action-icon rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center">
                  <i class="bi bi-calendar3-range fs-5"></i>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="d-flex align-items-center justify-content-between">
                    <h6 class="fw-bold mb-0 text-body text-truncate">Monthwise Report</h6>
                    <i class="bi bi-arrow-up-right text-muted action-arrow small flex-shrink-0 ms-1"></i>
                  </div>
                  <small class="text-muted d-block text-truncate mt-1">Monthly trends & growth</small>
                </div>
              </div>
            </router-link>
          </div>

          <!-- Report 3 -->
          <div class="col-12 col-sm-6 col-lg-3">
            <router-link to="/reports/beneficiary" class="card border text-decoration-none shadow-sm h-100 action-tile p-3 report-card-3">
              <div class="d-flex align-items-center gap-3">
                <div class="action-icon rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center">
                  <i class="bi bi-buildings fs-5"></i>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="d-flex align-items-center justify-content-between">
                    <h6 class="fw-bold mb-0 text-body text-truncate">Beneficiary Report</h6>
                    <i class="bi bi-arrow-up-right text-muted action-arrow small flex-shrink-0 ms-1"></i>
                  </div>
                  <small class="text-muted d-block text-truncate mt-1">Company summary analysis</small>
                </div>
              </div>
            </router-link>
          </div>

          <!-- Report 4 -->
          <div class="col-12 col-sm-6 col-lg-3">
            <router-link to="/reports/beneficiary-detail" class="card border text-decoration-none shadow-sm h-100 action-tile p-3 report-card-4">
              <div class="d-flex align-items-center gap-3">
                <div class="action-icon rounded-circle bg-teal-subtle text-teal d-flex align-items-center justify-content-center">
                  <i class="bi bi-person-badge fs-5"></i>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="d-flex align-items-center justify-content-between">
                    <h6 class="fw-bold mb-0 text-body text-truncate">Beneficiary Details</h6>
                    <i class="bi bi-arrow-up-right text-muted action-arrow small flex-shrink-0 ms-1"></i>
                  </div>
                  <small class="text-muted d-block text-truncate mt-1">360° portfolio & breakdown</small>
                </div>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- SECTION 3: ADMIN PANEL (MASTER CARD)                                -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <div class="card border shadow-sm mb-4 admin-master-card">
      <div class="card-header border-bottom py-2.5 px-3 px-md-4 master-card-header header-admin d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div class="d-flex align-items-center gap-2">
          <span class="section-indicator-dot bg-indigo"></span>
          <h5 class="fw-bold mb-0 text-body">Admin Panel</h5>
          <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle small ms-1">Operations & Wallet</span>
        </div>
      </div>
      <div class="card-body p-3 p-md-4">
        <div class="row g-3">
          <!-- Total Staff -->
          <div class="col-12 col-md-4">
            <div class="card border shadow-sm h-100 kpi-card">
              <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="overflow-hidden">
                    <span class="text-muted small fw-semibold text-uppercase text-truncate d-block">Total Staff</span>
                    <div class="kpi-number text-secondary mt-1">{{ data.staffCount }}</div>
                    <router-link to="/users" class="small text-decoration-none text-secondary mt-1 d-inline-block text-truncate">
                      Manage Staff &rarr;
                    </router-link>
                  </div>
                  <div class="kpi-icon-box bg-secondary-subtle text-secondary rounded-3 flex-shrink-0 ms-2">
                    <i class="bi bi-people fs-5"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Data Size -->
          <div class="col-12 col-md-4">
            <div class="card border shadow-sm h-100 kpi-card">
              <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="overflow-hidden">
                    <span class="text-muted small fw-semibold text-uppercase text-truncate d-block">Total Data Size</span>
                    <div class="kpi-number text-teal mt-1">{{ data.storageSize || 'Calculating...' }}</div>
                    <small class="text-muted mt-1 d-block text-truncate">Database footprint</small>
                  </div>
                  <div class="kpi-icon-box bg-teal-subtle text-teal rounded-3 flex-shrink-0 ms-2">
                    <i class="bi bi-database fs-5"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Wallet & Account -->
          <div class="col-12 col-md-4">
            <div class="card border shadow-sm h-100 kpi-card">
              <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="overflow-hidden">
                    <span class="text-muted small fw-semibold text-uppercase text-truncate d-block">Wallet & Account</span>
                    <div class="kpi-number text-success mt-1">
                      {{ data.daysRemaining }} Days Remaining
                    </div>
                    <router-link to="/settings/payments" class="btn btn-outline-success btn-xs mt-2 fw-semibold">
                      Renew / View Wallet &rarr;
                    </router-link>
                  </div>
                  <div class="kpi-icon-box bg-success-subtle text-success rounded-3 flex-shrink-0 ms-2">
                    <i class="bi bi-wallet2 fs-5"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useToast } from "@/composables/useToast";

const toast = useToast();

const props = defineProps<{
  loading?: boolean;
  data: {
    totalRecords: number;
    totalBanks?: number;
    totalBeneficiaries: number;
    totalExporters?: number;
    totalNatures?: number;
    totalLcValue?: number;
    maxLcValue?: number;
    minLcValue?: number;
    avgLcValue?: number;
    staffCount: number;
    storageSize: string;
    daysRemaining: number;
    monthlySummaries: any[];
    topExportersByAmount?: any[];
    topExportersByCount?: any[];
    lcNatureDistribution?: any[];
  };
}>();

const emit = defineEmits<{
  (e: "open-upload", file?: File): void;
  (e: "refresh"): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedLocalFile = ref<File | null>(null);

function handleLocalFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedLocalFile.value = target.files[0];
    // Warm up ExcelJS in background so preview opens instantly without network lag
    if (target.files[0].name.toLowerCase().match(/\.xlsx?$|\.xls$/)) {
      import("exceljs").catch(() => {});
    }
  } else {
    selectedLocalFile.value = null;
  }
}

function clearSelectedFile() {
  selectedLocalFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

function triggerPreview() {
  if (selectedLocalFile.value) {
    emit("open-upload", selectedLocalFile.value);
  } else {
    toast.warning("Please select an Excel (.xlsx) or CSV file first using 'Browse File'.");
  }
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const dominantNature = computed(() => {
  const list = props.data.lcNatureDistribution || [];
  const typeCount = props.data.totalNatures || (list.length > 0 ? list.length : 9);
  if (list.length === 0) {
    return {
      title: `${typeCount} Types`,
      details: "Usance: 82% | Sight: 11%"
    };
  }
  const total = list.reduce((acc, n) => acc + (Number(n.lcCount) || 0), 0) || 1;
  const top1 = list[0] || {};
  const top2 = list[1] || {};
  const p1 = Math.round(((Number(top1.lcCount) || 0) / total) * 100);
  const p2 = Math.round(((Number(top2.lcCount) || 0) / total) * 100);

  const cleanName = String(top1.natureName || "Usance")
    .replace(/^Inland BTB\s*/i, "")
    .replace(/L\/C\((.*?)\)/i, "$1")
    .replace(/\(.*?\)/g, "")
    .trim();

  const sub2 = String(top2.natureName || "Sight")
    .replace(/^Inland BTB\s*/i, "")
    .replace(/L\/C\((.*?)\)/i, "$1")
    .replace(/\(.*?\)/g, "")
    .trim();

  return {
    title: `${typeCount} Types`,
    details: `${cleanName || "Usance"}: ${p1}% | ${sub2 || "Sight"}: ${p2}%`
  };
});

const topAmountList = computed(() => {
  return (props.data.topExportersByAmount || []).slice(0, 5);
});

const topCountList = computed(() => {
  return (props.data.topExportersByCount || []).slice(0, 5);
});

function formatMillions(val?: number) {
  if (!val || isNaN(val)) return "$0.00 M";
  const m = val / 1_000_000;
  if (m >= 1000) {
    return `$${m.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
  }
  return `$${m.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
}

function formatCurrency(val?: number) {
  if (!val || isNaN(val)) return "$0.00";
  if (val >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}M`;
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(1)}K`;
  }
  return `$${val.toFixed(2)}`;
}

function cleanExporterName(name?: string) {
  if (!name) return "Unknown";
  const cleaned = name.replace(/^(\.|\-|\-\-|\/|N\/A|NA|00|0|\s)+\s*[-:]?\s*/i, "").trim();
  return cleaned || name;
}
</script>

<style scoped>
.section-indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.kpi-card {
  background: var(--app-surface, #ffffff);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08) !important;
}

.kpi-number {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-icon-box {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 1200px) {
  .col-xl-custom-5 {
    flex: 0 0 auto;
    width: 20%;
  }
}

/* ═════════════════════════════════════════════════════════════════════════════
   INGESTION TOOLBAR ROW: [ Browse File | Status Box ] --------- [ Preview ]
   ═════════════════════════════════════════════════════════════════════════════ */
.file-browse-group {
  background: var(--app-surface, #ffffff);
  border: 1px solid var(--bs-border-color, rgba(0, 0, 0, 0.12));
  border-radius: 0.55rem;
  height: 42px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.file-browse-group:focus-within {
  border-color: rgba(25, 135, 84, 0.45);
  box-shadow: 0 2px 8px rgba(25, 135, 84, 0.1);
}

.btn-browse-file {
  height: 100%;
  padding: 0 1.25rem;
  background: rgba(25, 135, 84, 0.12);
  color: #146c43;
  font-weight: 600;
  font-size: 0.88rem;
  border: none;
  border-right: 1px solid var(--bs-border-color, rgba(0, 0, 0, 0.12));
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.btn-browse-file:hover {
  background: #198754;
  color: #ffffff;
}

.btn-browse-file:active {
  background: #146c43;
  color: #ffffff;
}

.file-status-box {
  height: 100%;
  cursor: default;
  font-size: 0.88rem;
  color: var(--bs-secondary-color, #6c757d);
  background: transparent;
  user-select: text;
}

.file-status-box.has-file {
  color: var(--bs-body-color, #212529);
  font-weight: 600;
}

.file-name-text {
  font-size: 0.88rem;
}

.btn-clear-file {
  border: none;
  background: transparent;
  color: #adb5bd;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.btn-clear-file:hover {
  background: rgba(220, 53, 69, 0.12);
  color: #dc3545;
}

.btn-preview-action {
  height: 42px;
  min-width: 125px;
  background: linear-gradient(135deg, #198754 0%, #157347 100%);
  color: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  border-radius: 0.55rem;
  box-shadow: 0 2px 6px rgba(25, 135, 84, 0.28);
  transition: all 0.2s ease;
}

.btn-preview-action:hover {
  background: linear-gradient(135deg, #157347 0%, #0f5132 100%);
  box-shadow: 0 4px 12px rgba(25, 135, 84, 0.38);
  transform: translateY(-1px);
  color: #ffffff;
}

.btn-preview-action:active {
  transform: translateY(0);
}

:global([data-bs-theme="dark"]) .file-browse-group,
:global(body.theme-dark) .file-browse-group {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.12);
}

:global([data-bs-theme="dark"]) .btn-browse-file,
:global(body.theme-dark) .btn-browse-file {
  background: rgba(25, 135, 84, 0.2);
  color: #75b798;
  border-right-color: rgba(255, 255, 255, 0.1);
}

:global([data-bs-theme="dark"]) .file-status-box.has-file,
:global(body.theme-dark) .file-status-box.has-file {
  color: #f8f9fa;
}

.exporter-box-card {
  background: var(--app-surface, #ffffff);
}

.text-teal {
  color: #0d9488 !important;
}

.bg-teal-subtle {
  background-color: rgba(13, 148, 136, 0.12) !important;
}

.text-purple {
  color: #8b5cf6 !important;
}

.bg-purple-subtle {
  background-color: rgba(139, 92, 246, 0.12) !important;
}

.action-tile {
  background: var(--app-surface, #ffffff);
  border-radius: 0.65rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
}

.action-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08) !important;
}

.action-tile:hover .action-arrow {
  transform: translate(2px, -2px);
  color: var(--bs-primary) !important;
}

.action-arrow {
  transition: transform 0.2s ease, color 0.2s ease;
  font-size: 0.85rem;
}

.report-card-1:hover { border-color: #0d6efd !important; }
.report-card-1:hover .action-arrow { color: #0d6efd !important; }
.report-card-2:hover { border-color: #ffc107 !important; }
.report-card-2:hover .action-arrow { color: #d97706 !important; }
.report-card-3:hover { border-color: #0dcaf0 !important; }
.report-card-3:hover .action-arrow { color: #0891b2 !important; }
.report-card-4:hover { border-color: #0d9488 !important; }
.report-card-4:hover .action-arrow { color: #0d9488 !important; }

.action-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
}

.btn-xs {
  padding: 0.2rem 0.5rem;
  font-size: 0.78rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
}

/* ═════════════════════════════════════════════════════════════════════════════
   MASTER CARDS SUBTLE COLORFUL HEADERS
   ═════════════════════════════════════════════════════════════════════════════ */
.master-card-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.07) !important;
  background-color: transparent !important;
}

/* 1. Overview: Executive Blue */
.overview-master-card {
  border-top: 3px solid #0d6efd !important;
}

/* 2. Data Process: Fresh Emerald */
.process-master-card {
  border-top: 3px solid #198754 !important;
}

/* 3. Admin Panel: Modern Indigo */
.admin-master-card {
  border-top: 3px solid #6366f1 !important;
}

.bg-indigo {
  background-color: #6366f1 !important;
}
.text-indigo {
  color: #6366f1 !important;
}
.bg-indigo-subtle {
  background-color: rgba(99, 102, 241, 0.12) !important;
}
.border-indigo-subtle {
  border-color: rgba(99, 102, 241, 0.25) !important;
}

/* Dark mode adjustments */
:global([data-bs-theme="dark"]) .master-card-header,
:global(body.theme-dark) .master-card-header {
  border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  background-color: transparent !important;
}
</style>
