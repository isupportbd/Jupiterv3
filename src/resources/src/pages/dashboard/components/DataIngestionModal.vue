<template>
  <div>
    <!-- Hidden Native File Input for Excel/CSV Selection -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx, .xls, .csv"
      class="d-none"
      @change="handleFileSelected"
    />

    <!-- Modal: Excel Data Upload -->
    <div
      v-if="showModal"
      class="modal fade show d-block"
      tabindex="-1"
      style="background: rgba(0,0,0,0.6); z-index: 1055;"
    >
      <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width: 96vw; width: 1400px;">
        <div class="modal-content border shadow-lg">
          <!-- Top Header: Title, Subtitle, Change File, Add to Database & Close -->
          <div class="modal-header border-bottom py-2.5 px-3 d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-3">
              <div
                class="rounded-3 bg-body-secondary text-body d-flex align-items-center justify-content-center flex-shrink-0"
                style="width: 38px; height: 38px;"
              >
                <i class="bi bi-eye text-muted fs-5"></i>
              </div>
              <div>
                <h6 class="fw-bold mb-0 text-body">
                  Data Preview (First {{ Math.min(10, parsedRows.length) }} Sample Rows)
                </h6>
                <small class="text-muted">
                  Total {{ parsedRows.length.toLocaleString() }} valid records detected in file
                  <span v-if="selectedFileName" class="ms-1 opacity-75">({{ selectedFileName }})</span>
                </small>
              </div>
            </div>

            <div class="d-flex align-items-center gap-2">
              <button
                v-if="!uploading"
                type="button"
                class="btn btn-outline-secondary fw-semibold d-flex align-items-center gap-2 px-3 py-1.5"
                title="Change File"
                @click="triggerFileInput"
              >
                <i class="bi bi-arrow-repeat"></i>
                <span>Change File</span>
              </button>
              <button
                type="button"
                class="btn btn-success fw-semibold d-flex align-items-center gap-2 px-3 py-1.5"
                :disabled="uploading || parsingFile || parsedRows.length === 0"
                @click="startIngestion"
              >
                <span v-if="uploading" class="spinner-border spinner-border-sm me-1" role="status"></span>
                <i v-else class="bi bi-cloud-arrow-up me-1"></i>
                <span>{{ uploading ? "Adding to Database..." : "Add to Database" }}</span>
              </button>
              <button
                type="button"
                class="btn-close ms-2"
                :disabled="uploading"
                @click="closeUploadModal"
              ></button>
            </div>
          </div>

          <!-- Upload Progress Bar (when uploading) -->
          <div v-if="uploading" class="p-3 bg-body-tertiary border-bottom">
            <div class="d-flex justify-content-between align-items-center mb-1 small fw-semibold">
              <span class="text-primary">{{ uploadStatusText }}</span>
              <span>{{ uploadProgress }}%</span>
            </div>
            <div class="progress" style="height: 6px;">
              <div
                class="progress-bar progress-bar-striped progress-bar-animated bg-success"
                role="progressbar"
                :style="{ width: `${uploadProgress}%` }"
              ></div>
            </div>
          </div>

          <!-- Modal Body: Direct Full-Width Table with Steady Height -->
          <div class="modal-body p-0 position-relative" style="min-height: 480px;">
            <div
              v-if="parsingFile"
              class="d-flex flex-column align-items-center justify-content-center text-center py-5"
              style="min-height: 480px;"
            >
              <div class="spinner-border text-success mb-2" role="status" style="width: 2.5rem; height: 2.5rem;"></div>
              <span class="text-body fw-semibold">Reading file and preparing preview...</span>
              <small class="text-muted mt-1">Extracting records and table mapping...</small>
            </div>

            <div
              v-else-if="parsedRows.length > 0"
              class="table-responsive"
              style="max-height: 520px; min-height: 480px; overflow-x: auto; overflow-y: auto;"
            >
              <table class="table table-hover align-middle mb-0 font-monospace small text-nowrap">
                <thead class="table-light sticky-top" style="z-index: 2;">
                  <tr>
                    <th class="ps-3 text-center" style="width: 45px;">#</th>
                    <th>BANK_NAME</th>
                    <th>BRANCH_NAME</th>
                    <th>ADSCODE</th>
                    <th>LC_YEAR</th>
                    <th>LC_NATURE</th>
                    <th>LC_SERIAL</th>
                    <th class="text-primary">LC ID</th>
                    <th class="text-end">LC_VALUE</th>
                    <th>LC_DATE</th>
                    <th>LC_EXPIRY_DATE</th>
                    <th>BB_USANSE_PERIOD</th>
                    <th>LAST_SHIP_DATE</th>
                    <th>IRC</th>
                    <th>EXPORTER_INFO</th>
                    <th>APPLICANT_NAME</th>
                    <th>EXPORT_LC_NUMBER</th>
                    <th class="text-center">CURRENCY</th>
                    <th>PROCEEDS_DATE</th>
                    <th>BENEFICIARY_BANK</th>
                    <th>BENIFICIARY_BRANCH</th>
                    <th>BENEFICIARY_NAME</th>
                    <th>BENEFICIARY_ADDRESS</th>
                    <th>BENEFICIARY_IRC</th>
                    <th>BENEFICIARY_ERC</th>
                    <th>PI_NUMBER</th>
                    <th>PI_DATE</th>
                    <th>Bond License</th>
                    <th class="text-center">ACCEPTED</th>
                    <th class="text-center">CANCEL_YN</th>
                    <th>CANCEL_CAUSE</th>
                    <th class="pe-3">Entry Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in previewRows" :key="idx">
                    <td class="ps-3 text-center text-muted">{{ idx + 1 }}</td>
                    <td>{{ row.bankName || "-" }}</td>
                    <td>{{ row.branchName || "-" }}</td>
                    <td class="font-monospace">{{ row.adsCode || "-" }}</td>
                    <td>{{ row.lcYear || "-" }}</td>
                    <td>{{ row.lcNature || "-" }}</td>
                    <td>{{ row.lcSerial || "-" }}</td>
                    <td class="fw-semibold text-primary font-monospace">{{ row.lcId || "-" }}</td>
                    <td class="text-end fw-semibold text-success font-monospace">{{ formatNumber(row.lcValue) }}</td>
                    <td>{{ row.lcDate || "-" }}</td>
                    <td>{{ row.lcExpiryDate || "-" }}</td>
                    <td>{{ row.bbUsansePeriod || "-" }}</td>
                    <td>{{ row.lastShipDate || "-" }}</td>
                    <td>{{ row.irc || "-" }}</td>
                    <td class="text-truncate" style="max-width: 250px;" :title="row.exporterInfo">{{ row.exporterInfo || "-" }}</td>
                    <td>{{ row.applicantName || "-" }}</td>
                    <td>{{ row.exportLcNumber || "-" }}</td>
                    <td class="text-center">{{ row.currency || "USD" }}</td>
                    <td>{{ row.proceedsDate || "-" }}</td>
                    <td>{{ row.beneficiaryBank || "-" }}</td>
                    <td class="font-monospace">{{ row.beneficiaryBranch || "-" }}</td>
                    <td class="fw-semibold">{{ row.beneficiaryName || "-" }}</td>
                    <td class="text-truncate text-muted" style="max-width: 220px;" :title="row.beneficiaryAddress">{{ row.beneficiaryAddress || "-" }}</td>
                    <td>{{ row.beneficiaryIrc || "-" }}</td>
                    <td>{{ row.beneficiaryErc || "-" }}</td>
                    <td>{{ row.piNumber || "-" }}</td>
                    <td>{{ row.piDate || "-" }}</td>
                    <td>{{ row.bondLicense || "-" }}</td>
                    <td class="text-center">{{ row.accepted || "Y" }}</td>
                    <td class="text-center">
                      <span class="badge" :class="row.cancelYn === 'Y' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'">
                        {{ row.cancelYn || "N" }}
                      </span>
                    </td>
                    <td>{{ row.cancelCause || "-" }}</td>
                    <td class="pe-3">{{ row.entryDate || "-" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else-if="!parsingFile && parsedRows.length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-exclamation-circle fs-3 d-block mb-2 text-warning"></i>
              No valid data rows found in this sheet. Please verify your Excel file.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { useToast } from "@/composables/useToast";
import { useFormatters } from "@/composables/useFormatters";

const router = useRouter();
const toast = useToast();
const { formatNumber, cleanBranchCode } = useFormatters();

const emit = defineEmits<{
  (e: "ingested"): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const showModal = ref(false);
const parsingFile = ref(false);
const uploading = ref(false);
const selectedFileName = ref("");
const selectedFileSize = ref("");
const parsedRows = ref<Record<string, any>[]>([]);
const uploadProgress = ref(0);
const uploadStatusText = ref("");

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
    fileInputRef.value.click();
  }
}

function parseMonth(monStr: string): number {
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  return months[monStr.toLowerCase().slice(0, 3)] || 0;
}

function parseExcelDate(val: any): string | undefined {
  if (val === null || val === undefined || val === "") return undefined;

  if (typeof val === "number") {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return undefined;
  }

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  if (!str || str === "-" || str === "N/A") return undefined;

  const monMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})/);
  if (monMatch) {
    const d = monMatch[1].padStart(2, "0");
    const mNum = parseMonth(monMatch[2]);
    let yr = monMatch[3];
    if (yr.length === 2) {
      yr = Number(yr) > 50 ? "19" + yr : "20" + yr;
    }
    if (mNum > 0) {
      return `${yr}-${String(mNum).padStart(2, "0")}-${d}`;
    }
  }

  const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }

  const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const dmyShort = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})/);
  if (dmyShort) {
    const yr = Number(dmyShort[3]) > 50 ? "19" + dmyShort[3] : "20" + dmyShort[3];
    return `${yr}-${dmyShort[2].padStart(2, "0")}-${dmyShort[1].padStart(2, "0")}`;
  }

  return undefined;
}

