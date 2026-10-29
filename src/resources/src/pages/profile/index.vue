<template>
  <div class="container-fluid py-4 px-0">
    <!-- Framework Native Toast Notification -->
    <Toast ref="toastRef" />

    <!-- Page Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold mb-1">
          <i class="bi bi-person-badge text-primary me-2"></i>
          My Profile
        </h4>
        <p class="text-muted small mb-0">
          Manage your personal account details, contact information, and security credentials.
        </p>
      </div>
      <div>
        <Button
          label="Refresh"
          icon="bi bi-arrow-clockwise"
          class="btn-outline-primary btn-sm"
          :loading="loadingUser"
          @click="refreshProfile"
        />
      </div>
    </div>

    <div class="row g-4">
      <!-- Column 1: User Overview & Role Card -->
      <div class="col-lg-4 col-md-6">
        <div class="card border h-100">
          <div class="card-body text-center p-4 d-flex flex-column">
            <div class="avatar-wrapper mb-3">
              <div
                class="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary shadow-sm"
                style="width: 80px; height: 80px; font-size: 2.5rem;">
                <i class="bi bi-person-fill"></i>
              </div>
            </div>
            <h5 class="fw-bold mb-1">{{ authStore.user?.name || "User" }}</h5>
            <p class="text-muted small mb-2">{{ authStore.user?.email || "No email" }}</p>

            <div class="d-flex justify-content-center gap-2 mb-3">
              <span class="badge" :class="roleBadgeClass">
                <i class="bi bi-shield-check me-1"></i> {{ roleDisplayName }}
              </span>
              <span
                class="badge"
                :class="authStore.user?.status === 'active' || authStore.user?.status === 'approved' ? 'bg-success' : 'bg-warning text-dark'">
                {{ authStore.user?.status || "Active" }}
              </span>
            </div>

            <hr class="my-3 opacity-25" />

            <div class="text-start small flex-grow-1">
              <div class="d-flex justify-content-between py-1.5 border-bottom border-secondary-subtle">
                <span class="text-muted">Account ID:</span>
                <span class="fw-semibold">#{{ authStore.user?.id ?? "---" }}</span>
              </div>
              <div class="d-flex justify-content-between py-1.5 border-bottom border-secondary-subtle">
                <span class="text-muted">Phone:</span>
                <span class="fw-semibold">{{ authStore.user?.phone || "Not set" }}</span>
              </div>
              <div class="d-flex justify-content-between py-1.5 border-bottom border-secondary-subtle">
                <span class="text-muted">Registered On:</span>
                <span class="fw-semibold">{{ formatDate(authStore.user?.createdAt) }}</span>
              </div>
              <div
                v-if="authStore.user?.approvedAt"
                class="d-flex justify-content-between py-1.5 border-bottom border-secondary-subtle">
                <span class="text-muted">Approved Date:</span>
                <span class="fw-semibold">{{ formatDate(authStore.user?.approvedAt) }}</span>
              </div>
              <div
                v-if="authStore.user?.subscriptionExpiresAt"
                class="d-flex justify-content-between py-1.5">
                <span class="text-muted">Subscription Expiry:</span>
                <span class="fw-semibold text-primary">{{ formatDate(authStore.user?.subscriptionExpiresAt) }}</span>
              </div>
            </div>

            <!-- Office / Subscription Details for Admin -->
            <div v-if="isOfficeAdmin" class="mt-3 pt-3 border-top text-start">
              <div class="d-flex align-items-center justify-content-between mb-1">
                <span class="small fw-semibold text-primary">
                  <i class="bi bi-building me-1"></i> Office Subscription
                </span>
                <span class="badge bg-success-subtle text-success border border-success-subtle">
                  Active
                </span>
              </div>
              <p class="text-muted small mb-2" style="font-size: 0.8rem;">
                Full access to Vat, Tax, and Commercial features.
              </p>
              <router-link to="/settings/billing" class="btn btn-outline-primary btn-sm w-100">
                <i class="bi bi-receipt me-1"></i> Billing & Invoices
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: Personal Information Form -->
      <div class="col-lg-4 col-md-6">
        <div class="card border h-100">
          <div class="card-header border-bottom py-2.5 px-3 d-flex align-items-center justify-content-between">
            <h6 class="fw-bold mb-0">
              <i class="bi bi-person-lines-fill me-2 text-primary"></i> Personal Details
            </h6>
            <span class="text-muted small">Update profile</span>
          </div>
          <div class="card-body p-4 d-flex flex-column">
            <form @submit.prevent="handleUpdateProfile" class="d-flex flex-column flex-grow-1">
              <div class="row g-3">
                <div class="col-12">
                  <Input
                    v-model="profileForm.name"
                    label="Full Name"
                    :must="true"
                    placeholder="Enter your full name"
                    maxlength="100"
                    :err="profileErrors.name"
                  />
                </div>
                <div class="col-12">
                  <Input
                    v-model="profileForm.phone"
                    label="Phone Number"
                    placeholder="e.g. 01700000000"
                    category="mobile"
                    :err="profileErrors.phone"
                  />
                </div>
                <div class="col-12">
                  <Input
                    :model-value="userEmail"
                    label="Email Address"
                    readonly
                    placeholder="Email address"
                  />
                  <div class="form-text mt-1 text-muted small">
                    <i class="bi bi-info-circle me-1"></i> Login email cannot be changed directly.
                  </div>
                </div>
              </div>

              <div class="d-flex justify-content-end mt-auto pt-3">
                <Button
                  label="Save Profile Changes"
                  icon="bi bi-check2-circle"
                  class="btn-primary w-100"
                  :loading="savingProfile"
                  type="submit"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Column 3: Change Password Form -->
      <div class="col-lg-4 col-md-12">
        <div class="card border h-100">
          <div class="card-header border-bottom py-2.5 px-3 d-flex align-items-center justify-content-between">
            <h6 class="fw-bold mb-0">
              <i class="bi bi-shield-lock me-2 text-primary"></i> Change Password
            </h6>
            <span class="text-muted small">Security</span>
          </div>
          <div class="card-body p-4 d-flex flex-column">
            <form @submit.prevent="handleChangePassword" class="d-flex flex-column flex-grow-1">
              <div class="row g-3">
                <div class="col-12">
                  <InputPasswordToggle
                    v-model="passForm.currentPassword"
                    label="Current Password"
                    :must="true"
                    placeholder="Enter current password"
                    :err="passErrors.currentPassword"
                  />
                </div>
                <div class="col-12">
                  <InputPasswordToggle
                    v-model="passForm.newPassword"
                    label="New Password"
                    :must="true"
                    placeholder="New password (min 6 chars)"
                    :err="passErrors.newPassword"
                  />
                </div>
                <div class="col-12">
                  <InputPasswordToggle
                    v-model="passForm.confirmPassword"
                    label="Confirm New Password"
                    :must="true"
                    placeholder="Repeat new password"
                    :err="passErrors.confirmPassword"
                  />
                </div>
              </div>

              <div class="d-flex justify-content-end mt-auto pt-3">
                <Button
                  label="Update Password"
                  icon="bi bi-key"
                  class="btn-warning text-dark fw-semibold w-100"
                  :loading="savingPassword"
                  type="submit"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import Input from "@/components/Input.vue";
