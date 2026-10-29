<template>
  <div class="container position-absolute start-50 top-50 translate-middle">
    <div class="auth col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4 mx-auto">
      <div class="d-block mb-3 text-center">
        <AppLogo :size="42" text-class="fs-3 fw-bold" />
      </div>

        <!-- ── STEP 1: CREDENTIALS ── -->
        <div v-if="step === 'credentials'">
          <p v-if="errorMessage" class="text-center alert alert-danger text-danger py-2 mt-2 fs-7">
            {{ errorMessage }}
          </p>
          <form @submit.prevent="onSubmit">
            <div class="mb-2">
              <Input
                topclass="mb-0"
                id="email"
                v-model="form.data.email"
                type="email"
                label="email"
                placeholder="Enter your email..."
                :err="form.errors.email"
                focus
                must />
            </div>
            <div class="mb-2">
              <input-password-toggle
                id="password"
                v-model="form.data.password"
                label="password"
                placeholder="Enter your password..."
                :err="form.errors.password"
                must />
            </div>
            <div class="mb-3 d-flex align-items-center justify-content-between">
              <Checkbox id="remember-me" v-model="form.data.remember" label="Remember me" />
              <router-link to="/forget-password" class="text-decoration-none mb-1">Forget
                Password?</router-link>
            </div>
            <Button
              type="submit"
              class="btn btn-primary w-100"
              label="Login"
              icon="bi bi-box-arrow-in-right"
              :disabled="processing" />
            <div class="text-center mt-3">
              <span class="text-muted">Don't have an account?</span>
              <router-link to="/register" class="ms-1 text-decoration-none">Register</router-link>
            </div>
          </form>
        </div>

        <!-- ── STEP 2: OTP VERIFICATION ── -->
        <div v-else-if="step === 'otp'">
          <div class="text-center mb-3">
            <div class="d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle mb-2" style="width: 48px; height: 48px;">
              <i class="bi bi-shield-lock fs-4"></i>
            </div>
            <h5 class="fw-bold mb-1">Two-Factor Verification</h5>
            <p class="text-muted fs-7 mb-0">
              We sent a 6-digit code to<br />
              <strong class="text-dark">{{ maskedEmail }}</strong>
            </p>
          </div>

          <p v-if="otpError" class="text-center alert alert-danger text-danger py-2 fs-7">
            {{ otpError }}
          </p>

          <form @submit.prevent="onVerifyOtp">
            <div class="mb-4">
              <label class="form-label small text-muted text-uppercase fw-semibold mb-2 d-block text-center">
                Enter Verification Code
              </label>
              <input
                id="otp-input"
                v-model="otpCode"
                type="text"
                maxlength="6"
                inputmode="numeric"
                pattern="[0-9]*"
                autocomplete="one-time-code"
                placeholder="000000"
                class="form-control text-center fw-bold fs-3 tracking-widest py-2"
                style="letter-spacing: 10px; font-family: monospace;"
                autofocus
                required
                :disabled="otpProcessing" />
            </div>

            <Button
              type="submit"
              class="btn btn-primary w-100 py-2"
              label="Verify & Sign In"
              icon="bi bi-check2-circle"
              :disabled="otpProcessing || otpCode.length < 4" />

            <div class="d-flex align-items-center justify-content-between mt-3 pt-2 border-top">
              <button
                type="button"
                class="btn btn-link btn-sm text-decoration-none p-0 text-muted"
                @click="backToCredentials">
                <i class="bi bi-arrow-left me-1"></i> Back to Login
              </button>

              <button
                type="button"
                class="btn btn-link btn-sm text-decoration-none p-0"
                :disabled="resendCountdown > 0 || resendProcessing"
                @click="onResendOtp">
                <span v-if="resendCountdown > 0">Resend in {{ resendCountdown }}s</span>
                <span v-else><i class="bi bi-arrow-clockwise me-1"></i> Resend Code</span>
              </button>
            </div>
          </form>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import Checkbox from "@/components/Checkbox.vue";