function parseNumeric(val: any, defaultVal = 0): number {
  if (val === null || val === undefined || val === "") return defaultVal;
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  const cleaned = String(val).replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultVal : num;
}

function parseFullCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim().replace(/^"|"$/g, ""));
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      currentRow.push(currentCell.trim().replace(/^"|"$/g, ""));
      currentCell = "";
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else if ((char === "\r" || char === "\n") && inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      currentCell += " ";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim().replace(/^"|"$/g, ""));
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

async function handleFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  await processSelectedFile(file);
}

async function loadFile(file: File) {
  await processSelectedFile(file);
}

async function processSelectedFile(file: File) {
  selectedFileName.value = file.name;
  selectedFileSize.value = `${(file.size / 1024).toFixed(1)} KB`;
  parsingFile.value = true;
  const isAlreadyOpen = showModal.value;
  if (!isAlreadyOpen) {
    parsedRows.value = [];
  }

  try {
    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

    if (!isCsv && !isExcel) {
      throw new Error("Invalid file format. Please select an Excel (.xlsx, .xls) or CSV (.csv) file.");
    }

    let rawRows: any[][] = [];

    if (isCsv) {
      const text = await file.text();
      rawRows = parseFullCsv(text);
    } else {
      const ExcelJSModule = await import("exceljs");
      const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("No sheets found in the uploaded workbook.");
      }
      worksheet.eachRow({ includeEmpty: false }, (row: any) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        const cleanValues = values.map((val: any) => {
          if (val && typeof val === "object") {
            if (val instanceof Date) return val;
            if ("result" in val) return val.result;
            if ("text" in val) return val.text;
          }
          return val;
        });
        rawRows.push(cleanValues);
      });
    }

    if (!rawRows || rawRows.length === 0) {
      throw new Error("The selected file is empty.");
    }

    let headerRowIndex = -1;
    const headerMap: Record<number, string> = {};

    for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      let matchCount = 0;
      const tempMap: Record<number, string> = {};

      row.forEach((cell, idx) => {
        if (cell) {
          const norm = String(cell).toUpperCase().replace(/[^A-Z0-9]/g, "");
          tempMap[idx] = norm;

          if (
            norm.includes("BANKNAME") ||
            norm.includes("BRANCHNAME") ||
            norm.includes("LCID") ||
            norm.includes("LCVALUE") ||
            norm.includes("LCDATE") ||
            norm.includes("BENEFICIARY") ||
            norm.includes("EXPORTER")
          ) {
            matchCount++;
          }
        }
      });

      if (matchCount >= 2) {
        headerRowIndex = r;
        Object.assign(headerMap, tempMap);
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error("Could not find table header row (e.g. BANK_NAME, LC ID, LC_VALUE).");
    }

    const rows: Record<string, any>[] = [];

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      let bankName = "";
      let branchName = "";
      let adsCode = "";
      let lcYear = "";
      let lcNature = "";
      let lcSerial = "";
      let lcId = "";
      let lcValue = 0;
      let currency = "USD";
      let lcDate: string | undefined;
      let lcExpiryDate: string | undefined;
      let bbUsansePeriod = "";
      let lastShipDate: string | undefined;
      let proceedsDate: string | undefined;
      let irc = "";
      let exporterInfo = "";
      let applicantName = "";
      let exportLcNumber = "";
      let beneficiaryBank = "";
      let beneficiaryBranch = "";
      let beneficiaryName = "";
      let beneficiaryAddress = "";
      let beneficiaryIrc = "";
      let beneficiaryErc = "";
      let piNumber = "";
      let piDate: string | undefined;
      let bondLicense = "";
      let accepted = "";
      let cancelYn = "N";
      let cancelCause = "";
      let entryDate: string | undefined;

      row.forEach((val, colIdx) => {
        const key = headerMap[colIdx];
        if (!key) return;

        if (key === "BANKNAME" || key.includes("BANKNAME")) {
          bankName = String(val || "").trim();
        } else if (key === "BRANCHNAME") {
          branchName = String(val || "").trim();
        } else if (key === "ADSCODE") {
          adsCode = cleanBranchCode(val);
        } else if (key === "LCYEAR") {
          lcYear = String(val || "").trim();
        } else if (key === "LCNATURE") {
          lcNature = String(val || "").trim();
        } else if (key === "LCSERIAL") {
          lcSerial = String(val || "").trim();
        } else if (key === "LCID") {
          lcId = String(val || "").trim();
        } else if (key === "LCVALUE" || key.includes("VALUE")) {
          lcValue = parseNumeric(val, 0);
        } else if (key === "CURRENCY") {
          const rawCurr = String(val || "USD").trim().toUpperCase();
          currency = rawCurr === "1" ? "USD" : (rawCurr || "USD");
        } else if (key === "LCDATE") {
          lcDate = parseExcelDate(val);
        } else if (key === "LCEXPIRYDATE" || key.includes("EXPIRY")) {
          lcExpiryDate = parseExcelDate(val);
        } else if (key === "BBUSANSEPERIOD" || key.includes("USANSE") || key.includes("USANCE")) {
          bbUsansePeriod = String(val || "").trim();
        } else if (key === "LASTSHIPDATE" || key.includes("SHIP")) {
          lastShipDate = parseExcelDate(val);
        } else if (key === "PROCEEDSDATE" || key.includes("PROCEEDS")) {
          proceedsDate = parseExcelDate(val);
        } else if (key === "IRC") {
          irc = String(val || "").trim();
        } else if (key === "EXPORTERINFO" || key.includes("EXPORTER")) {
          exporterInfo = String(val || "").trim();
        } else if (key === "APPLICANTNAME" || key.includes("APPLICANT")) {
          applicantName = String(val || "").trim();
        } else if (key === "EXPORTLCNUMBER" || key.includes("EXPORTLC")) {
          exportLcNumber = String(val || "").trim();
        } else if (key === "BENEFICIARYBANK") {
          beneficiaryBank = String(val || "").trim();
        } else if (key === "BENIFICIARYBRANCH" || key === "BENEFICIARYBRANCH") {
          beneficiaryBranch = cleanBranchCode(val);
        } else if (key === "BENEFICIARYNAME" || key.includes("BENEFICIARYNAME")) {
          beneficiaryName = String(val || "").trim();
        } else if (key === "BENEFICIARYADDRESS") {
          beneficiaryAddress = String(val || "").trim();
        } else if (key === "BENEFICIARYIRC") {
          beneficiaryIrc = String(val || "").trim();
        } else if (key === "BENEFICIARYERC") {
          beneficiaryErc = String(val || "").trim();
        } else if (key === "PINUMBER" || key.includes("PINUM")) {
          piNumber = String(val || "").trim();
        } else if (key === "PIDATE") {
          piDate = parseExcelDate(val);
        } else if (key === "BONDLICENSE" || key.includes("BONDLIC")) {
          bondLicense = String(val || "").trim();
        } else if (key === "ACCEPTED") {
          accepted = String(val || "").trim();
        } else if (key === "CANCELYN" || key.includes("CANCELYN")) {
          cancelYn = String(val || "N").trim().toUpperCase();
        } else if (key === "CANCELCAUSE" || key.includes("CAUSE")) {
          cancelCause = String(val || "").trim();
        } else if (key === "ENTRYDATE" || key.includes("ENTRYDATE") || key.includes("ENTRY_DATE")) {
          entryDate = parseExcelDate(val);
        }
      });

      if (
        !bankName ||
        bankName.trim() === "" ||
        !entryDate ||
        bankName.toLowerCase().startsWith("total") ||
        bankName.toLowerCase().startsWith("grand")
      ) {
        continue;
      }

      if (!lcId) {
        lcId = lcSerial ? `LC-${lcSerial}` : `LC-ROW-${r + 1}`;
      }

      const finalApplicant = applicantName ? applicantName.trim() : "";

      rows.push({
        bankName,
        bank_name: bankName,
        branchName,
        branch_name: branchName,
        adsCode,
        ads_code: adsCode,
        lcYear,
        lc_year: lcYear,
        lcNature: lcNature || "General",
        lc_nature: lcNature || "General",
        lcSerial,
        lc_serial: lcSerial,
        lcId,
        lc_id: lcId,
        lcValue,
        lc_value: lcValue,
        currency,
        lcDate,
        lc_date: lcDate,
        lcExpiryDate,
        lc_expiry_date: lcExpiryDate,
        bbUsansePeriod,
        bb_usanse_period: bbUsansePeriod,
        lastShipDate,
        last_ship_date: lastShipDate,
        proceedsDate,
        proceeds_date: proceedsDate,
        irc,
        exporterInfo,
        exporter_info: exporterInfo,
        applicantName: finalApplicant,
        applicant_name: finalApplicant,
        exportLcNumber,
        export_lc_number: exportLcNumber,
        beneficiaryBank,
        beneficiary_bank: beneficiaryBank,
        beneficiaryBranch,
        beneficiary_branch: beneficiaryBranch,
        beneficiaryName,
        beneficiary_name: beneficiaryName,
        beneficiaryAddress,
        beneficiary_address: beneficiaryAddress,
        beneficiaryIrc,
        beneficiary_irc: beneficiaryIrc,
        beneficiaryErc,
        beneficiary_erc: beneficiaryErc,
        piNumber,
        pi_number: piNumber,
        piDate,
        pi_date: piDate,
        bondLicense: bondLicense || "N/A",
        bond_license: bondLicense || "N/A",
        accepted: accepted || "Y",
        cancelYn: cancelYn === "Y" ? "Y" : "N",
        cancel_yn: cancelYn === "Y" ? "Y" : "N",
        cancelCause,
        cancel_cause: cancelCause,
        entryDate,
        entry_date: entryDate
      });
    }

    parsedRows.value = rows;
    showModal.value = true;
    if (rows.length === 0) {
      toast.warning("The selected file does not contain any valid data rows.");
    }
  } catch (err: any) {
    console.error("File parse error:", err);
    toast.danger(err.message || "Failed to parse file.");
    parsedRows.value = [];
  } finally {
    parsingFile.value = false;
  }
}

