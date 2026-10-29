import { createRouter, createWebHistory } from "vue-router";
import { setupRouteProgress } from "@/plugins/routeProgress";
import { useAuthStore } from "@/stores/auth";

export const routes = [
  {
    path: "/",
    name: "dashlayout",
    component: () => import("@/layouts/Layout/index.vue"),
    redirect: { path: "/" },
    children: [
      {
        path: "/",
        name: "dashboard",
        component: () => import("@/pages/dashboard/index.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/users",
        name: "users",
        component: () => import("@/pages/users/index.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/profile",
        name: "profile",
        component: () => import("@/pages/profile/index.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/settings/billing",
        name: "settings-billing",
        component: () => import("@/pages/settings/billing.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/settings/payments",
        name: "settings-payments",
        component: () => import("@/pages/settings/payments.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/system/backup",
        name: "system-backup",
        component: () => import("@/pages/system/backup.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/reports/monthwise",
        name: "reports-monthwise",
        component: () => import("@/pages/reports/monthwise.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/reports/local-lc",
        name: "reports-local-lc",
        component: () => import("@/pages/reports/local-lc.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/reports/beneficiary",
        name: "reports-beneficiary",
        component: () => import("@/pages/reports/beneficiary.vue"),
        meta: { requiresAuth: true }
      },
      {
        path: "/reports/beneficiary-detail",
        name: "reports-beneficiary-detail",
        component: () => import("@/pages/reports/beneficiary-detail.vue"),
        meta: { requiresAuth: true }
      }
    ]
  },
  {
    path: "/login",
    name: "authlayout",
    component: () => import("@/layouts/AuthLayout.vue"),
    children: [
      {
        path: "/register",
        name: "register",
        component: () => import("@/pages/auth/register.vue"),
        meta: { guestOnly: true }
      },
      {
        path: "/login",
        name: "login",
        component: () => import("@/pages/auth/login.vue"),
        meta: { guestOnly: true }
      },
      {
        path: "/forget-password",
        name: "forget-password",
        component: () => import("@/pages/auth/forgetPassword.vue"),
        meta: { guestOnly: true }
      },
      {
        path: "/reset-password",
        name: "reset-password",
        component: () => import("@/pages/auth/resetPassword.vue"),
        meta: { guestOnly: true }
      },
      {
        path: "/verify-email",
        name: "verify-email",
        component: () => import("@/pages/auth/verifyEmail.vue"),
        meta: { guestOnly: true }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  }
});

setupRouteProgress(router);

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.bootstrap();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { path: "/" };
  }

  // Subscription expiration routing gate for Office Admin
  if (auth.isAuthenticated) {
    const role = String(auth.user?.role?.name || "").toLowerCase().replace(/_/g, "");
    if (role === "admin") {
      const isExpired = !auth.user?.subscriptionExpiresAt || new Date(auth.user.subscriptionExpiresAt as string) < new Date();
      const isPaymentRoute = to.path.startsWith("/settings/payments");
      if (isExpired && !isPaymentRoute) {
        return { path: "/settings/payments", query: { expired: "1" } };
      }
    }
  }

  return true;
});

export default router;
