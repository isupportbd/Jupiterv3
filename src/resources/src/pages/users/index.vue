<template>
  <div class="container-fluid py-4 px-0">
    <!-- Framework Native Toast Notification -->
    <Toast ref="toastRef" />

    <!-- ======================================================== -->
    <!-- 1. SUPERADMIN VIEW: OFFICE APPROVALS & PLATFORM ACCOUNTS -->
    <!-- ======================================================== -->
    <template v-if="isSuperAdmin">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="fw-bold mb-1">
            <i class="bi bi-building-check text-primary me-2"></i>
            Office Approvals & Management
          </h4>
          <p class="text-muted small mb-0">Approve registered office accounts, manage statuses, and extend subscriptions.</p>
        </div>
        <div>
          <button class="btn btn-outline-primary btn-sm" @click="fetchOffices" :disabled="loading">
            <i class="bi bi-arrow-clockwise me-1" :class="{ 'spin': loading }"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Offices Table -->
      <div class="card border">
        <div class="card-header border-bottom py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h6 class="fw-bold mb-0 text-nowrap">
            <i class="bi bi-building me-1 text-primary"></i> Registered Offices
          </h6>

          <!-- Search & Filter Controls on Right Side (Always on same horizontal row) -->
          <div class="d-flex align-items-center gap-2 ms-auto flex-nowrap">
            <!-- Framework Native Input Field -->
            <Input
              v-model="officeSearchQuery"
              type="search"
              placeholder="Search office, email..."
              topclass="mb-0"
              style="width: 220px;"
            />

            <!-- Status Filter Tabs -->
            <ul class="nav nav-pills flex-nowrap gap-1 mb-0">
              <li class="nav-item">
                <button
                  class="nav-link py-1 px-2.5"
                  :class="{ active: currentStatus === 'all' }"
                  @click="changeStatus('all')">
                  All Offices ({{ totalCount }})
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
                  :class="{ active: currentStatus === 'active' }"
                  @click="changeStatus('active')">
                  <i class="bi bi-check-circle text-success me-1"></i> Active
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
                  <th class="ps-3">Office / Admin</th>
                  <th>Phone Number</th>
                  <th class="text-center">Status</th>
                  <th>Subscription Expiry</th>
                  <th>Registered At</th>
                  <th class="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="6" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <div class="text-muted small mt-2">Loading office records...</div>
                  </td>
                </tr>
                <tr v-else-if="filteredOffices.length === 0">
                  <td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                    {{ officeSearchQuery ? `No offices matching "${officeSearchQuery}".` : 'No office records found.' }}
                  </td>
                </tr>
                <tr v-for="office in filteredOffices" :key="office.id">
                  <td class="ps-3">
                    <div class="fw-bold">{{ office.name }}</div>
                    <div class="text-muted small">{{ office.email }}</div>
                  </td>
                  <td>{{ office.phone || 'N/A' }}</td>
                  <!-- Status Column: Toggle Switch Only -->
                  <td class="text-center">
                    <div class="form-check form-switch d-inline-block m-0">
                      <input
                        class="form-check-input shadow-none"
                        style="cursor: pointer;"
                        type="checkbox"
                        role="switch"
                        :checked="office.status === 'active'"
                        :disabled="togglingOfficeId === office.id"
                        :title="office.status === 'active' ? 'Active (Click to deactivate)' : 'Inactive (Click to activate)'"
                        @change="handleToggleStatus(office)" />
                    </div>
                  </td>
                  <td>
                    <div v-if="office.subscriptionExpiresAt">
                      <div class="fw-semibold">{{ formatDate(office.subscriptionExpiresAt) }}</div>
                      <small v-if="isExpired(office.subscriptionExpiresAt)" class="text-danger fw-semibold">
                        <i class="bi bi-exclamation-circle me-1"></i>Expired
                      </small>
                    </div>
                    <span v-else class="text-muted small">Not Assigned</span>
                  </td>
                  <td>{{ formatDate(office.createdAt) }}</td>
                  <td class="text-end pe-3">
                    <div class="btn-group btn-group-sm">
                      <!-- Pending: Approve or Reject registration -->
                      <template v-if="office.status === 'pending'">
                        <button
                          class="btn btn-success"
                          title="Approve Office"
                          @click="handleApprove(office.id)">
                          <i class="bi bi-check-lg me-1"></i> Approve
                        </button>
                        <button
                          class="btn btn-outline-danger"
                          title="Reject Registration"
                          @click="handleReject(office.id)">
                          <i class="bi bi-x-lg me-1"></i> Reject
                        </button>
                      </template>

                      <!-- Active / Inactive: Extend Subscription -->
                      <template v-else>
                        <button
                          class="btn btn-outline-primary"
                          title="Extend Subscription"
                          @click="openExtendModal(office)">
                          <i class="bi bi-calendar-plus me-1"></i> +30 Days
                        </button>
                      </template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ======================================================== -->
    <!-- 2. OFFICE ADMIN VIEW: STAFF DELEGATION & MANAGEMENT      -->
    <!-- ======================================================== -->
    <template v-else-if="isAdmin">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="fw-bold mb-1">
            <i class="bi bi-people-fill me-2"></i>
            Office Staff Management & Delegation
          </h4>
          <p class="text-muted small mb-0">
            Create and manage read-only staff accounts for your office.
          </p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" @click="fetchStaff" :disabled="loadingStaff">
            <i class="bi bi-arrow-clockwise me-1" :class="{ 'spin': loadingStaff }"></i> Refresh
          </button>
          <button
            class="btn btn-primary btn-sm"
            @click="openAddStaffModal">
            <i class="bi bi-person-plus-fill me-1"></i> Add Staff Account
          </button>
        </div>
      </div>

      <!-- Staff Members Table -->
      <div class="card border">
        <div class="card-header border-bottom py-2 px-3 d-flex align-items-center justify-content-between gap-2">
          <h6 class="fw-bold mb-0 text-nowrap">
            <i class="bi bi-people me-1"></i> Office Staff Accounts
          </h6>
          <div class="d-flex align-items-center gap-2">
            <Input
              v-model="staffSearchQuery"
              type="search"
              placeholder="Search staff members..."
              topclass="mb-0"
              style="width: 220px;"
            />
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="ps-3">Staff Name & Email</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th class="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingStaff">
                  <td colspan="5" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <div class="text-muted small mt-2">Loading staff accounts...</div>
                  </td>
                </tr>
                <tr v-else-if="filteredStaffList.length === 0">
                  <td colspan="5" class="text-center py-5 text-muted">
                    <i class="bi bi-person-x fs-2 d-block mb-2"></i>
                    {{ staffSearchQuery ? `No staff matching "${staffSearchQuery}".` : 'No staff accounts created yet. Click "Add Staff Account" to delegate access.' }}
                  </td>
                </tr>
                <tr v-for="staff in filteredStaffList" :key="staff.id">
                  <td class="ps-3">
                    <div class="fw-bold">{{ staff.name }}</div>
                    <div class="text-muted small">{{ staff.email }}</div>
                  </td>
                  <td>{{ staff.phone || 'N/A' }}</td>
                  <td>
                    <span class="badge" :class="staff.status === 'active' ? 'bg-success' : 'bg-danger'">
                      {{ staff.status === 'active' ? 'Active' : 'Suspended' }}
                    </span>
                  </td>
                  <td>{{ formatDate(staff.createdAt) }}</td>
                  <td class="text-end pe-3">
                    <div class="btn-group btn-group-sm">
                      <button
                        class="btn btn-outline-secondary"
                        title="Reset Password"
                        @click="openResetPasswordModal(staff)">
                        <i class="bi bi-key me-1"></i> Reset Password
                      </button>
                      <button
                        class="btn"
                        :class="staff.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'"
                        :title="staff.status === 'active' ? 'Suspend Account' : 'Activate Account'"
                        @click="handleToggleStaffStatus(staff)">
                        <i :class="staff.status === 'active' ? 'bi bi-pause-circle' : 'bi bi-play-circle'"></i>
                        {{ staff.status === 'active' ? 'Suspend' : 'Activate' }}
                      </button>
                      <button
                        class="btn btn-warning text-dark fw-semibold"
                        title="Transfer Office Admin Ownership"
                        @click="openTransferModal(staff)">
                        <i class="bi bi-arrow-left-right me-1"></i> Transfer Admin
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Fallback / Read-only View for Staff Users -->
    <template v-else>
      <div class="card border text-center py-5">
        <div class="card-body">
          <div class="spinner-border spinner-border-sm text-secondary mb-2" role="status"></div>
          <p class="text-muted small mb-0">Redirecting to Dashboard...</p>
        </div>
      </div>
    </template>

    <!-- Modal: Add Staff Account -->
    <div v-if="showAddStaffModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.6);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border shadow">
          <div class="modal-header border-bottom">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-person-plus me-2"></i> Add Office Staff Account
            </h5>
            <button type="button" class="btn-close shadow-none" aria-label="Close" @click="showAddStaffModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleCreateStaff">
              <Input
                v-model="newStaff.name"
                label="Full Name"
                :must="true"
                placeholder="e.g. John Doe"
                required />
              <Input
                v-model="newStaff.email"
                label="Email Address"
                type="email"
                :must="true"
                placeholder="e.g. staff@company.com"
                required />
              <Input
                v-model="newStaff.phone"
                label="Phone Number"
                category="mobile"
                placeholder="e.g. 01711000000" />
              <InputPasswordToggle
                v-model="newStaff.password"
                label="Initial Password"
                :must="true"
                placeholder="Min 6 characters"
                required />
              <div class="d-flex justify-content-end gap-2 mt-4">
                <Button label="Cancel" class="btn btn-outline-secondary" @click="showAddStaffModal = false" />
                <Button type="submit" label="Create Account" icon="bi bi-person-plus" class="btn btn-primary" :loading="creatingStaff" />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Reset Staff Password -->
    <div v-if="showResetModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.6);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border shadow">
          <div class="modal-header border-bottom">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-key text-warning me-2"></i> Reset Staff Password
            </h5>
            <button type="button" class="btn-close shadow-none" aria-label="Close" @click="showResetModal = false"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small">
              Setting a new password for staff member: <strong class="text-body">{{ selectedStaff?.name }}</strong> ({{ selectedStaff?.email }}).
            </p>
            <div class="mb-3">
              <InputPasswordToggle
                v-model="resetPasswordVal"
                label="New Password"
                :must="true"
                placeholder="Enter new password (min 6 chars)"
                required />
            </div>
            <div class="d-flex justify-content-end gap-2 mt-4">
              <Button label="Cancel" class="btn btn-outline-secondary" @click="showResetModal = false" />
              <Button label="Save New Password" icon="bi bi-key" class="btn btn-warning fw-semibold" :loading="resettingPassword" @click="handleResetPassword" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Transfer Admin Ownership -->
    <div v-if="showTransferModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.6);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border shadow">
          <div class="modal-header border-bottom">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i> Single Admin Transfer Confirmation
            </h5>
            <button type="button" class="btn-close shadow-none" aria-label="Close" @click="showTransferModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning border border-warning-subtle small mb-3">
              <div class="d-flex align-items-start gap-2">
                <i class="bi bi-exclamation-triangle-fill fs-5 text-warning flex-shrink-0 mt-0.5"></i>
                <div>
                  <div class="fw-bold mb-1">Warning: Irreversible Admin Ownership Transfer</div>
                  <div>You are about to transfer Primary Office Administration to <strong>{{ selectedStaff?.name }}</strong>.</div>
                  <ul class="mb-0 mt-2 ps-3">
                    <li><strong>{{ selectedStaff?.name }}</strong> will become the <strong>Primary Office Admin</strong>.</li>
                    <li>Your account will be demoted to a <strong>Staff User</strong>.</li>
                    <li>Only the new admin will have access to billing and data operations.</li>
                  </ul>
                </div>
              </div>
            </div>
            <p class="text-body small mb-0">Are you sure you want to proceed with this transfer?</p>
            <div class="d-flex justify-content-end gap-2 mt-4">
              <Button label="Cancel" class="btn btn-outline-secondary" @click="showTransferModal = false" />
              <Button
                label="Confirm & Transfer Ownership"
                icon="bi bi-arrow-left-right"
                class="btn btn-danger fw-semibold"
                :loading="transferringAdmin"
                @click="handleTransferAdmin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import Input from "@/components/Input.vue";