let activeUploadWorker: Worker | null = null;
let wakeLockSentinel: any = null;

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
    }
  } catch (e) {
    // Ignore if not supported or denied
  }
}

function releaseWakeLock() {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch (e) {}
    wakeLockSentinel = null;
  }
}

function createUploadWorker() {
  const workerScript = `
    self.onmessage = async function(e) {
      const { rows, batchSize, endpoint } = e.data;
      const total = rows.length;
      let processed = 0;
      let totalInserted = 0;

      for (let i = 0; i < total; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        const currentEnd = Math.min(i + batchSize, total);

        self.postMessage({
          type: 'status',
          statusText: 'Uploading records ' + (i + 1).toLocaleString() + ' to ' + currentEnd.toLocaleString() + ' of ' + total.toLocaleString() + '...',
          progress: Math.round((processed / total) * 100)
        });

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(chunk)
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || 'Batch upload failed with status ' + res.status);
          }

          const resData = await res.json();
          if (resData && resData.data && resData.data.insertedCount !== undefined) {
            totalInserted += Number(resData.data.insertedCount);
          }
          processed += chunk.length;

          self.postMessage({
            type: 'progress',
            progress: Math.round((processed / total) * 100),
            processed,
            total,
            totalInserted
          });
        } catch (err) {
          self.postMessage({
            type: 'error',
            message: err.message || 'Failed to ingest records.'
          });
          return;
        }
      }

      self.postMessage({
        type: 'done',
        total,
        totalInserted
      });
    };
  `;

  const blob = new Blob([workerScript], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob));
}

