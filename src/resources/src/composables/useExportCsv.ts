/**
 * Why: Centralized CSV export composable with UTF-8 BOM, RFC-4180 escaping, and browser download trigger.
 * When: Used across Local LC, Beneficiary, and Monthwise reports.
 */
export function useExportCsv() {
  function escapeCell(val: any): string {
    if (val === null || val === undefined) return '""';
    let s = String(val);
    // Neutralize formula injection (=, +, -, @, tab, newline) for Excel/Calc
    if (/^[=+\-@\t\r]/.test(s)) {
      s = "'" + s;
    }
    return `"${s.replace(/"/g, '""')}"`;
  }

  function exportCsv(options: {
    filename: string;
    headers: string[];
    rows: (string | number | null | undefined)[][];
  }) {
    const { filename, headers, rows } = options;
    const csvContent = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(","))
    ].join("\r\n");

    // Add UTF-8 BOM for Excel compatibility
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return {
    exportCsv,
    escapeCell
  };
}
