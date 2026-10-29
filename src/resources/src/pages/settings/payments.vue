<template>
  <div class="container-fluid py-4 px-0">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold mb-1">
          <i class="bi bi-wallet2 me-2"></i>
          {{ isSuperAdmin ? 'Payment & TrxID Approvals' : 'My Wallet & Recharge' }}
        </h4>
        <p class="text-muted small mb-0">
          {{ isSuperAdmin 
            ? 'Review and verify office payment transaction IDs (TrxID) and extend validity.' 
            : 'Manage your wallet balance, recharge funds, and view recharge history.' }}
        </p>
      </div>
      <div>
        <Button
          label="Refresh"
          icon="bi bi-arrow-clockwise"
          class="btn btn-outline-secondary btn-sm"
          :loading="loading"
          @click="fetchPayments(1)"
        />
      </div>
    </div>

    <!-- Framework Native Toast Notification -->
    <Toast ref="toastRef" />

    <!-- Subscription Expired Notice -->
    <div v-if="$route.query.expired === '1'" class="alert alert-warning border d-flex align-items-center mb-4" role="alert">
      <i class="bi bi-exclamation-triangle-fill fs-4 me-3 text-warning"></i>
      <div>
        <div class="fw-bold">Your office subscription has expired</div>
        <div class="small">Please send your monthly fee and submit the Transaction ID (TrxID) below to renew your office access.</div>
      </div>
    </div>

    <!-- OFFICE ADMIN VIEW: 2 CARDS (My Wallet & Recharge Your Wallet) -->
    <div v-if="!isSuperAdmin" class="row g-4 mb-4">
      <!-- Card 1: My Wallet -->
      <div class="col-12 col-lg-5">
        <MyWallet
          ref="myWalletRef"
          :instructions="billing.paymentInstructions"
          @renewed="fetchPayments(1)"
          @success="showAlert($event, 'alert-success')"
          @error="showAlert($event, 'alert-danger')"
        />
      </div>

      <!-- Card 2: Recharge Your Wallet -->
      <div class="col-12 col-lg-7">
        <div class="card border h-100">
          <div class="card-header border-bottom py-2.5 px-3 d-flex align-items-center justify-content-between">
            <h6 class="fw-bold mb-0">
              <i class="bi bi-wallet2 me-2"></i> Recharge Your Wallet
            </h6>
            <span class="badge border bg-body-secondary text-body fw-normal">TrxID Verification</span>
          </div>
          <div class="card-body p-4">
            <form @submit.prevent="submitPaymentForm">
              <div class="row g-3">
                <div class="col-md-6">
                  <Input
                    v-model="paymentForm.amount"
                    type="number"
                    label="Amount to Recharge (BDT)"
                    :must="true"
                    placeholder="3000"
                    required />
                </div>
                <div class="col-md-6">
                  <label class="d-flex align-items-center mb-1">
                    <span class="text-capitalize">Payment Method</span>
                    <span class="text-danger ms-1">*</span>
                  </label>
                  <select v-model="paymentForm.paymentMethod" class="form-select" required>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
                <div class="col-12">
                  <Input
                    v-model="paymentForm.trxId"
                    label="Transaction ID (TrxID)"
                    :must="true"
                    placeholder="e.g. BL7A89XQ"
                    class="font-monospace text-uppercase"
                    required />
                </div>
                <div class="col-12">
                  <Input
                    v-model="paymentForm.notes"
                    label="Notes / Sender Phone (Optional)"
                    placeholder="e.g. Sent from 01700000000..." />
                </div>
                <div class="col-12 text-end pt-2">
                  <Button
                    type="submit"
                    label="Recharge Wallet"
                    icon="bi bi-check2-circle"
                    class="btn-minimal"
                    :loading="submitting" />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Payments List Table -->
    <div class="card border">
      <div class="card-header border-bottom py-2.5 py-md-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h6 class="fw-bold mb-0 text-nowrap">
          <i class="bi bi-clock-history me-1"></i> 
          {{ isSuperAdmin ? 'Platform Payment Submissions' : 'Wallet Recharge History' }}
        </h6>

        <!-- Search & Filter Controls on Right Side (Side by side on same row) -->
        <div class="d-flex align-items-center gap-2 ms-auto flex-nowrap">
          <!-- Framework Native Input Field -->
          <Input
            v-model="searchQuery"
            type="search"
            placeholder="Search TrxID, Office..."
            topclass="mb-0"
            style="width: 220px;"
          />

          <!-- Filter Tabs for SuperAdmin -->
          <ul v-if="isSuperAdmin" class="nav nav-pills flex-nowrap gap-1">
            <li class="nav-item">
              <button
                class="nav-link py-1 px-2.5"
                :class="{ active: currentStatus === 'all' }"
                @click="changeStatus('all')">
                All Payments
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link py-1 px-2.5"
                :class="{ active: currentStatus === 'pending' }"
                @click="changeStatus('pending')">
                <i class="bi bi-clock-history text-warning me-1"></i> Pending
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link py-1 px-2.5"
                :class="{ active: currentStatus === 'approved' }"
                @click="changeStatus('approved')">
                <i class="bi bi-check-circle text-success me-1"></i> Approved
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link py-1 px-2.5"
                :class="{ active: currentStatus === 'rejected' }"
                @click="changeStatus('rejected')">
                <i class="bi bi-x-circle text-danger me-1"></i> Rejected
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">TrxID</th>
                <th v-if="isSuperAdmin">Office / Sender</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>Expiry Date</th>
                <th v-if="isSuperAdmin" class="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="8" class="text-center py-5">
                  <div class="spinner-border text-secondary" role="status"></div>
                  <div class="text-muted small mt-2">Loading payment records...</div>
                </td>
              </tr>
              <tr v-else-if="filteredPayments.length === 0">
                <td colspan="8" class="text-center py-5 text-muted">
                  <i class="bi bi-wallet fs-2 d-block mb-2"></i>
                  {{ searchQuery ? `No payments matching "${searchQuery}".` : 'No payment records found.' }}
                </td>
              </tr>
              <tr v-for="item in filteredPayments" :key="item.id">
                <td class="ps-3">
                  <span class="font-monospace fw-bold">{{ item.trxId }}</span>
                  <div v-if="item.notes" class="text-muted small">{{ item.notes }}</div>
                </td>
                <td v-if="isSuperAdmin">
                  <div class="fw-bold">{{ item.adminName || 'Unknown' }}</div>
                  <div class="text-muted small">{{ item.adminEmail }}</div>
                </td>
                <td>
                  <span class="badge border bg-body-secondary text-body">{{ item.paymentMethod }}</span>
                </td>
                <td class="fw-bold">
                  BDT {{ Number(item.amount).toLocaleString() }}
                </td>
                <td>
                  <span v-if="item.status === 'approved'" class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                    <i class="bi bi-check-circle me-1"></i> Approved
                  </span>
                  <span v-else-if="item.status === 'pending'" class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                    <i class="bi bi-clock-history me-1"></i> Pending
                  </span>
                  <span v-else class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                    <i class="bi bi-x-circle me-1"></i> Rejected
                  </span>
                </td>
                <td class="text-muted small">
                  {{ formatDate(item.submittedAt) }}
                </td>
                <td class="small">
                  <span
                    v-if="item.subscriptionExpiresAt"
                    class="fw-semibold"
                    :class="new Date(item.subscriptionExpiresAt) < new Date() ? 'text-danger' : 'text-success'"
                  >
                    {{ formatDateOnly(item.subscriptionExpiresAt) }}
                  </span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td v-if="isSuperAdmin" class="text-end pe-3">
                  <div v-if="item.status === 'pending'" class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success" title="Approve (+30 days validity)" @click="handleApprove(item)">
                      <i class="bi bi-check-lg me-1"></i> Approve
                    </button>
                    <button class="btn btn-outline-danger" title="Reject payment" @click="handleReject(item)">
                      <i class="bi bi-x-lg me-1"></i> Reject
                    </button>
                  </div>
                  <span v-else class="text-muted small">Settled</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div v-if="meta.lastPage > 1" class="card-footer border-top d-flex justify-content-between align-items-center py-3">
        <span class="text-muted small">Showing page {{ meta.currentPage }} of {{ meta.lastPage }} ({{ meta.total }} records)</span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" :disabled="meta.currentPage <= 1" @click="fetchPayments(meta.currentPage - 1)">
            Previous
          </button>
          <button class="btn btn-outline-secondary" :disabled="meta.currentPage >= meta.lastPage" @click="fetchPayments(meta.currentPage + 1)">
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { pulse } from "@/plugins/pulse";
import Input from "@/components/Input.vue";
import Button from "@/components/Button.vue";
import Toast from "@/components/Toast.vue";
import MyWallet from "@/components/MyWallet.vue";

