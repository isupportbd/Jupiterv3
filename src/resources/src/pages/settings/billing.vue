<template>
  <div class="container-fluid py-4 px-0">
    <!-- Framework Native Toast Notification -->
    <Toast ref="toastRef" />

    <!-- OFFICE ADMIN VIEW: Monthly Billing Deductions & Statements -->
    <template v-if="!isSuperAdmin">
      <!-- Page Header -->
      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h4 class="fw-bold mb-1">
            <i class="bi bi-receipt me-2"></i> Billing & Invoices
          </h4>
          <p class="text-muted small mb-0">
            Statement of monthly subscription deductions, billed amounts, and payment invoices.
          </p>
        </div>
        <div>
          <Button
            label="Refresh"
            icon="bi bi-arrow-clockwise"
            class="btn btn-outline-secondary btn-sm"
            :loading="loadingInvoices"
            @click="loadInvoices(1)"
          />
        </div>
      </div>

      <!-- Summary Stat Cards -->
      <div class="row g-3 mb-4">
        <!-- Current Wallet Balance -->
        <div class="col-md-4">
          <div class="card border h-100">
            <div class="card-body p-3.5">
              <div class="text-muted small mb-1">Available Wallet Balance</div>
              <div class="fs-4 fw-bold">
                BDT {{ Number(invoicesSummary.walletBalance || 0).toLocaleString() }}
              </div>
              <div class="text-muted small mt-2">
                <i class="bi bi-wallet2 me-1"></i> Funds ready for future renewals
              </div>
            </div>
          </div>
        </div>

        <!-- Subscription Validity -->
        <div class="col-md-4">
          <div class="card border h-100">
            <div class="card-body p-3.5">
              <div class="text-muted small mb-1">Subscription Validity</div>
              <div class="fs-4 fw-bold" :class="isExpired ? 'text-danger' : 'text-success'">
                {{ invoicesSummary.subscriptionExpiresAt ? formatDateOnly(invoicesSummary.subscriptionExpiresAt) : 'Expired' }}
              </div>
              <div class="small mt-2" :class="isExpired ? 'text-danger' : 'text-muted'">
                <i :class="isExpired ? 'bi bi-exclamation-triangle me-1' : 'bi bi-check-circle me-1'"></i>
                {{ isExpired ? 'Subscription currently expired' : 'Office access active' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Total Billed / Deducted -->
        <div class="col-md-4">
          <div class="card border h-100">
            <div class="card-body p-3.5">
              <div class="text-muted small mb-1">Total Subscription Deductions</div>
              <div class="fs-4 fw-bold">
                BDT {{ Number(totalDeductionsAmount).toLocaleString() }}
              </div>
              <div class="text-muted small mt-2">
                <i class="bi bi-receipt-cutoff me-1"></i> {{ invoicesMeta.total }} bill deductions recorded
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoices / Deductions Table Card -->
      <div class="card border">
        <div class="card-header border-bottom py-2.5 py-md-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h6 class="fw-bold mb-0 text-nowrap">
            <i class="bi bi-clock-history me-1"></i> Monthly Bill Deduction History
          </h6>
          <div class="ms-auto" style="width: 240px;">
            <Input
              v-model="invoiceSearch"
              type="search"
              placeholder="Search Invoice, Ref..."
              topclass="mb-0"
              @input="onSearchInput"
            />
          </div>
        </div>

        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="ps-3">Invoice / Ref ID</th>
                  <th>Billing Purpose</th>
                  <th>Billed Amount</th>
                  <th>Deducted From</th>
                  <th>Balance After</th>
                  <th>Deduction Date</th>
                  <th class="text-end pe-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingInvoices">
                  <td colspan="7" class="text-center py-5">
                    <div class="spinner-border text-secondary" role="status"></div>
                    <div class="text-muted small mt-2">Loading billing records...</div>
                  </td>
                </tr>
                <tr v-else-if="invoices.length === 0">
                  <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-receipt fs-2 d-block mb-2"></i>
                    {{ invoiceSearch ? `No invoices matching "${invoiceSearch}".` : 'No billing deduction records found.' }}
                  </td>
                </tr>
                <tr v-for="inv in invoices" :key="inv.id">
                  <td class="ps-3">
                    <span class="font-monospace fw-bold">{{ inv.referenceId || `INV-${inv.id}` }}</span>
                  </td>
                  <td>
                    <span class="fw-medium">{{ inv.description }}</span>
                  </td>
                  <td class="fw-bold">
                    BDT {{ Number(inv.amount).toLocaleString() }}
                  </td>
                  <td>
                    <span class="badge border bg-body-secondary text-body fw-normal">
                      <i class="bi bi-wallet2 me-1"></i> Wallet Balance
                    </span>
                  </td>
                  <td class="text-muted font-monospace small">
                    BDT {{ Number(inv.balanceAfter).toLocaleString() }}
                  </td>
                  <td class="text-muted small">
                    {{ formatDate(inv.createdAt) }}
                  </td>
                  <td class="text-end pe-3">
                    <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                      <i class="bi bi-check-circle me-1"></i> Deducted
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination Footer -->
        <div v-if="invoicesMeta.lastPage > 1" class="card-footer border-top d-flex justify-content-between align-items-center py-3">
          <span class="text-muted small">
            Showing page {{ invoicesMeta.currentPage }} of {{ invoicesMeta.lastPage }} ({{ invoicesMeta.total }} records)
          </span>
          <div class="btn-group btn-group-sm">
            <button
              class="btn btn-outline-secondary"
              :disabled="invoicesMeta.currentPage <= 1"
              @click="loadInvoices(invoicesMeta.currentPage - 1)"
            >
              Previous
            </button>
            <button
              class="btn btn-outline-secondary"
              :disabled="invoicesMeta.currentPage >= invoicesMeta.lastPage"
              @click="loadInvoices(invoicesMeta.currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- SUPERADMIN VIEW: Pricing Plans Management & All Office Invoices -->
    <template v-else>
      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h4 class="fw-bold mb-1">
            <i class="bi bi-sliders me-2"></i> Billing Settings & Plans
          </h4>
          <p class="text-muted small mb-0">Configure monthly fees, payment instructions, and view office deduction statements.</p>
        </div>
        <div class="d-flex gap-2">
          <Button
            label="Refresh"
            icon="bi bi-arrow-clockwise"
            class="btn btn-outline-secondary btn-sm"
            :loading="loadingPlans"
            @click="loadPlans"
          />
        </div>
      </div>

      <!-- Add New Plan Form -->
      <div class="card border mb-4">
        <div class="card-header py-3 border-bottom">
          <h6 class="fw-bold mb-0">
            <i class="bi bi-plus-circle me-2"></i> Add New Plan
          </h6>
        </div>
        <div class="card-body p-3 p-md-4">
          <form @submit.prevent="handleAddPlan">
            <div class="row g-3 align-items-end">
              <div class="col-12 col-sm-6 col-lg">
                <Input
                  id="monthlyFee"
                  v-model="newPlan.monthlyFee"
                  type="number"
                  label="Monthly Fee (BDT)"
                  topclass="mb-0"
                  placeholder="3000"
                  :must="true"
                  required />
              </div>
              <div class="col-12 col-sm-6 col-lg">
                <div class="mb-0">
                  <label class="d-flex align-items-center mb-1">
                    <span class="text-capitalize">Payment Method</span>
                    <span class="text-danger ms-1">*</span>
                  </label>
                  <select v-model="newPlan.paymentMethod" class="form-select" required>
                    <option value="bKash Merchant">bKash Merchant</option>
                    <option value="bKash Personal">bKash Personal</option>
                    <option value="Nagad Merchant">Nagad Merchant</option>
                    <option value="Nagad Personal">Nagad Personal</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-lg">
                <Input
                  id="accountNo"
                  v-model="newPlan.accountNo"
                  type="text"
                  label="Account No / Instructions"
                  topclass="mb-0"
                  placeholder="01811223344"
                  :must="true"
                  required />
              </div>
              <div class="col-12 col-sm-6 col-lg">
                <Input
                  id="activationDate"
                  v-model="newPlan.activationDate"
                  type="date"
                  label="Activation Date"
                  topclass="mb-0"
                  :must="true"
                  required />
              </div>
              <div class="col-12 col-lg-auto d-flex gap-2">
                <Button
                  type="button"
                  label="Reset"
                  icon="bi bi-arrow-counterclockwise"
                  class="btn btn-outline-secondary px-3"
                  @click="resetForm" />
                <Button
                  type="submit"
                  label="Save Plan"
                  icon="bi bi-check-lg"
                  class="btn-minimal px-4"
                  :loading="savingPlan" />
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Plans Table -->
      <div class="card border">
        <div class="card-header py-3 border-bottom">
          <h6 class="fw-bold mb-0">
            <i class="bi bi-list-check me-2"></i> Subscription Plans
          </h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="ps-3">Plan ID</th>
                  <th>Monthly Fee</th>
                  <th>Payment Method</th>
                  <th>Account No</th>
                  <th>Activation Date</th>
                  <th class="text-center pe-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingPlans">
                  <td colspan="6" class="text-center py-5">
                    <div class="spinner-border text-secondary" role="status"></div>
                  </td>
                </tr>
                <tr v-else-if="plans.length === 0">
                  <td colspan="6" class="text-center py-5 text-muted">No plans configured.</td>
                </tr>
                <tr v-for="plan in plans" :key="plan.id">
                  <td class="ps-3 font-monospace">#{{ plan.id }}</td>
                  <td class="fw-bold">BDT {{ Number(plan.monthlyFee).toLocaleString() }}</td>
                  <td>{{ plan.paymentMethod }}</td>
                  <td class="font-monospace">{{ plan.accountNo }}</td>
                  <td class="text-muted small">{{ formatDateOnly(plan.activationDate) }}</td>
                  <td class="text-center pe-3">
                    <span v-if="plan.status === 'active'" class="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1">
                      Active
                    </span>
                    <span v-else class="badge bg-secondary-subtle text-secondary border px-2.5 py-1">
                      Inactive
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import Button from "@/components/Button.vue";
import Input from "@/components/Input.vue";
import Toast from "@/components/Toast.vue";

const auth = useAuthStore();
const toastRef = ref<any>(null);

const roleNormalized = computed(() => {
  const r: any = auth.user?.role;
  const name = typeof r === "object" && r !== null ? (r.name || r.slug || "") : (typeof r === "string" ? r : "");
  return String(name || "").toLowerCase().replace(/_/g, "");
});
const isSuperAdmin = computed(() => roleNormalized.value === "superadmin");

// --- Office Admin Invoice State ---
const invoices = ref<any[]>([]);
const invoicesSummary = reactive({
  walletBalance: 0,
  subscriptionExpiresAt: null as string | null
});
const invoicesMeta = ref({
  currentPage: 1,
  lastPage: 1,
  total: 0,
  perPage: 10
});
const loadingInvoices = ref(false);
const invoiceSearch = ref("");

const isExpired = computed(() => {
  if (!invoicesSummary.subscriptionExpiresAt) return true;
  return new Date(invoicesSummary.subscriptionExpiresAt) < new Date();
});

const totalDeductionsAmount = computed(() => {
  return invoices.value.reduce((sum, item) => sum + Number(item.amount || 0), 0);
});

async function loadInvoices(page = 1) {
  loadingInvoices.value = true;
  try {
    const res = await axios.get("/api/settings/invoices", {
      params: {
        page,
        search: invoiceSearch.value ? invoiceSearch.value.trim() : undefined
      }
    });
    invoices.value = res.data?.data || [];
    if (res.data?.summary) {
      invoicesSummary.walletBalance = res.data.summary.walletBalance || 0;
      invoicesSummary.subscriptionExpiresAt = res.data.summary.subscriptionExpiresAt;
    }
    invoicesMeta.value = res.data?.meta || { currentPage: 1, lastPage: 1, total: 0, perPage: 10 };
  } catch (error: any) {
    showAlert("Failed to load invoices.", "alert-danger");
  } finally {
    loadingInvoices.value = false;
  }
}

let searchTimer: any = null;
function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadInvoices(1);
  }, 300);
}

