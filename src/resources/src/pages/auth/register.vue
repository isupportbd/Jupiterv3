<template>
  <div class="container position-absolute start-50 top-50 translate-middle">
    <div class="auth col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4 mx-auto">
      <div class="d-block mb-2 text-center">
        <AppLogo :size="40" text-class="fs-4 text-primary fw-bold" />
      </div>
      <h5 class="text-center fw-bold mb-3">Create Account</h5>
      <form @submit.prevent="onSubmit">
        <div class="mb-2">
          <Input
            id="name"
            v-model="form.data.name"
            type="text"
            label="Name"
            placeholder="Enter your name..."
            :err="form.errors.name"
            topclass="mb-0"
            focus
            must />
        </div>
        <div class="mb-2">
          <Input
            id="email"
            v-model="form.data.email"
            type="email"
            label="Email"
            placeholder="Enter your email..."
            :err="form.errors.email"
            topclass="mb-0"
            must />
        </div>
        <div class="mb-2">
          <InputPasswordToggle
            id="password"
            v-model="form.data.password"
            label="Password"
            placeholder="Create a password..."
            :err="form.errors.password"
            must />
        </div>
        <div class="mb-3">
          <InputPasswordToggle
            id="password_confirmation"
            v-model="form.data.password_confirmation"
            label="Confirm Password"
            placeholder="Confirm your password..."
            :err="form.errors.password_confirmation"
            must />
        </div>
        <Button
          type="submit"
          class="btn btn-primary w-100 py-2"
          label="Create Account"
          icon="bi bi-person-plus"
          :disabled="processing" />
      </form>
      <div class="text-center mt-3">
        <span class="text-muted small">Already have an account?</span>
        <router-link to="/login" class="ms-1 text-decoration-none small fw-semibold">Login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHead } from "@vueuse/head";
import { ref } from "vue";
import { useRouter } from "vue-router";
import Input from "@/components/Input.vue";
import InputPasswordToggle from "@/components/InputPasswordToggle.vue";
import Button from "@/components/Button.vue";
import AppLogo from "@/components/AppLogo.vue";
import { useGumForm } from "@/plugins/gum";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/composables/useToast";

useHead({ title: "Register" });

const router = useRouter();
const auth = useAuthStore();

const form = useGumForm({
  name: "",
  email: "",
  password: "",
  password_confirmation: ""
});

const processing = form.processing;

const onSubmit = async () => {
  if (form.data.password !== form.data.password_confirmation) {
    toast.danger("Password confirmation does not match");
    return;
  }

  await form.post(
    "/api/auth/register",
    {
      name: String(form.data.name || "").trim(),
      email: String(form.data.email || "").trim(),
      password: form.data.password,
      password_confirmation: form.data.password_confirmation
    },
    {
      onSuccess: async () => {
        auth.initialized = false;
        await auth.bootstrap();

        if (auth.isAuthenticated) {
          toast.success("Registration successful! Welcome to Jupiter.");
          await router.push("/");
          return;
        }

        toast.success("Registration successful. Please verify your email.");
        await router.push("/login");
      },
      onError: (_errors, error) => {
        const errMsg = error instanceof Error ? error.message : "Unable to register right now";
        toast.danger(errMsg);
      }
    }
  );
};
</script>

<style lang="scss" scoped>
.fs-7 {
  font-size: 0.85rem;
}
</style>
