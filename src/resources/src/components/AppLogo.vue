<template>
  <div class="app-logo-wrapper d-inline-flex align-items-center" :class="{ 'gap-2': showText }">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="app-logo-icon flex-shrink-0"
    >
      <defs>
        <!-- Deep Real Jupiter Sphere Gradient -->
        <linearGradient id="jup-planet-grad" x1="14" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fef3c7" />
          <stop offset="25%" stop-color="#fcd34d" />
          <stop offset="55%" stop-color="#f59e0b" />
          <stop offset="80%" stop-color="#b45309" />
          <stop offset="100%" stop-color="#451a03" />
        </linearGradient>

        <!-- 3D Spherical Shadow (Gives realistic planetary curvature & volume) -->
        <radialGradient id="jup-sphere-shadow" cx="28%" cy="28%" r="72%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
          <stop offset="45%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="72%" stop-color="#000000" stop-opacity="0.32" />
          <stop offset="100%" stop-color="#2a0800" stop-opacity="0.88" />
        </radialGradient>

        <!-- Golden Amber Orbital Ring Gradient -->
        <linearGradient id="jup-ring-grad" x1="4" y1="36" x2="60" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="40%" stop-color="#fbbf24" />
          <stop offset="75%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#c2410c" />
        </linearGradient>

        <!-- Warm Amber Glow Filter -->
        <filter id="jup-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <!-- Sphere Clip Definition -->
        <clipPath id="jup-planet-clip">
          <circle cx="32" cy="32" r="18" />
        </clipPath>
      </defs>

      <!-- Planetary Body & Rings Group with 3D levitation -->
      <g class="jup-core-group">
        <!-- Back of the Orbital Ring (Behind Planet) -->
        <ellipse
          class="jup-ring-back"
          cx="32"
          cy="32"
          rx="26"
          ry="9"
          transform="rotate(-26 32 32)"
          stroke="url(#jup-ring-grad)"
          stroke-width="3"
          stroke-dasharray="80 100"
          stroke-dashoffset="35"
          stroke-linecap="round"
          opacity="0.65"
        />

        <!-- Jupiter Atmosphere Bands (Clipped to sphere with realistic Jovian bands & Great Red Spot) -->
        <g clip-path="url(#jup-planet-clip)">
          <!-- Base Planet Sphere -->
          <circle
            class="jup-planet"
            cx="32"
            cy="32"
            r="18"
            fill="url(#jup-planet-grad)"
          />

          <!-- Real Jupiter Atmospheric Cloud Belts -->
          <g class="jup-bands">
            <!-- 1. North Polar Hood (tan/amber) -->
            <path d="M14 18 Q 32 16.5 50 18" stroke="#a16207" stroke-width="2.5" opacity="0.6" fill="none" />

            <!-- 2. North Temperate Belt (rich terracotta) -->
            <path d="M13 22 C 24 23.5, 40 20.5, 51 22" stroke="#b45309" stroke-width="2.2" opacity="0.8" fill="none" />

            <!-- 3. North Tropical Zone (pale cream-gold) -->
            <path d="M13 26 Q 32 25 51 26" stroke="#fef08a" stroke-width="1.8" opacity="0.65" fill="none" />

            <!-- 4. North Equatorial Belt (broad dark rust-brown) -->
            <path d="M12 30 C 22 31.5, 42 28.5, 52 30" stroke="#9a3412" stroke-width="3.5" opacity="0.9" fill="none" />

            <!-- 5. Equatorial Zone (bright golden-white) -->
            <path d="M12 34 Q 32 33 52 34" stroke="#fed7aa" stroke-width="2.2" opacity="0.75" fill="none" />

            <!-- 6. South Equatorial Belt (crimson-terracotta with storm) -->
            <path d="M12 38 C 23 39.5, 41 36.5, 52 38" stroke="#7c2d12" stroke-width="3.2" opacity="0.92" fill="none" />

            <!-- The Great Red Spot (Iconic Crimson Oval Storm on South Equatorial Belt) -->
            <g class="jup-storm">
              <ellipse cx="38" cy="38" rx="4.5" ry="2.6" fill="#dc2626" opacity="0.95" />
              <ellipse cx="38" cy="38" rx="2.8" ry="1.4" fill="#ef4444" />
              <ellipse cx="37.5" cy="37.5" rx="1.2" ry="0.6" fill="#fca5a5" opacity="0.85" />
            </g>

            <!-- 7. South Temperate Belt -->
            <path d="M13 42 C 25 43, 39 41.5, 51 42" stroke="#92400e" stroke-width="2" opacity="0.8" fill="none" />

            <!-- 8. South Polar Hood -->
            <path d="M15 46 Q 32 45 49 46" stroke="#78350f" stroke-width="2.5" opacity="0.65" fill="none" />
          </g>

          <!-- 3D Spherical Volume Shadow -->
          <circle cx="32" cy="32" r="18" fill="url(#jup-sphere-shadow)" />
        </g>

        <!-- Sphere Specular Highlight / Shine with live shimmer -->
        <ellipse class="jup-specular" cx="25" cy="23" rx="7" ry="4" transform="rotate(-30 25 23)" fill="#ffffff" opacity="0.32" />

        <!-- Front of the Orbital Ring (In Front of Planet) with live warm glow -->
        <ellipse
          class="jup-ring-front"
          cx="32"
          cy="32"
          rx="26"
          ry="9"
          transform="rotate(-26 32 32)"
          stroke="url(#jup-ring-grad)"
          stroke-width="3.5"
          stroke-dasharray="65 100"
          stroke-dashoffset="115"
          stroke-linecap="round"
          filter="url(#jup-glow)"
        />

        <!-- Tech Orbit Nodes with live pulsing golden beacon -->
        <circle class="jup-node jup-node-1" cx="11" cy="41" r="2.2" fill="#fbbf24" />
        <circle class="jup-node jup-node-2" cx="53" cy="23" r="2" fill="#f59e0b" />
      </g>
    </svg>

    <div v-if="showText" class="app-logo-text d-flex align-items-center user-select-none">
      <span class="app-logo-brand jup-brand-title fw-bold" :class="textClass">{{ title }}</span>
      <span class="badge jup-brand-badge fw-bold shadow-xs ms-2" :class="badgeClass">{{ badge }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AppLogoProps {
  size?: number | string;
  showText?: boolean;
  textClass?: string;
  badgeClass?: string;
  title?: string;
  badge?: string;
}

withDefaults(defineProps<AppLogoProps>(), {
  size: 32,
  showText: true,
  textClass: "",
  badgeClass: "",
  title: "Jupiter",
  badge: "V3"
});
</script>

<style scoped>
.app-logo-wrapper {
  line-height: 1;
}

/* Authentic warm Jupiter glow */
.app-logo-icon {
  display: block;
  filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.45));
  animation: jup-live-glow 3.2s ease-in-out infinite alternate;
  transition: transform 0.25s ease;
  will-change: filter, transform;
}

