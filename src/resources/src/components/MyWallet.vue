<template>
  <div class="card border h-100">
    <div class="card-header border-bottom py-2.5 px-3 d-flex align-items-center justify-content-between">
      <h6 class="fw-bold mb-0">
        <i class="bi bi-wallet2 me-2"></i> My Wallet
      </h6>
      <span
        v-if="wallet.isExpired"
        class="badge border bg-danger-subtle text-danger fw-normal"
      >
        Expired
      </span>
      <span
        v-else
        class="badge border bg-success-subtle text-success fw-normal"
      >
        Active
      </span>
    </div>

    <div class="card-body p-4 d-flex flex-column justify-content-between">
      <div>
        <div class="display-6 fw-bold mb-1">
          BDT {{ Number(wallet.balance || 0).toLocaleString() }}
        </div>
        <p class="text-muted small mb-3">Available Wallet Balance</p>

        <div class="p-3 rounded border border-secondary-subtle bg-body-tertiary mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="small text-muted">Monthly Fee:</span>
            <span class="small fw-bold">BDT {{ Number(wallet.monthlyFee || 3000).toLocaleString() }}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="small text-muted">Validity:</span>
            <span class="small fw-semibold" :class="wallet.isExpired ? 'text-danger' : 'text-success'">
              {{ wallet.subscriptionExpiresAt ? formatDate(wallet.subscriptionExpiresAt) : 'Expired' }}
            </span>
          </div>
          <div class="small text-muted border-top border-secondary-subtle pt-2 mt-2">
            <i class="bi bi-info-circle me-1"></i>
            Extra balance remains safe in your wallet for subsequent months.
          </div>
        </div>
        <!-- Recharge Instructions Banner -->
        <div v-if="instructions || paymentInstructions" class="p-3 rounded border border-secondary-subtle bg-body-tertiary mb-3 small">
          <div class="fw-semibold mb-1">
            <i class="bi bi-info-circle me-1"></i> Recharge Instructions:
          </div>
          <div class="text-muted" style="white-space: pre-wrap;">{{ instructions || paymentInstructions }}</div>
        </div>
      </div>

      <div class="mt-auto pt-2">
        <div v-if="wallet.isExpired && wallet.canRenew" class="mb-2">
          <Button
            label="Renew from Wallet"
            icon="bi bi-arrow-repeat"
            class="btn-minimal w-100"
            :loading="renewing"
            @click="handleRenew"
          />
        </div>
        <div v-else-if="wallet.isExpired && !wallet.canRenew" class="small text-warning mb-2">
          <i class="bi bi-exclamation-circle me-1"></i>
          Recharge at least BDT {{ Number(wallet.monthlyFee - wallet.balance).toLocaleString() }} to renew.
        </div>
        <div v-else class="small text-muted">
          <i class="bi bi-shield-check me-1"></i>
          Next renewal will auto-deduct from this balance.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { onMounted, reactive, ref, watch } from "vue";
import Button from "@/components/Button.vue";

const props = defineProps<{
  instructions?: string;
}>();

const emit = defineEmits<{
  (e: "renewed"): void;
  (e: "error", msg: string): void;
  (e: "success", msg: string): void;
}>();

const renewing = ref(false);
const paymentInstructions = ref(props.instructions || "");
watch(() => props.instructions, (val) => {
  if (val) paymentInstructions.value = val;
});
const wallet = reactive({
  balance: 0,
  monthlyFee: 3000,
  subscriptionExpiresAt: null as string | null,
  isExpired: false,
  canRenew: false
});

async function fetchWallet() {
  try {
    const res = await axios.get("/api/settings/wallet");
    if (res.data?.data) {
      wallet.balance = Number(res.data.data.balance || 0);
      wallet.monthlyFee = Number(res.data.data.monthlyFee || 3000);
      wallet.subscriptionExpiresAt = res.data.data.subscriptionExpiresAt;
      wallet.isExpired = Boolean(res.data.data.isExpired);
      wallet.canRenew = Boolean(res.data.data.canRenew);
    }

    if (!paymentInstructions.value) {
      const billingRes = await axios.get("/api/settings/billing");
      if (billingRes.data?.data?.paymentInstructions) {
        paymentInstructions.value = billingRes.data.data.paymentInstructions;
      }
    }
  } catch {}
}

async function handleRenew() {
  renewing.value = true;
  try {
    const res = await axios.post("/api/settings/wallet/renew");
    emit("success", res.data?.message || "Subscription renewed successfully!");
    emit("renewed");
    await fetchWallet();
  } catch (error: any) {
    emit("error", error.response?.data?.message || "Failed to renew from wallet.");
  } finally {
    renewing.value = false;
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

defineExpose({
  fetchWallet,
  wallet
});

onMounted(() => {
  fetchWallet();
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
</style>
