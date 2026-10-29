<template>
  <div class="container-fluid py-4 px-0">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold mb-1">
          <i class="bi bi-database-down text-primary me-2"></i>
          Live Database Backup & Storage Monitoring
        </h4>
        <p class="text-muted small mb-0">Monitor live PostgreSQL relation storage, generate full SQL dumps, and restore database from backup.</p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-primary btn-sm" @click="fetchStorageStats" :disabled="loading || restoring">
          <i class="bi bi-arrow-clockwise me-1" :class="{ 'spin': loading }"></i> Refresh
        </button>
        <a href="/api/system/backup/download" class="btn btn-primary btn-sm" download>
          <i class="bi bi-download me-1"></i> Download Backup (.sql)
        </a>
        <button class="btn btn-outline-danger btn-sm" @click="triggerFileInput" :disabled="restoring">
          <i class="bi bi-upload me-1"></i> Restore Backup (.sql)
        </button>
        <input ref="fileInputRef" type="file" accept=".sql" class="d-none" @change="onFileSelected" />
      </div>
    </div>

    <!-- Storage Metrics Cards -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card border">
          <div class="card-body p-3 d-flex align-items-center">
            <div class="rounded-circle bg-primary-subtle text-primary p-3 me-3">
              <i class="bi bi-hdd-stack fs-4"></i>
            </div>
            <div>
              <span class="text-muted small fw-bold">Total Database Size</span>
              <h4 class="fw-bold mb-0">{{ stats.totalSize || '0 MB' }}</h4>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border">
          <div class="card-body p-3 d-flex align-items-center">
            <div class="rounded-circle bg-success-subtle text-success p-3 me-3">
              <i class="bi bi-table fs-4"></i>
            </div>
            <div>
              <span class="text-muted small fw-bold">User Tables</span>
              <h4 class="fw-bold mb-0">{{ tables.length }} Tables</h4>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border">
          <div class="card-body p-3 d-flex align-items-center">
            <div class="rounded-circle bg-info-subtle text-info p-3 me-3">
              <i class="bi bi-cpu fs-4"></i>
            </div>
            <div>
              <span class="text-muted small fw-bold">Database Engine</span>
              <h5 class="fw-bold mb-0">PostgreSQL 16</h5>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Storage Breakdown -->
    <div class="card border">
      <div class="card-header border-bottom py-3">
        <h6 class="fw-bold mb-0">
          <i class="bi bi-bar-chart me-1 text-primary"></i> Table Storage Breakdown
        </h6>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Table Name</th>
                <th>Estimated Rows</th>
                <th>Storage Size</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="3" class="text-center py-5">
                  <div class="spinner-border text-primary" role="status"></div>
                  <div class="text-muted small mt-2">Loading storage metrics...</div>
                </td>
              </tr>
              <tr v-else-if="tables.length === 0">
                <td colspan="3" class="text-center py-4 text-muted">No tables found.</td>
              </tr>
              <tr v-for="t in tables" :key="t.table_name">
                <td class="ps-3 font-monospace fw-bold">
                  <i class="bi bi-database text-muted me-2"></i>{{ t.table_name }}
                </td>
                <td>{{ Number(t.row_count || 0).toLocaleString() }} rows</td>
                <td class="fw-bold text-primary">{{ t.total_size }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Restore Confirmation Modal -->
    <div v-if="showRestoreModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.6); z-index: 1055;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border shadow-lg">
          <div class="modal-header border-bottom py-3">
            <h5 class="modal-title fw-bold text-danger d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill"></i> Confirm Database Restore
            </h5>
            <button type="button" class="btn-close" @click="cancelRestore" :disabled="restoring"></button>
          </div>
          <div class="modal-body p-4">
            <div class="alert alert-danger d-flex align-items-start gap-2 mb-3">
              <i class="bi bi-shield-exclamation fs-4 flex-shrink-0"></i>
              <div>
                <strong>সতর্কতা:</strong> ব্যাকাপ রিস্টোর করলে বর্তমান ডাটাবেসের টেবিল ও ডেটা ব্যাকাপ ফাইলের তথ্য দ্বারা প্রতিস্থাপিত হবে।
                প্রক্রিয়াটি সম্পন্ন হতে কিছু সময় লাগতে পারে।
              </div>
            </div>

            <div class="card bg-light border p-3 mb-3" v-if="selectedFile">
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted small">নির্বাচিত ফাইল:</span>
                <span class="fw-bold font-monospace small">{{ selectedFile.name }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span class="text-muted small">ফাইলের আকার:</span>
                <span class="fw-bold small">{{ formatFileSize(selectedFile.size) }}</span>
              </div>
            </div>

            <div v-if="restoring" class="text-center py-3">
              <div class="spinner-border text-danger mb-2" role="status"></div>
              <div class="fw-bold text-danger">রিস্টোর হচ্ছে, দয়া করে অপেক্ষা করুন...</div>
              <div class="text-muted small">সার্ভার ব্যাকাপ ফাইলটি প্রসেস করছে, পেজ রিলোড করবেন না।</div>
            </div>
          </div>
          <div v-if="!restoring" class="modal-footer border-top py-2">
            <button type="button" class="btn btn-secondary btn-sm" @click="cancelRestore">বাতিল</button>
            <button type="button" class="btn btn-danger btn-sm px-3" @click="executeRestore">
              <i class="bi bi-arrow-repeat me-1"></i> নিশ্চিত করুন ও রিস্টোর করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { onMounted, reactive, ref } from "vue";
import { toast } from "@/composables/useToast";

const loading = ref(false);
const restoring = ref(false);
const showRestoreModal = ref(false);
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const tables = ref<any[]>([]);
const stats = reactive({
  totalSize: "0 MB",
  tablesCount: 0
});

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
    fileInputRef.value.click();
  }
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (!file.name.toLowerCase().endsWith(".sql")) {
      toast.danger("দয়া করে একটি বৈধ .sql ব্যাকাপ ফাইল নির্বাচন করুন।");
      return;
    }
    selectedFile.value = file;
    showRestoreModal.value = true;
  }
}

function cancelRestore() {
  if (restoring.value) return;
  showRestoreModal.value = false;
  selectedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

async function executeRestore() {
  if (!selectedFile.value) return;

  restoring.value = true;
  const formData = new FormData();
  formData.append("file", selectedFile.value);

  try {
    const res = await axios.post("/api/system/backup/restore", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    toast.success(res.data?.message || "ডাটাবেস সফলভাবে রিস্টোর করা হয়েছে!");
    showRestoreModal.value = false;
    selectedFile.value = null;
    await fetchStorageStats();
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || "ডাটাবেস রিস্টোর করতে ব্যর্থ হয়েছে।";
    toast.danger(errorMsg);
  } finally {
    restoring.value = false;
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  }
}

async function fetchStorageStats() {
  loading.value = true;
  try {
    const res = await axios.get("/api/system/storage-size");
    if (res.data?.data) {
      tables.value = res.data.data.tables || [];
      stats.totalSize = res.data.data.totalSize || res.data.data.totalDatabaseSize || "0 MB";
      stats.tablesCount = tables.value.length;
    }
  } catch (error) {
    toast.danger("Failed to load database storage metrics.");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchStorageStats();
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