.app-logo-wrapper:hover .app-logo-icon {
  transform: rotate(6deg) scale(1.08);
}

/* 1. Gentle planetary floating levitation */
.jup-core-group {
  animation: jup-float 4s ease-in-out infinite;
  transform-origin: 32px 32px;
}

/* 2. Orbital ring breathing pulse */
.jup-ring-front {
  animation: jup-ring-pulse 3s ease-in-out infinite alternate;
}

/* 3. Atmospheric cloud bands live drift */
.jup-bands {
  animation: jup-band-drift 5s ease-in-out infinite alternate;
  transform-origin: 32px 32px;
}

/* 4. Planetary Great Red Spot storm pulse */
.jup-storm {
  animation: jup-storm-pulse 2.2s ease-in-out infinite alternate;
  transform-origin: 38px 38px;
}

/* 5. Specular highlight live shimmer */
.jup-specular {
  animation: jup-specular-shimmer 3s ease-in-out infinite alternate;
}

/* 6. Orbital tech nodes beacon pulses */
.jup-node-1 {
  animation: jup-node-pulse 2.4s ease-in-out infinite;
  transform-origin: 11px 41px;
}
.jup-node-2 {
  animation: jup-node-pulse 2.4s ease-in-out infinite 1.2s;
  transform-origin: 53px 23px;
}

/* Brand Typography & Warning Tone */
.jup-brand-title {
  background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #f59e0b; /* Fallback */
  letter-spacing: -0.02em;
  line-height: 1;
}

.jup-brand-badge {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(245, 158, 11, 0.35);
  letter-spacing: 0.3px;
}

.shadow-xs {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

/* Keyframes for live motion */
@keyframes jup-live-glow {
  0% {
    filter: drop-shadow(0 0 2px rgba(217, 119, 6, 0.4));
  }
  100% {
    filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.75)) drop-shadow(0 0 14px rgba(234, 88, 12, 0.45));
  }
}

@keyframes jup-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-1.5px);
  }
}

@keyframes jup-ring-pulse {
  0% {
    stroke-dashoffset: 118;
    opacity: 0.82;
  }
  100% {
    stroke-dashoffset: 108;
    opacity: 1;
  }
}

@keyframes jup-band-drift {
  0% {
    transform: translateX(-1.5px);
  }
  100% {
    transform: translateX(1.5px);
  }
}

@keyframes jup-storm-pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.85;
  }
  100% {
    transform: scale(1.18);
    opacity: 1;
    filter: drop-shadow(0 0 3px #ef4444);
  }
}

@keyframes jup-specular-shimmer {
  0% {
    opacity: 0.2;
  }
  100% {
    opacity: 0.45;
  }
}

@keyframes jup-node-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.5);
    opacity: 1;
  }
}
</style>
