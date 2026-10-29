<template>
  <div>
    <!-- KPI Metric Cards Row -->
    <div class="row g-3 mb-4">
      <!-- 1. Total Registered Offices -->
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="card border shadow-sm h-100 kpi-card">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="text-muted small fw-semibold text-uppercase">Total Offices</span>
                <h3 class="fw-bold mb-0 mt-2 text-body">{{ data.totalOffices }}</h3>
                <small class="text-success mt-1 d-block">
                  <i class="bi bi-check-circle me-1"></i>{{ data.activeOffices }} Active
                </small>
              </div>
              <div class="kpi-icon-box bg-primary-subtle text-primary rounded-3 p-3">
                <i class="bi bi-building fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Pending Office Approvals -->
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="card border shadow-sm h-100 kpi-card">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="text-muted small fw-semibold text-uppercase">Pending Approvals</span>
                <h3 class="fw-bold mb-0 mt-2 text-warning">{{ data.pendingOffices }}</h3>
                <router-link to="/users" class="small text-decoration-none text-primary mt-1 d-inline-block">
                  Review Requests &rarr;
                </router-link>
              </div>
              <div class="kpi-icon-box bg-warning-subtle text-warning rounded-3 p-3">
                <i class="bi bi-clock-history fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Payment Approvals -->
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="card border shadow-sm h-100 kpi-card">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="text-muted small fw-semibold text-uppercase">Payment Trx</span>
                <h3 class="fw-bold mb-0 mt-2 text-info">{{ data.pendingPayments }}</h3>
                <router-link to="/settings/payments" class="small text-decoration-none text-info mt-1 d-inline-block">
                  Review Payments &rarr;
                </router-link>
              </div>
              <div class="kpi-icon-box bg-info-subtle text-info rounded-3 p-3">
                <i class="bi bi-credit-card fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Database Footprint -->
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="card border shadow-sm h-100 kpi-card">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="text-muted small fw-semibold text-uppercase">Database Storage</span>
                <h3 class="fw-bold mb-0 mt-2 text-success">{{ data.storageSize || 'Healthy' }}</h3>
                <router-link to="/system/backup" class="small text-decoration-none text-success mt-1 d-inline-block">
                  Backup Manager &rarr;
                </router-link>
              </div>
              <div class="kpi-icon-box bg-success-subtle text-success rounded-3 p-3">
                <i class="bi bi-database fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Grid -->
    <div class="row g-3 mb-4">
      <div class="col-12 col-md-6 col-lg-3">
        <router-link to="/users" class="card border text-decoration-none shadow-sm h-100 action-tile p-3">
          <div class="d-flex align-items-center gap-3">
            <div class="action-icon rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center">
              <i class="bi bi-people-fill fs-5"></i>
            </div>
            <div>
              <h6 class="fw-bold mb-0 text-body">Office Approvals</h6>
              <small class="text-muted">Approve new company accounts</small>
            </div>
          </div>
        </router-link>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <router-link to="/settings/payments" class="card border text-decoration-none shadow-sm h-100 action-tile p-3">
          <div class="d-flex align-items-center gap-3">
            <div class="action-icon rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center">
              <i class="bi bi-wallet2 fs-5"></i>
            </div>
            <div>
              <h6 class="fw-bold mb-0 text-body">Payment Verification</h6>
              <small class="text-muted">Verify TrxID & extend dates</small>
            </div>
          </div>
        </router-link>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <router-link to="/settings/billing" class="card border text-decoration-none shadow-sm h-100 action-tile p-3">
          <div class="d-flex align-items-center gap-3">
            <div class="action-icon rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center">
              <i class="bi bi-sliders fs-5"></i>
            </div>
            <div>
              <h6 class="fw-bold mb-0 text-body">Billing Settings</h6>
              <small class="text-muted">Update platform fee & instructions</small>
            </div>
          </div>
        </router-link>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <router-link to="/system/backup" class="card border text-decoration-none shadow-sm h-100 action-tile p-3">
          <div class="d-flex align-items-center gap-3">
            <div class="action-icon rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center">
              <i class="bi bi-database-down fs-5"></i>
            </div>
            <div>
              <h6 class="fw-bold mb-0 text-body">Database Backup</h6>
              <small class="text-muted">Download complete SQL dumps</small>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Recent Offices Overview Table -->
    <div class="card border shadow-sm mb-4">
      <div class="card-header border-bottom py-3 d-flex justify-content-between align-items-center">
        <h6 class="fw-bold mb-0">
          <i class="bi bi-building me-2 text-primary"></i> Registered Offices Overview
        </h6>
        <router-link to="/users" class="btn btn-outline-primary btn-sm">
          View All Offices
        </router-link>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Office / Admin Name</th>
                <th>Email</th>
                <th>Subscription Status</th>
                <th>Expires At</th>
                <th class="text-end pe-3">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading && data.officesList.length === 0">
                <td colspan="5" class="text-center py-4 text-muted">
                  <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                  Loading offices...
                </td>
              </tr>
              <tr v-else-if="data.officesList.length === 0">
                <td colspan="5" class="text-center py-4 text-muted">No offices registered yet.</td>
              </tr>
              <tr v-for="office in data.officesList.slice(0, 5)" :key="office.id">
                <td class="ps-3 fw-semibold text-body">
                  <i class="bi bi-building me-1 text-secondary"></i> {{ office.name }}
                </td>
                <td class="text-muted small">{{ office.email }}</td>
                <td>
                  <span class="badge" :class="office.status === 'active' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'">
                    {{ office.status }}
                  </span>
                </td>
                <td class="text-muted small">
                  {{ office.subscriptionExpiresAt ? new Date(office.subscriptionExpiresAt).toLocaleDateString() : 'N/A' }}
                </td>
                <td class="text-end pe-3">
                  <router-link to="/users" class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size: 0.8rem;">
                    Manage
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  data: {
    totalOffices: number;
    activeOffices: number;
    pendingOffices: number;
    pendingPayments: number;
    storageSize: string;
    officesList: any[];
  };
  loading?: boolean;
}>();
</script>

<style scoped>
.kpi-card {
  background: var(--app-surface, #ffffff);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08) !important;
}

.kpi-icon-box {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-tile {
  background: var(--app-surface, #ffffff);
  transition: transform 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
}

.action-tile:hover {
  transform: translateY(-2px);
  border-color: var(--bs-primary) !important;
}

.action-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
}
</style>
