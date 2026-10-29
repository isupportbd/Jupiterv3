<template>
  <div>
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
                  <small class="text-muted d-block text-truncate mt-1">Searchable entries</small>
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
                  <small class="text-muted d-block text-truncate mt-1">Companies tracked</small>
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
          <span class="badge bg-success-subtle text-success border border-success-subtle small ms-1">Lookup & Reports</span>
        </div>
      </div>
      <div class="card-body p-3 p-md-4">
        <!-- ── 3. ROW 3: INSTANT SEARCH TOOL BOX ── -->
        <div class="card border shadow-sm mb-4">
          <div class="card-body p-3 p-md-4 text-center">
            <h5 class="fw-bold mb-1">
              <i class="bi bi-search text-primary me-2"></i> Instant LC & Beneficiary Lookup
            </h5>
            <p class="text-muted small mb-3">Quickly search and jump directly to any transaction or company record</p>
            <div class="row justify-content-center">
              <div class="col-12 col-md-8 col-lg-6">
                <div class="input-group">
                  <input
                    v-model="quickSearchQuery"
                    type="text"
                    class="form-control"
                    placeholder="Enter Beneficiary name, LC ID, Bank, or PI Number..."
                    @keyup.enter="performQuickSearch"
                  />
                  <button class="btn btn-primary px-4 fw-semibold" type="button" @click="performQuickSearch">
                    <i class="bi bi-search me-1"></i> Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 4. ROW 4: 4 REPORTS ── -->
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

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
    storageSize?: string;
    topExportersByAmount?: any[];
    topExportersByCount?: any[];
    lcNatureDistribution?: any[];
  };
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const router = useRouter();
const quickSearchQuery = ref("");

function performQuickSearch() {
  const q = quickSearchQuery.value.trim();
  if (q) {
    router.push({ path: "/reports/local-lc", query: { search: q } });
  } else {
    router.push("/reports/local-lc");
  }
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

/* Dark mode adjustments */
:global([data-bs-theme="dark"]) .master-card-header,
:global(body.theme-dark) .master-card-header {
  border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  background-color: transparent !important;
}
</style>