const auth = useAuthStore();
const toastRef = ref<any>(null);
const myWalletRef = ref<any>(null);
const isSuperAdmin = computed(() => {
  const role = String(auth.user?.role?.name || "").toLowerCase().replace(/_/g, "");
  return role === "superadmin";
});

const payments = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);
const currentStatus = ref("all");
const searchQuery = ref("");

const filteredPayments = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return payments.value;
  return payments.value.filter((item: any) => {
    return (
      (item.trxId && item.trxId.toLowerCase().includes(q)) ||
      (item.adminName && item.adminName.toLowerCase().includes(q)) ||
      (item.adminEmail && item.adminEmail.toLowerCase().includes(q)) ||
      (item.paymentMethod && item.paymentMethod.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      (item.amount && String(item.amount).includes(q))
    );
  });
});

const billing = reactive({
  monthlyFee: "2000",
  paymentInstructions: ""
});

const paymentForm = reactive({
  amount: "2000",
  trxId: "",
  paymentMethod: "bKash",
  notes: ""
});

const meta = ref({
  currentPage: 1,
  lastPage: 1,
  total: 0,
  perPage: 10
});

async function loadBillingInfo() {
  try {
    const res = await axios.get("/api/settings/billing");
    if (res.data?.data) {
      billing.monthlyFee = String(res.data.data.monthlyFee || "2000");
      billing.paymentInstructions = String(res.data.data.paymentInstructions || "");
      paymentForm.amount = billing.monthlyFee;
    }
  } catch {}
}

