import axios from "axios";
import { hasRole } from "@/composables/useAuth";

if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

axios.defaults.withCredentials = true;
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
axios.defaults.headers.common.Accept = "application/json";

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isAuthPage =
      window.location.pathname === "/register" ||
      window.location.pathname === "/login" ||
      window.location.pathname === "/forget-password" ||
      window.location.pathname === "/reset-password" ||
      window.location.pathname === "/verify-email";

    if (status === 401 && !isAuthPage) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
      window.location.href = `/login?redirect=${redirect}`;
    }

    if (status === 403 && !isAuthPage) {
      const code = error?.response?.data?.code;
      if (code === "ACCOUNT_INACTIVE" || code === "ACCOUNT_REJECTED" || code === "OFFICE_INACTIVE") {
        const msg = encodeURIComponent(error?.response?.data?.message || "Your account has been deactivated.");
        window.location.href = `/login?deactivated=1&error=${msg}`;
      }
    }

    if (status === 402 && window.location.pathname !== "/settings/payments") {
      if (hasRole("admin")) {
        window.location.href = "/settings/payments?expired=1";
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
