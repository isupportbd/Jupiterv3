<template>
  <div class="container-fluid pt-0 pb-3 px-0">
    <Pagebar title="Dashboard" />

    <!-- ── 1. ROLE-BASED DASHBOARD VIEWS ── -->
    <SuperAdminDashboard
      v-if="isSuperAdmin"
      :data="superData"
      :loading="loading"
      @refresh="loadDashboardData"
    />

    <AdminDashboard
      v-else-if="isAdmin"
      :data="adminData"
      :loading="loading"
      @open-upload="handleOpenUpload"
      @refresh="loadDashboardData"
    />

    <StaffDashboard
      v-else
      :data="staffData"
      :loading="loading"
      @refresh="loadDashboardData"
    />

    <!-- Ingestion Modal (shared/accessible by Admin) -->
    <DataIngestionModal
      ref="ingestionModalRef"
      @ingested="loadDashboardData"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, reactive, ref } from "vue";
import axios from "axios";
import Pagebar from "@/components/Pagebar.vue";
import { useAuth } from "@/composables/useAuth";
import SuperAdminDashboard from "./components/SuperAdminDashboard.vue";
import AdminDashboard from "./components/AdminDashboard.vue";
import StaffDashboard from "./components/StaffDashboard.vue";
import DataIngestionModal from "./components/DataIngestionModal.vue";

const { user } = useAuth();
const loading = ref(false);
const ingestionModalRef = ref<InstanceType<typeof DataIngestionModal> | null>(null);

function handleOpenUpload(file?: File) {
  if (file instanceof File) {
    ingestionModalRef.value?.loadFile(file);
  }
}

// Role resolution
const roleNormalized = computed(() => {
  return String(user.value?.role?.name || "").toLowerCase().replace(/_/g, "");
});
const isSuperAdmin = computed(() => roleNormalized.value === "superadmin");
const isAdmin = computed(() => roleNormalized.value === "admin");

const roleTitle = computed(() => {
  if (isSuperAdmin.value) return "Platform SuperAdmin";
  if (isAdmin.value) return "Office Administrator";
  return "Staff Member";
});

const roleBadgeClass = computed(() => {
  if (isSuperAdmin.value) return "bg-danger-subtle text-danger border border-danger-subtle";
  if (isAdmin.value) return "bg-primary-subtle text-primary border border-primary-subtle";
  return "bg-secondary-subtle text-secondary border border-secondary-subtle";
});

// SuperAdmin Data
const superData = reactive({
  totalOffices: 0,
  activeOffices: 0,
  pendingOffices: 0,
  pendingPayments: 0,
  storageSize: "",
  officesList: [] as any[]
});

// Admin Data
const adminData = reactive({
  totalRecords: 0,
  totalBanks: 0,
  totalBeneficiaries: 0,
  totalExporters: 0,
  totalNatures: 0,
  totalLcValue: 0,
  maxLcValue: 0,
  minLcValue: 0,
  avgLcValue: 0,
  staffCount: 0,
  storageSize: "",
  daysRemaining: 30,
  monthlySummaries: [] as any[],
  topExportersByAmount: [] as any[],
  topExportersByCount: [] as any[],
  lcNatureDistribution: [] as any[]
});

// Staff Data
const staffData = reactive({
  totalRecords: 0,
  totalBanks: 0,
  totalBeneficiaries: 0,
  totalExporters: 0,
  totalNatures: 0,
  totalLcValue: 0,
  maxLcValue: 0,
  minLcValue: 0,
  avgLcValue: 0,
  storageSize: "",
  topExportersByAmount: [] as any[],
  topExportersByCount: [] as any[],
  lcNatureDistribution: [] as any[]
});

