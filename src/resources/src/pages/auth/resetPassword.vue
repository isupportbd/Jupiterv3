<template>
  <div class="container position-absolute start-50 top-50 translate-middle">
    <div class="auth col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4 mx-auto py-5">
      <div class="card card-body border-0">
        <div class="d-block mb-3 text-center">
          <AppLogo :size="46" text-class="fs-3 text-primary fw-bold" />
        </div>
        <h4 class="text-center">Reset Password</h4>
        <form
          id="formAuthentication"
          :class="{ 'pe-none opacity-50': !isLinkValid }"
          @submit.prevent="onSubmit">
          <div class="mb-4">
            <Input
              id="password"
              v-model="form.data.password"
              type="password"
              label="new password"
              placeholder="Enter new password..."
              :err="form.errors.password"
              focus
              must />
          </div>
          <div class="mb-4">
            <Input
              id="password_confirmation"
              v-model="form.data.password_confirmation"
              type="password"
              label="confirm password"
              placeholder="Confirm new password..."
              :err="form.errors.password_confirmation"
              must />
          </div>
          <Button
            type="submit"
            label="Reset Password"
            class="btn btn-primary w-100"
            icon="bi bi-key ms-2"
            :disabled="processing" />
        </form>
        <div class="text-center mt-2">
          <router-link to="/login">
            <i class="bx bx-chevron-left scaleX-n1-rtl me-1"></i>
            <span>Back to login</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHead } from "@vueuse/head";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import Input from "@/components/Input.vue";
import AppLogo from "@/components/AppLogo.vue";
import { useGumForm } from "@/plugins/gum";
import { toast } from "@/composables/useToast";

useHead({ title: "Reset Password" });

const route = useRoute();
const router = useRouter();

const email = String(route.query.email || "");
const token = String(route.query.token || "");

const form = useGumForm({
  email,
  token,
  password: "",
  password_confirmation: ""
});

const processing = form.processing;
const isLinkValid = !!(token && email);
const message = ref(isLinkValid ? "Set your new password" : "Invalid reset link. Please request a new one.");
const isError = ref(!isLinkValid);

const onSubmit = async () => {
  if (!isLinkValid) return;

  message.value = "";
  isError.value = false;

  if (form.data.password !== form.data.password_confirmation) {
    isError.value = true;
    message.value = "Password confirmation does not match";
    toast.danger(message.value);
    return;
  }

  await form.post(
    "/api/auth/reset-password",
    {
      email: String(form.data.email || "").trim(),
      token: String(form.data.token || "").trim(),
      password: form.data.password,
      password_confirmation: form.data.password_confirmation
    },
    {
      onSuccess: (res) => {
        isError.value = false;
        message.value = res.data.message;
        toast.success(message.value || "Password updated successfully. Please login.");
        router.push("/login");
      },
      onError: (_errors, error) => {
        isError.value = true;
        const serverMsg = (error as any)?.response?.data?.message;
        const msg = serverMsg || (error instanceof Error ? error.message : "Failed to reset password");
        toast.danger(msg);
      }
    }
  );
};
</script>

<style lang="scss" scoped></style>