import Input from "@/components/Input.vue";
import InputPasswordToggle from "@/components/InputPasswordToggle.vue";
import Button from "@/components/Button.vue";
import AppLogo from "@/components/AppLogo.vue";
import { useHead } from "@vueuse/head";
import { useGumForm } from "@/plugins/gum";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/composables/useToast";

useHead({ title: "Login" });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const step = ref<"credentials" | "otp">("credentials");
const errorMessage = ref("");
const otpError = ref("");
const otpCode = ref("");
const otpEmail = ref("");
const otpProcessing = ref(false);
const resendProcessing = ref(false);
const resendCountdown = ref(0);
let countdownTimer: any = null;

const maskedEmail = computed(() => {
  const email = otpEmail.value || "";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name}***@${domain}`;
  return `${name.substring(0, 2)}***${name.substring(name.length - 1)}@${domain}`;
});

const startCountdown = (seconds = 60) => {
  resendCountdown.value = seconds;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (resendCountdown.value > 0) {
      resendCountdown.value -= 1;
    } else {
      clearInterval(countdownTimer);
    }
  }, 1000);
};

onMounted(() => {
  if (route.query.error) {
    errorMessage.value = String(route.query.error);
    toast.danger(errorMessage.value);
  }
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

const form = useGumForm({
  email: "",
  password: "",
  remember: false
});

const processing = form.processing;

const onSubmit = async () => {
  errorMessage.value = "";
  await form.post(
    "/api/auth/login",
    {
      email: String(form.data.email || "").trim(),
      password: form.data.password,
      remember: !!form.data.remember
    },
    {
      onSuccess: async (response: any) => {
        // If OTP is required dynamically via .env (LOGIN_OTP_ENABLED=true)
        if (response?.data?.require_otp) {
          step.value = "otp";
          otpEmail.value = response.data.email || form.data.email;
          otpCode.value = "";
          otpError.value = "";
          startCountdown();
          toast.info("Verification code sent to your email.");
          return;
        }

        // Direct login when LOGIN_OTP_ENABLED=false
        auth.initialized = false;
        await auth.bootstrap();
        form.reset("password");
        toast.success("Welcome back! Login successful.");
        await router.push("/");
      },
      onError: (_errors, error) => {
        errorMessage.value = error instanceof Error ? error.message : "Unable to login right now";
        toast.danger(errorMessage.value);
        form.reset("password");
      }
    }
  );
};

const onVerifyOtp = async () => {
  otpError.value = "";
  otpProcessing.value = true;
  try {
    const res = await axios.post("/api/auth/verify-login-otp", {
      email: otpEmail.value,
      otp: otpCode.value.trim(),
      remember: !!form.data.remember
    });

    if (res.data?.data) {
      auth.initialized = false;
      await auth.bootstrap();
      toast.success("Verification successful! Welcome back.");
      await router.push("/");
    }
  } catch (error: any) {
    otpError.value = error.response?.data?.message || "Invalid or expired verification code";
    toast.danger(otpError.value);
  } finally {
    otpProcessing.value = false;
  }
};

const onResendOtp = async () => {
  if (resendCountdown.value > 0 || resendProcessing.value) return;
  resendProcessing.value = true;
  try {
    await axios.post("/api/auth/resend-login-otp", {
      email: otpEmail.value
    });
    toast.success("A new verification code has been sent to your email.");
    startCountdown(60);
  } catch (error: any) {
    toast.danger(error.response?.data?.message || "Failed to resend code");
  } finally {
    resendProcessing.value = false;
  }
};

const backToCredentials = () => {
  step.value = "credentials";
  otpError.value = "";
  otpCode.value = "";
};
</script>

<style lang="scss" scoped>
.fs-7 {
  font-size: 0.85rem;
}
.tracking-widest {
  letter-spacing: 0.35em;
}
</style>

