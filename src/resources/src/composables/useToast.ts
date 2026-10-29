export type ToastType = "success" | "danger" | "warning" | "info" | "primary" | "secondary";

export type ToastHandler = (msg: string, bg: ToastType | string) => void;

let activeHandler: ToastHandler | null = null;
const pendingQueue: Array<{ msg: string; bg: ToastType | string }> = [];

export function registerToastHandler(handler: ToastHandler) {
  activeHandler = handler;
  while (pendingQueue.length > 0) {
    const item = pendingQueue.shift();
    if (item) {
      activeHandler(item.msg, item.bg);
    }
  }
}

export function unregisterToastHandler(handler: ToastHandler) {
  if (activeHandler === handler) {
    activeHandler = null;
  }
}

export const toast = {
  show(msg: string, bg: ToastType | string = "primary") {
    if (!msg) return;
    if (activeHandler) {
      activeHandler(msg, bg);
    } else {
      pendingQueue.push({ msg, bg });
    }
  },
  success(msg: string) {
    this.show(msg, "success");
  },
  danger(msg: string) {
    this.show(msg, "danger");
  },
  error(msg: string) {
    this.show(msg, "danger");
  },
  warning(msg: string) {
    this.show(msg, "warning");
  },
  info(msg: string) {
    this.show(msg, "info");
  }
};

export function useToast() {
  return toast;
}