import InputPasswordToggle from "@/components/InputPasswordToggle.vue";
import Button from "@/components/Button.vue";
import Toast from "@/components/Toast.vue";

const router = useRouter();
const authStore = useAuthStore();
const toastRef = ref<any>(null);

const roleNormalized = computed(() => {
  return String(authStore.user?.role?.name || "").toLowerCase().replace(/_/g, "");
});
const isSuperAdmin = computed(() => roleNormalized.value === "superadmin");
const isAdmin = computed(() => roleNormalized.value === "admin");

function showAlert(msg: string, isError = false) {
  toastRef.value?.toastme(msg, isError ? "danger" : "success");
}

// ==========================================
// SUPERADMIN: OFFICE APPROVALS
// ==========================================
const loading = ref(false);
const offices = ref<any[]>([]);
const totalCount = ref(0);
const currentStatus = ref("all");
const officeSearchQuery = ref("");

const filteredOffices = computed(() => {
  const q = officeSearchQuery.value.trim().toLowerCase();
  if (!q) return offices.value;
  return offices.value.filter((o: any) => {
    return (
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q)) ||
      (o.phone && o.phone.toLowerCase().includes(q))
    );
  });
});

async function fetchOffices() {
  loading.value = true;
  try {
    const searchParam = officeSearchQuery.value ? `&search=${encodeURIComponent(officeSearchQuery.value.trim())}` : "";
    const res = await fetch(`/api/auth/admin/users?status=${currentStatus.value}${searchParam}`);
    const data = await res.json();
    if (res.ok) {
      offices.value = data.data || [];
      totalCount.value = data.meta?.total || offices.value.length;
    } else {
      showAlert(data.message || "Failed to load office accounts.", true);
    }
  } catch (err: any) {
    showAlert("Network error while fetching offices.", true);
  } finally {
    loading.value = false;
  }
}