async function fetchPayments(page: number | unknown = 1) {
  const pageNo = typeof page === "number" ? page : 1;
  loading.value = true;
  try {
    const res = await axios.get("/api/settings/payments", {
      params: {
        page: pageNo,
        status: isSuperAdmin.value ? currentStatus.value : undefined,
        search: searchQuery.value ? searchQuery.value.trim() : undefined
      }
    });
    payments.value = res.data.data || [];
    meta.value = res.data.meta || { currentPage: 1, lastPage: 1, total: 0, perPage: 10 };
  } catch (error: any) {
    showAlert(error.response?.data?.message || "Failed to load payment records.", "alert-danger");
  } finally {
    loading.value = false;
  }
}

function changeStatus(status: string) {
  currentStatus.value = status;
  fetchPayments(1);
}

async function submitPaymentForm() {
  submitting.value = true;
  try {
    const res = await axios.post("/api/settings/payments", paymentForm);
    showAlert(res.data?.message || "Payment submitted successfully.", "alert-success");
    paymentForm.trxId = "";
    paymentForm.notes = "";
    fetchPayments(1);
    myWalletRef.value?.fetchWallet();
  } catch (error: any) {
    showAlert(error.response?.data?.message || "Payment submission failed.", "alert-danger");
  } finally {
    submitting.value = false;
  }
}

async function handleApprove(item: any) {
  if (!confirm(`Approve TrxID: ${item.trxId}? This will extend the office subscription by 30 days.`)) return;
  try {
    const res = await axios.post(`/api/settings/payments/${item.id}/approve`);
    showAlert(res.data?.message || "Payment approved successfully.", "alert-success");
    fetchPayments(meta.value.currentPage);
  } catch (error: any) {
    showAlert(error.response?.data?.message || "Approval failed.", "alert-danger");
  }
}

async function handleReject(item: any) {
  if (!confirm(`Reject TrxID: ${item.trxId}?`)) return;
  try {
    const res = await axios.post(`/api/settings/payments/${item.id}/reject`);
    showAlert(res.data?.message || "Payment rejected.", "alert-warning");
    fetchPayments(meta.value.currentPage);
  } catch (error: any) {
    showAlert(error.response?.data?.message || "Rejection failed.", "alert-danger");
  }
}

function showAlert(message: string, className = "success") {
  const bg = className.includes("danger") ? "danger" : (className.includes("warning") ? "warning" : "success");
  toastRef.value?.toastme(message, bg);
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

onMounted(() => {
  loadBillingInfo();
  fetchPayments();

  const channel = pulse.channel("payments");
  channel.listen("payment:submitted", (data: any) => {
    fetchPayments(meta.value.currentPage);
    if (isSuperAdmin.value) {
      showAlert(`New payment submitted: ${data?.trxId || ''}`, "alert-info");
    }
  });

  channel.listen("payment:approved", (data: any) => {
    fetchPayments(meta.value.currentPage);
    myWalletRef.value?.fetchWallet();
    if (!isSuperAdmin.value && data?.adminId === auth.user?.id) {
      showAlert("Your payment was approved and credited to your wallet!", "alert-success");
    }
  });

  channel.listen("payment:rejected", (data: any) => {
    fetchPayments(meta.value.currentPage);
    if (!isSuperAdmin.value && data?.adminId === auth.user?.id) {
      showAlert("Your payment submission was rejected.", "alert-danger");
    }
  });
});

onBeforeUnmount(() => {
  pulse.leave("payments");
});
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

.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