async function runDirectUpload() {
  const rows = parsedRows.value;
  const total = rows.length;
  const batchSize = 1000;
  let processed = 0;
  let totalInserted = 0;
  const endpoint = "/api/data-management/upload/batch";

  try {
    for (let i = 0; i < total; i += batchSize) {
      if (!uploading.value) break;

      const chunk = rows.slice(i, i + batchSize);
      const currentEnd = Math.min(i + batchSize, total);

      uploadStatusText.value = `Uploading records ${(i + 1).toLocaleString()} to ${currentEnd.toLocaleString()} of ${total.toLocaleString()}...`;
      uploadProgress.value = Math.round((processed / total) * 100);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(chunk)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Batch upload failed with status ${res.status}`);
      }

      const resData = await res.json();
      if (resData && resData.data && resData.data.insertedCount !== undefined) {
        totalInserted += Number(resData.data.insertedCount);
      }
      processed += chunk.length;

      uploadProgress.value = Math.round((processed / total) * 100);
      uploadStatusText.value = `Uploaded ${processed.toLocaleString()} of ${total.toLocaleString()} records...`;

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    releaseWakeLock();
    uploading.value = false;
    showModal.value = false;
    parsedRows.value = [];
    selectedFileName.value = "";
    uploadProgress.value = 0;

    toast.success(`Successfully uploaded ${total.toLocaleString()} records (${totalInserted.toLocaleString()} new inserted).`);
    emit("ingested");
    await router.push("/reports/local-lc");
  } catch (err: any) {
    releaseWakeLock();
    uploading.value = false;
    console.error("Direct ingestion error:", err);
    toast.danger(err.message || "Failed to ingest records.");
  }
}

function closeUploadModal() {
  if (uploading.value) return;
  if (activeUploadWorker) {
    activeUploadWorker.terminate();
    activeUploadWorker = null;
  }
  releaseWakeLock();
  showModal.value = false;
  parsedRows.value = [];
  selectedFileName.value = "";
  uploadProgress.value = 0;
}

const previewRows = computed(() => {
  return parsedRows.value.slice(0, 10);
});

async function startIngestion() {
  if (parsedRows.value.length === 0 || uploading.value) return;
  uploading.value = true;
  uploadProgress.value = 0;
  const batchSize = 1000;
  const total = parsedRows.value.length;
  uploadStatusText.value = `Preparing background upload of ${total.toLocaleString()} records...`;

  await requestWakeLock();

  if (activeUploadWorker) {
    activeUploadWorker.terminate();
    activeUploadWorker = null;
  }

  let worker: Worker | null = null;
  try {
    worker = createUploadWorker();
  } catch (err) {
    console.warn("Could not create Web Worker, using direct upload fallback:", err);
    await runDirectUpload();
    return;
  }

  activeUploadWorker = worker;

  activeUploadWorker.onmessage = async (e: MessageEvent) => {
    const data = e.data;
    if (data.type === "status") {
      uploadStatusText.value = data.statusText;
      uploadProgress.value = data.progress;
    } else if (data.type === "progress") {
      uploadProgress.value = data.progress;
      uploadStatusText.value = `Uploaded ${data.processed.toLocaleString()} of ${data.total.toLocaleString()} records...`;
    } else if (data.type === "done") {
      if (activeUploadWorker) {
        activeUploadWorker.terminate();
        activeUploadWorker = null;
      }
      releaseWakeLock();
      uploading.value = false;
      showModal.value = false;
      parsedRows.value = [];
      selectedFileName.value = "";
      uploadProgress.value = 0;

      toast.success(`Successfully uploaded ${data.total.toLocaleString()} records (${data.totalInserted.toLocaleString()} new inserted).`);
      emit("ingested");
      await router.push("/reports/local-lc");
    } else if (data.type === "error") {
      if (activeUploadWorker) {
        activeUploadWorker.terminate();
        activeUploadWorker = null;
      }
      releaseWakeLock();
      uploading.value = false;
      console.error("Background ingestion error:", data.message);
      toast.danger(data.message || "Failed to ingest records.");
    }
  };

  activeUploadWorker.onerror = async (err) => {
    console.warn("Worker error encountered, falling back to direct upload:", err);
    if (activeUploadWorker) {
      activeUploadWorker.terminate();
      activeUploadWorker = null;
    }
    await runDirectUpload();
  };

  activeUploadWorker.postMessage({
    rows: parsedRows.value,
    batchSize,
    endpoint: "/api/data-management/upload/batch"
  });
}

defineExpose({
  triggerFileInput,
  loadFile
});
</script>