function changeStatus(status: string) {
  currentStatus.value = status;
  fetchOffices();
}

const togglingOfficeId = ref<number | null>(null);

async function handleToggleStatus(office: any) {
  const nextStatus = office.status === "active" ? "inactive" : "active";
  togglingOfficeId.value = office.id;
  try {
    const res = await fetch(`/api/auth/admin/users/${office.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await res.json();
    if (res.ok) {
      office.status = nextStatus;
      showAlert(data.message || `Office status changed to ${nextStatus}.`);
    } else {
      showAlert(data.message || "Failed to update office status.", true);
      fetchOffices();
    }
  } catch {
    showAlert("Network error updating status.", true);
    fetchOffices();
  } finally {
    togglingOfficeId.value = null;
  }
}

async function handleApprove(id: number) {
  try {
    const res = await fetch(`/api/auth/admin/users/${id}/approve`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Office account approved successfully.");
      fetchOffices();
    } else {
      showAlert(data.message || "Approval failed.", true);
    }
  } catch (err) {
    showAlert("Network error during approval.", true);
  }
}

async function handleReject(id: number) {
  if (!confirm("Are you sure you want to reject/suspend this office?")) return;
  try {
    const res = await fetch(`/api/auth/admin/users/${id}/reject`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Office account rejected successfully.");
      fetchOffices();
    } else {
      showAlert(data.message || "Action failed.", true);
    }
  } catch (err) {
    showAlert("Network error.", true);
  }
}

async function openExtendModal(office: any) {
  const days = prompt(`Enter number of days to extend subscription for ${office.name}:`, "30");
  if (!days) return;
  try {
    const res = await fetch(`/api/auth/admin/users/${office.id}/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: Number(days) })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Subscription extended successfully.");
      fetchOffices();
    } else {
      showAlert(data.message || "Failed to extend subscription.", true);
    }
  } catch (err) {
    showAlert("Network error.", true);
  }
}