import InputPasswordToggle from "@/components/InputPasswordToggle.vue";
import Button from "@/components/Button.vue";
import Toast from "@/components/Toast.vue";

const authStore = useAuthStore();
const toastRef = ref<any>(null);

function showAlert(msg: string, isError = false) {
  toastRef.value?.toastme(msg, isError ? "danger" : "success");
}

const loadingUser = ref(false);
const savingProfile = ref(false);
const savingPassword = ref(false);

// Form states
const profileForm = reactive({
  name: "",
  phone: ""
});

const profileErrors = reactive({
  name: "",
  phone: ""
});

const passForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const passErrors = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

// User & Role Helpers
const userEmail = computed<string>(() => {
  return String(authStore.user?.email || "");
});

const roleNormalized = computed(() => {
  return String(authStore.user?.role?.name || "").toLowerCase().replace(/_/g, "");
});

const isOfficeAdmin = computed(() => roleNormalized.value === "admin");

const roleDisplayName = computed(() => {
  const role = roleNormalized.value;
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Office Admin";
  if (role === "staff") return "Office Staff";
  return authStore.user?.role?.name || "User";
});

const roleBadgeClass = computed(() => {
  const role = roleNormalized.value;
  if (role === "superadmin") return "bg-danger";
  if (role === "admin") return "bg-primary";
  return "bg-secondary";
});

function formatDate(val: any) {
  if (!val) return "---";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(val);
  }
}

// Sync form with authenticated user
function syncProfileForm() {
  if (authStore.user) {
    profileForm.name = String(authStore.user.name || "");
    profileForm.phone = String(authStore.user.phone || "");
  }
}

watch(
  () => authStore.user,
  () => {
    syncProfileForm();
  },
  { immediate: true }
);

async function refreshProfile() {
  loadingUser.value = true;
  try {
    await authStore.fetchUser();
    syncProfileForm();
    showAlert("Profile data refreshed.");
  } catch {
    showAlert("Failed to refresh profile data.", true);
  } finally {
    loadingUser.value = false;
  }
}

// Update Profile
async function handleUpdateProfile() {
  profileErrors.name = "";
  profileErrors.phone = "";

  if (!profileForm.name.trim()) {
    profileErrors.name = "Full Name is required.";
    return;
  }
  if (profileForm.name.trim().length < 2) {
    profileErrors.name = "Name must be at least 2 characters.";
    return;
  }

  savingProfile.value = true;
  try {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim() || null
      })
    });

    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Profile updated successfully!");
      await authStore.fetchUser();
    } else {
      showAlert(data.message || "Failed to update profile.", true);
    }
  } catch (err: any) {
    showAlert("Network error while updating profile.", true);
  } finally {
    savingProfile.value = false;
  }
}

// Change Password
async function handleChangePassword() {
  passErrors.currentPassword = "";
  passErrors.newPassword = "";
  passErrors.confirmPassword = "";

  if (!passForm.currentPassword) {
    passErrors.currentPassword = "Current password is required.";
    return;
  }
  if (!passForm.newPassword || passForm.newPassword.length < 6) {
    passErrors.newPassword = "New password must be at least 6 characters.";
    return;
  }
  if (passForm.newPassword !== passForm.confirmPassword) {
    passErrors.confirmPassword = "Passwords do not match.";
    return;
  }

  savingPassword.value = true;
  try {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
        confirmPassword: passForm.confirmPassword
      })
    });

    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Password changed successfully!");
      passForm.currentPassword = "";
      passForm.newPassword = "";
      passForm.confirmPassword = "";
    } else {
      showAlert(data.message || "Failed to change password.", true);
    }
  } catch (err: any) {
    showAlert("Network error while changing password.", true);
  } finally {
    savingPassword.value = false;
  }
}

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchUser();
  }
  syncProfileForm();
});
</script>

<style scoped>
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
