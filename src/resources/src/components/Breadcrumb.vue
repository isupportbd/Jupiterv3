<template>
  <nav aria-label="breadcrumb" class="app-breadcrumb-nav">
    <ol class="breadcrumb mb-0 align-items-center">
      <!-- 1. IF ON DASHBOARD ROOT (Single item: Dashboard with icon, NOT Home/Dashboard) -->
      <li v-if="isRootDashboard" class="breadcrumb-item active" aria-current="page">
        <span class="breadcrumb-active-page d-inline-flex align-items-center crumb-content">
          <i class="bi bi-house-door crumb-icon"></i>
          <span>Dashboard</span>
        </span>
      </li>

      <!-- 2. IF ON OTHER ROUTES (Root Link -> Parents -> Active Page) -->
      <template v-else>
        <!-- Root Link (Dashboard) -->
        <li class="breadcrumb-item">
          <router-link to="/" class="breadcrumb-link d-inline-flex align-items-center crumb-content text-decoration-none">
            <i class="bi bi-house-door crumb-icon"></i>
            <span>Dashboard</span>
          </router-link>
        </li>

        <!-- Intermediate Parent Segments -->
        <li
          v-for="(item, idx) in currentCrumbs.parents"
          :key="idx"
          class="breadcrumb-item">
          <router-link v-if="item.to" :to="item.to" class="breadcrumb-link crumb-content text-decoration-none">
            {{ item.label }}
          </router-link>
          <span v-else class="text-muted">{{ item.label }}</span>
        </li>

        <!-- Active Sub-Page -->
        <li class="breadcrumb-item active" aria-current="page">
          <span class="breadcrumb-active-page crumb-content">{{ currentCrumbs.current }}</span>
        </li>
      </template>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

interface CrumbItem {
  label: string;
  to?: string;
}

interface CrumbConfig {
  parents: CrumbItem[];
  current: string;
}

const isRootDashboard = computed(() => {
  return route.path === "/" || route.path === "" || route.name === "dashboard";
});

const currentCrumbs = computed<CrumbConfig>(() => {
  const p = route.path;

  if (p === "/" || p === "") {
    return {
      parents: [],
      current: "Dashboard"
    };
  }

  if (p === "/reports/local-lc") {
    return {
      parents: [],
      current: "LC Records"
    };
  }

  if (p === "/reports/monthwise") {
    return {
      parents: [],
      current: "Monthwise Report"
    };
  }

  if (p === "/reports/beneficiary") {
    return {
      parents: [],
      current: "Beneficiary Report"
    };
  }

  if (p === "/reports/beneficiary-detail") {
    return {
      parents: [{ label: "Beneficiary Report", to: "/reports/beneficiary" }],
      current: "Beneficiary Details"
    };
  }

  if (p === "/users") {
    return {
      parents: [],
      current: "User Management"
    };
  }

  if (p === "/profile") {
    return {
      parents: [],
      current: "My Profile"
    };
  }

  if (p === "/settings/billing") {
    return {
      parents: [],
      current: "Billing & Invoices"
    };
  }

  if (p === "/settings/payments") {
    return {
      parents: [],
      current: "Subscription & Payment"
    };
  }

  if (p === "/system/backup") {
    return {
      parents: [],
      current: "Database Backup"
    };
  }

  // Fallback dynamic crumbs
  const segments = p.split("/").filter(Boolean);
  const parents: CrumbItem[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const subPath = "/" + segments.slice(0, i + 1).join("/");
    parents.push({
      label: formatSegment(segments[i]),
      to: subPath
    });
  }

  const last = segments[segments.length - 1] || "Page";
  return {
    parents,
    current: formatSegment(last)
  };
});

function formatSegment(seg: string): string {
  return seg
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
</script>

<style scoped>
.app-breadcrumb-nav {
  display: flex;
  align-items: center;
  font-size: 0.84rem;
  padding: 0.2rem 0.15rem 0.25rem 0.15rem;
  margin-bottom: 0.35rem;
}

.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
  background: transparent;
  padding: 0;
  margin: 0;
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  line-height: 1.2;
}

.crumb-content {
  gap: 0.45rem;
}

.crumb-icon {
  font-size: 0.95rem;
  line-height: 1;
}

.breadcrumb-item + .breadcrumb-item::before {
  content: "/";
  color: var(--bs-secondary-color, #94a3b8);
  opacity: 0.65;
  padding-left: 0.4rem;
  padding-right: 0.4rem;
  font-size: 0.82rem;
}

.breadcrumb-link {
  color: var(--bs-secondary-color, #64748b);
  font-weight: 500;
  transition: color 0.15s ease-in-out;
}

.breadcrumb-link:hover {
  color: #0d6efd;
  text-decoration: underline !important;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVE PAGE STYLING:
   - Light mode: Crisp Vibrant Blue (#0d6efd)
   - Dark mode: Strong White (#ffffff)
   ───────────────────────────────────────────────────────────────────────────── */
.breadcrumb-active-page {
  font-weight: 600;
  color: #0d6efd !important; /* Default Light Mode: Blue */
  letter-spacing: 0.01em;
}

/* Dark Mode targeting both data-bs-theme and .theme-dark */
:global([data-bs-theme="dark"]) .breadcrumb-active-page,
:global(body.theme-dark) .breadcrumb-active-page,
:global(.theme-dark) .breadcrumb-active-page {
  color: #ffffff !important; /* Strong White in Dark Mode */
  font-weight: 700 !important;
  text-shadow: 0 0 1px rgba(255, 255, 255, 0.4);
}

:global([data-bs-theme="dark"]) .breadcrumb-link,
:global(body.theme-dark) .breadcrumb-link,
:global(.theme-dark) .breadcrumb-link {
  color: #94a3b8;
}

:global([data-bs-theme="dark"]) .breadcrumb-link:hover,
:global(body.theme-dark) .breadcrumb-link:hover,
:global(.theme-dark) .breadcrumb-link:hover {
  color: #ffffff;
}

/* Auto Theme Media Query */
@media (prefers-color-scheme: dark) {
  :global(body.theme-auto) .breadcrumb-active-page,
  :global([data-bs-theme="auto"]) .breadcrumb-active-page {
    color: #ffffff !important;
    font-weight: 700 !important;
  }
  :global(body.theme-auto) .breadcrumb-link,
  :global([data-bs-theme="auto"]) .breadcrumb-link {
    color: #94a3b8;
  }
}
</style>