// ==========================================
// OFFICE ADMIN: STAFF DELEGATION
// ==========================================
const loadingStaff = ref(false);
const staffList = ref<any[]>([]);
const staffSearchQuery = ref("");

const filteredStaffList = computed(() => {
  const q = staffSearchQuery.value.trim().toLowerCase();
  if (!q) return staffList.value;
  return staffList.value.filter((s: any) => {
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q))
    );
  });
});

const showAddStaffModal = ref(false);
const creatingStaff = ref(false);
const newStaff = ref({ name: "", email: "", phone: "", password: "" });

const showResetModal = ref(false);
const resettingPassword = ref(false);
const resetPasswordVal = ref("");
const selectedStaff = ref<any>(null);

const showTransferModal = ref(false);
const transferringAdmin = ref(false);

async function fetchStaff() {
  loadingStaff.value = true;
  try {
    const res = await fetch("/api/auth/staff");
    const data = await res.json();
    if (res.ok) {
      staffList.value = data.data || [];
    } else {
      showAlert(data.message || "Failed to load staff accounts.", true);
    }
  } catch (err) {
    showAlert("Network error while fetching staff.", true);
  } finally {
    loadingStaff.value = false;
  }
}

function openAddStaffModal() {
  newStaff.value = { name: "", email: "", phone: "", password: "" };
  showAddStaffModal.value = true;
}

