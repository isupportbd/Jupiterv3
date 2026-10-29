/**
 * Why: Universal currency, number, date, and LC ID formatting composable.
 * When: Used across dashboard, analytics tables, billing, and export modules.
 */
export function useFormatters() {
  function formatNumber(val: any): string {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) return "0";
    return Number(val).toLocaleString();
  }

  function formatCurrency(val: any, currency = "USD"): string {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return currency === "USD" ? "$0.00" : "BDT 0.00";
    }
    const num = Number(val);
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return currency === "USD" ? `$${formatted}` : `BDT ${formatted}`;
  }

  function formatCompact(val: any): string {
    if (val === null || val === undefined || isNaN(Number(val))) return "0";
    const num = Number(val);
    if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toLocaleString();
  }

  function formatDate(val: any): string {
    if (!val) return "-";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return String(val);
    }
  }

  function formatLcId(val: any): string {
    if (val === undefined || val === null || val === "") return "-";
    const str = String(val).trim();
    if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
      try {
        const num = BigInt(Math.round(Number(str)));
        return num.toString();
      } catch {
        return str;
      }
    }
    return str;
  }

  function cleanBranchCode(val: any): string {
    if (val === null || val === undefined) return "-";
    let str = String(val).trim();
    if (/^\d+$/.test(str)) {
      str = str.replace(/^0+(?=\d)/, "");
      return str || "0";
    }
    return str || "-";
  }

  return {
    formatNumber,
    formatCurrency,
    formatCompact,
    formatDate,
    formatLcId,
    cleanBranchCode
  };
}