// --- SuperAdmin Plans State ---
const plans = ref<any[]>([]);
const loadingPlans = ref(false);
const savingPlan = ref(false);

const todayStr = new Date().toISOString().split("T")[0];
const newPlan = reactive({
  monthlyFee: "3000",
  paymentMethod: "Nagad Merchant",
  accountNo: "",
  activationDate: todayStr
});

function resetForm() {
  newPlan.monthlyFee = "3000";
  newPlan.paymentMethod = "Nagad Merchant";
  newPlan.accountNo = "";
  newPlan.activationDate = todayStr;
}

async function loadPlans() {
  loadingPlans.value = true;
  try {
    const res = await axios.get("/api/settings/billing");
    if (res.data?.data?.plans && Array.isArray(res.data.data.plans)) {
      plans.value = res.data.data.plans;
    }
  } catch (error: any) {
    showAlert("Failed to load plans.", "alert-danger");
  } finally {
    loadingPlans.value = false;
  }
}

async function handleAddPlan() {
  if (!newPlan.monthlyFee || !newPlan.accountNo || !newPlan.activationDate) {
    showAlert("Please fill in all fields before adding.", "alert-warning");
    return;
  }

  savingPlan.value = true;
  try {
    const res = await axios.post("/api/settings/billing", {
      monthlyFee: newPlan.monthlyFee,
      paymentMethod: newPlan.paymentMethod,
      accountNo: newPlan.accountNo.trim(),
      activationDate: newPlan.activationDate,
      status: "active"
    });
    plans.value = res.data?.data?.plans || [];
    newPlan.accountNo = "";
    showAlert(res.data?.message || "Billing plan saved successfully.", "alert-success");
  } catch (error: any) {
    showAlert(error.response?.data?.message || "Failed to save plan.", "alert-danger");
  } finally {
    savingPlan.value = false;
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatDateOnly(dateStr: string | null) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function showAlert(message: string, className = "success") {
  const bg = className.includes("danger") ? "danger" : (className.includes("warning") ? "warning" : "success");
  toastRef.value?.toastme(message, bg);
}

watch(
  isSuperAdmin,
  (val) => {
    if (val) {
      loadPlans();
    } else {
      loadInvoices(1);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.btn-minimal {
  background-color: var(--app-text, #e5e5e5);
  color: var(--app-surface, #121212);
  border: 1px solid var(--app-border, #3f3f3f);
  font-weight: 600;
  padding: 0.45rem 1.4rem;
  border-radius: 0.375rem;
  transition: opacity 0.15s ease;
}

.btn-minimal:hover {
  opacity: 0.88;
  color: var(--app-surface, #121212);
}
</style>