async function loadDashboardData() {
  loading.value = true;
  try {
    if (isSuperAdmin.value) {
      try {
        const [officesRes, paymentsRes, storageRes] = await Promise.all([
          axios.get("/api/auth/admin/users?status=all"),
          axios.get("/api/settings/payments").catch(() => ({ data: { data: [] } })),
          axios.get("/api/system/storage-size").catch(() => ({ data: { data: { totalSize: "" } } }))
        ]);

        const offices = officesRes.data?.data || [];
        superData.officesList = offices;
        superData.totalOffices = offices.length;
        superData.activeOffices = offices.filter((o: any) => o.status === "active").length;
        superData.pendingOffices = offices.filter((o: any) => o.status === "pending").length;

        const payments = paymentsRes.data?.data || [];
        superData.pendingPayments = payments.filter((p: any) => p.status === "pending").length;
        const ss = storageRes.data?.data || {};
        const sf = ss.totalSize || ss.prettySize || ss.dbSize || "";
        superData.storageSize = sf === "0 MB" ? "" : sf;
      } catch (e) {
        console.error("Failed to load SuperAdmin metrics:", e);
      }
    } else {
      try {
        const [analyticsRes, monthRes, walletRes, staffRes, storageRes] = await Promise.all([
          axios.get("/api/data-management/dashboard/analytics").catch(() => ({ data: { data: null } })),
          axios.get("/api/data-management/reports/monthwise").catch(() => ({ data: { data: [] } })),
          isAdmin.value ? axios.get("/api/settings/wallet").catch(() => ({ data: { data: {} } })) : Promise.resolve({ data: {} }),
          isAdmin.value ? axios.get("/api/auth/staff").catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: {} }),
          axios.get("/api/system/storage-size").catch(() => ({ data: { data: { totalSize: "" } } }))
        ]);

        const analytics = analyticsRes.data?.data;
        const kpi = analytics?.kpi || {};
        const list = monthRes.data?.data || [];
        const s = storageRes.data?.data || {};
        const storageFootprint = s.totalSize || s.prettySize || s.dbSize || "";

        const totRec = Number(kpi.totalRecords ?? list.reduce((acc: number, r: any) => acc + Number(r.total_records || r.totalRecords || 0), 0));
        const totBen = Number(kpi.totalBeneficiaries ?? list.reduce((acc: number, r: any) => Math.max(acc, Number(r.total_ben_unq || r.totalBenUnq || 0)), 0));
        const totBanks = Number(kpi.totalBanks ?? list.reduce((acc: number, r: any) => Math.max(acc, Number(r.total_bank_unq || r.totalBankUnq || 0)), 0));
        const totExp = Number(kpi.totalExporters || 0);
        const totLcVal = Number(kpi.totalLcValue ?? list.reduce((acc: number, r: any) => acc + Number(r.total_value || r.totalValue || 0), 0));
        const totNatures = Number(kpi.totalNatures || analytics?.lcNatureDistribution?.length || 9);
        const maxVal = Number(kpi.maxLcValue || 0);
        const minVal = Number(kpi.minLcValue || 0);
        const avgVal = Number(kpi.avgLcValue || 0);

        if (isAdmin.value) {
          adminData.totalRecords = totRec;
          adminData.totalBanks = totBanks;
          adminData.totalBeneficiaries = totBen;
          adminData.totalExporters = totExp;
          adminData.totalNatures = totNatures;
          adminData.totalLcValue = totLcVal;
          adminData.maxLcValue = maxVal;
          adminData.minLcValue = minVal;
          adminData.avgLcValue = avgVal;
          adminData.storageSize = storageFootprint === "0 MB" ? "" : storageFootprint;
          adminData.monthlySummaries = list;
          adminData.daysRemaining = Number(walletRes.data?.data?.daysRemaining ?? 30);
          adminData.staffCount = Array.isArray(staffRes.data?.data) ? staffRes.data.data.length : 0;
          adminData.topExportersByAmount = analytics?.topExportersByAmount || [];
          adminData.topExportersByCount = analytics?.topExportersByCount || [];
          adminData.lcNatureDistribution = analytics?.lcNatureDistribution || [];
        } else {
          staffData.totalRecords = totRec;
          staffData.totalBanks = totBanks;
          staffData.totalBeneficiaries = totBen;
          staffData.totalExporters = totExp;
          staffData.totalNatures = totNatures;
          staffData.totalLcValue = totLcVal;
          staffData.maxLcValue = maxVal;
          staffData.minLcValue = minVal;
          staffData.avgLcValue = avgVal;
          staffData.storageSize = storageFootprint === "0 MB" ? "" : storageFootprint;
          staffData.topExportersByAmount = analytics?.topExportersByAmount || [];
          staffData.topExportersByCount = analytics?.topExportersByCount || [];
          staffData.lcNatureDistribution = analytics?.lcNatureDistribution || [];
        }
      } catch (e) {
        console.error("Failed to load LC analytics:", e);
      }
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadDashboardData();
});
</script>

<style scoped>
.welcome-card {
  background: var(--app-surface, #ffffff);
}

.welcome-avatar-box {
  width: 54px;
  height: 54px;
  background: var(--app-hover, #f1f5f9);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
