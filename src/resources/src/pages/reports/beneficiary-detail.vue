<template>
  <div class="container-fluid pt-1 pb-4 px-0">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h4 class="fw-bold mb-1">
          <i class="bi bi-person-badge text-primary me-2"></i>
          Beneficiary Detail Report
        </h4>
        <p class="text-muted small mb-0">360° individual beneficiary profile audit, financing bank distribution, and LC portfolio history.</p>
      </div>
      <div>
        <router-link to="/reports/beneficiary" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left me-1"></i> Back to Beneficiary List
        </router-link>
      </div>
    </div>

    <!-- Beneficiary Autocomplete Search Bar -->
    <div class="card border mb-4">
      <div class="card-body p-3 position-relative">
        <label class="form-label small fw-bold text-muted text-uppercase mb-1">Search Beneficiary Name</label>
        <div class="input-group">
          <span class="input-group-text bg-light border-end-0">
            <i class="bi bi-search text-primary"></i>
          </span>
          <input
            v-model="searchQuery"
            type="text"
            class="form-control form-control-lg border-start-0"
            placeholder="Type beneficiary or company name (e.g. Salman, Pacific, Accord...)"
            @input="onSearchInput"
            @focus="showDropdown = searchResults.length > 0" />
        </div>

        <!-- Autocomplete Suggestions Dropdown -->
        <div
          v-if="showDropdown && searchResults.length > 0"
          class="position-absolute w-100 start-0 px-3 z-3"
          style="top: 100%;">
          <div class="card border-0 shadow-lg mt-1 overflow-hidden">
            <div class="list-group list-group-flush" style="max-height: 280px; overflow-y: auto;">
              <button
                v-for="item in searchResults"
                :key="item.id"
                class="list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center"
                @click="selectBeneficiary(item)">
                <div>
                  <div class="fw-bold text-dark">{{ item.name }}</div>
                  <small class="text-muted">{{ item.address || 'No address on file' }}</small>
                </div>
                <span class="badge bg-primary-subtle text-primary">Select</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Beneficiary Details -->
    <template v-if="selectedBeneficiary">
      <!-- Profile & Summary Cards -->
      <div class="row g-3 mb-4">
        <!-- Profile Card -->
        <div class="col-lg-4">
          <div class="card border h-100 p-4">
            <div class="d-flex align-items-center mb-3">
              <div class="rounded-circle p-3 bg-secondary-subtle text-secondary me-3">
                <i class="bi bi-building fs-3"></i>
              </div>
              <div>
                <h5 class="fw-bold mb-0 text-body">{{ selectedBeneficiary.name }}</h5>
                <small class="text-muted">Beneficiary ID: #{{ selectedBeneficiary.id }}</small>
              </div>
            </div>
            <div class="mt-2 text-muted small">
              <div><i class="bi bi-geo-alt me-1"></i> {{ selectedBeneficiary.address || 'Address not specified' }}</div>
            </div>
          </div>
        </div>

        <!-- Metrics Cards -->
        <div class="col-lg-8">
          <div class="row g-3 h-100">
            <div class="col-sm-6">
              <div class="card border p-3 h-100 d-flex flex-column justify-content-center">
                <span class="text-muted small text-uppercase fw-semibold">Total Export LC Value</span>
                <h3 class="fw-bold text-success mt-1 mb-0 font-monospace">
                  ${{ Number(portfolioStats.total_usd_value || portfolioStats.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </h3>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="card border p-3 h-100 d-flex flex-column justify-content-center">
                <span class="text-muted small text-uppercase fw-semibold">Total LCs Issued</span>
                <h3 class="fw-bold mt-1 mb-0 text-body">
                  {{ Number(portfolioStats.total_lcs || 0).toLocaleString() }} LCs
                </h3>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="card border p-3 h-100 d-flex flex-column justify-content-center">
                <span class="text-muted small text-uppercase fw-semibold">Financing Banks</span>
                <h4 class="fw-bold mt-1 mb-0 text-body">
                  {{ portfolioStats.total_banks || 0 }} Banks
                </h4>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="card border p-3 h-100 d-flex flex-column justify-content-center">
                <span class="text-muted small text-uppercase fw-semibold">Connected Exporters / Buyers</span>
                <h4 class="fw-bold mt-1 mb-0 text-body">
                  {{ portfolioStats.total_buyers || 0 }} Exporters
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Beneficiary LC Records Table -->
      <div class="card border">
        <div class="card-header border-bottom py-3">
          <h6 class="fw-bold mb-0">
            <i class="bi bi-clock-history me-2 text-primary"></i> LC Transaction History for {{ selectedBeneficiary.name }}
          </h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="ps-3">LC ID</th>
                  <th>Year</th>
                  <th>Applicant (Buyer)</th>
                  <th>Bank</th>
                  <th class="text-end">Value</th>
                  <th>Entry Date</th>
                  <th>PI Number</th>
                  <th>Bond License</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingPortfolio">
                  <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
                    <span class="text-muted small ms-2">Loading portfolio...</span>
                  </td>
                </tr>
                <tr v-else-if="portfolioRecords.length === 0">
                  <td colspan="8" class="text-center py-4 text-muted">
                    No LC records found for this beneficiary.
                  </td>
                </tr>
                <tr v-for="lc in portfolioRecords" :key="lc.id">
                  <td class="ps-3 font-monospace fw-bold">{{ lc.lcId }}</td>
                  <td><span class="badge bg-body-secondary text-body border">{{ lc.lcYear || 'N/A' }}</span></td>
                  <td>{{ lc.exporterName || lc.applicantName || 'N/A' }}</td>
                  <td>
                    <div>{{ lc.bankName || 'N/A' }}</div>
                    <small class="text-muted">{{ lc.branchName || '' }}</small>
                  </td>
                  <td class="text-end font-monospace fw-bold text-success">
                    ${{ Number(lc.lcValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </td>
                  <td>{{ formatDate(lc.entryDate) }}</td>
                  <td>{{ lc.piNumber || '-' }}</td>
                  <td>{{ lc.bondLicense || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty State Prompt -->
    <div v-else class="card border text-center py-5">
      <div class="card-body">
        <i class="bi bi-search text-muted fs-1 mb-3 d-block"></i>
        <h5 class="fw-bold text-dark">Select a Beneficiary</h5>
        <p class="text-muted small mb-0">Use the search box above to find and view beneficiary LC portfolios.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { toast } from "@/composables/useToast";

const route = useRoute();

const searchQuery = ref("");
const searchResults = ref<any[]>([]);
const showDropdown = ref(false);

const selectedBeneficiary = ref<any>(null);
const portfolioStats = ref<any>({});
const portfolioRecords = ref<any[]>([]);
const loadingPortfolio = ref(false);

let debounceTimer: any = null;

function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      searchResults.value = [];
      showDropdown.value = false;
      return;
    }
    try {
      const res = await axios.get("/api/data-management/beneficiaries/search", {
        params: { q: searchQuery.value.trim(), limit: 15 }
      });
      searchResults.value = res.data?.data || [];
      showDropdown.value = searchResults.value.length > 0;
    } catch (error) {
      console.error("Search failed:", error);
    }
  }, 200);
}

async function selectBeneficiary(ben: any) {
  selectedBeneficiary.value = ben;
  showDropdown.value = false;
  searchQuery.value = ben.name;
  await fetchBeneficiaryPortfolio(ben.id);
}

async function fetchBeneficiaryPortfolio(id: number) {
  loadingPortfolio.value = true;
  try {
    const res = await axios.get(`/api/data-management/reports/beneficiary/${id}`);
    selectedBeneficiary.value = res.data?.data?.beneficiary || selectedBeneficiary.value;
    portfolioStats.value = res.data?.data?.stats || {};
    portfolioRecords.value = res.data?.data?.records?.data || [];
  } catch (error: any) {
    toast.danger(error.response?.data?.message || "Failed to load beneficiary portfolio.");
  } finally {
    loadingPortfolio.value = false;
  }
}

function formatDate(dateStr: any): string {
  if (!dateStr) return "-";
  try {
    if (typeof dateStr === "string") {
      const match = dateStr.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
      if (match) {
        const y = Number(match[1]);
        const m = Number(match[2]) - 1;
        const d = Number(match[3]);
        const dateObj = new Date(Date.UTC(y, m, d, 12, 0, 0));
        return dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
      }
    }
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return String(dateStr);
  }
}

onMounted(async () => {
  const queryId = route.query.id;
  if (queryId) {
    await fetchBeneficiaryPortfolio(Number(queryId));
    return;
  }

  // Pre-load default beneficiaries for quick access
  try {
    const res = await axios.get("/api/data-management/beneficiaries/search", { params: { limit: 1 } });
    if (res.data?.data?.length > 0) {
      selectBeneficiary(res.data.data[0]);
    }
  } catch {}
});
</script>