async function handleCreateStaff() {
  creatingStaff.value = true;
  try {
    const res = await fetch("/api/auth/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStaff.value)
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Staff account created successfully.");
      showAddStaffModal.value = false;
      fetchStaff();
    } else {
      showAlert(data.message || "Failed to create staff account.", true);
    }
  } catch (err) {
    showAlert("Network error while creating staff.", true);
  } finally {
    creatingStaff.value = false;
  }
}

function openResetPasswordModal(staff: any) {
  selectedStaff.value = staff;
  resetPasswordVal.value = "";
  showResetModal.value = true;
}

async function handleResetPassword() {
  if (!resetPasswordVal.value || resetPasswordVal.value.length < 6) {
    showAlert("Password must be at least 6 characters.", true);
    return;
  }
  resettingPassword.value = true;
  try {
    const res = await fetch(`/api/auth/staff/${selectedStaff.value.id}/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPasswordVal.value })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Staff password reset successfully.");
      showResetModal.value = false;
    } else {
      showAlert(data.message || "Failed to reset password.", true);
    }
  } catch (err) {
    showAlert("Network error.", true);
  } finally {
    resettingPassword.value = false;
  }
}

async function handleToggleStaffStatus(staff: any) {
  const targetStatus = staff.status === "active" ? "rejected" : "active";
  try {
    const res = await fetch(`/api/auth/staff/${staff.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Staff status updated successfully.");
      fetchStaff();
    } else {
      showAlert(data.message || "Failed to update staff status.", true);
    }
  } catch (err) {
    showAlert("Network error.", true);
  }
}

function openTransferModal(staff: any) {
  selectedStaff.value = staff;
  showTransferModal.value = true;
}

async function handleTransferAdmin() {
  if (!selectedStaff.value) return;
  transferringAdmin.value = true;
  try {
    const res = await fetch(`/api/auth/staff/${selectedStaff.value.id}/transfer-admin`, {
      method: "POST"
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Admin transferred successfully.");
      showTransferModal.value = false;
      // Refresh current session so user role reflects new staff role
      await authStore.fetchUser();
      // Redirect directly to dashboard as this account is now a staff member
      router.replace("/");
    } else {
      showAlert(data.message || "Failed to transfer administration.", true);
    }
  } catch (err) {
    showAlert("Network error during admin transfer.", true);
  } finally {
    transferringAdmin.value = false;
  }
}

// Helpers
function statusBadgeClass(status: string) {
  switch (status) {
    case "active": return "bg-success";
    case "pending": return "bg-warning text-dark";
    case "rejected": return "bg-danger";
    default: return "bg-secondary";
  }
}

function isExpired(dateStr: string) {
  return new Date(dateStr) < new Date();
}

function formatDate(dateStr: string) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

watch(
  () => [authStore.initialized, isSuperAdmin.value, isAdmin.value],
  ([init, superAdmin, admin]) => {
    if (init && !superAdmin && !admin) {
      router.replace("/");
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (isSuperAdmin.value) {
    fetchOffices();
  } else if (isAdmin.value) {
    fetchStaff();
  } else if (authStore.initialized) {
    router.replace("/");
  }
});
</script>

<style scoped>
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
