import { describe, it, expect } from "vitest";

describe("Jupiter V3 - Ingestion & Sanitization Engine", () => {
  // 1. Bank Name Validation
  it("strictly validates institutional bank names and rejects factory addresses", () => {
    const isValidBankName = (name: string): boolean => {
      if (!name || name.length < 3) return false;
      const lower = name.toLowerCase().trim();
      if (
        /^(mirpur|hemayetpur|savar|gazipur|dhaka-\d|chittagong|khulna|sylhet|road\b|house\b|plot\b|flat\b|sector\b|block\b|ward\b|post\b|village\b)/i.test(lower) ||
        /^\d+[-/,\s]/.test(lower)
      ) {
        return false;
      }
      const bankKeywords = ["bank", "plc", "ltd", "limited", "corp", "hsbc", "citi", "woori", "habib", "krishi", "unnayan", "kallyan", "trust", "chartered", "societe"];
      return bankKeywords.some((kw) => lower.includes(kw));
    };

    // Valid bank names
    expect(isValidBankName("Dutch-Bangla Bank Ltd.")).toBe(true);
    expect(isValidBankName("BRAC Bank PLC")).toBe(true);
    expect(isValidBankName("Standard Chartered Bank")).toBe(true);
    expect(isValidBankName("The Hongkong and Shanghai Banking Cor. Ltd.")).toBe(true);
    expect(isValidBankName("Citi Bank N.A.")).toBe(true);
    expect(isValidBankName("Pubali Bank PLC")).toBe(true);

    // Invalid factory addresses that must NEVER be accepted as banks
    expect(isValidBankName("MIRPUR-1")).toBe(false);
    expect(isValidBankName("HEMAYETPUR, SAVAR")).toBe(false);
    expect(isValidBankName("PLOT-132, ROAD-4")).toBe(false);
    expect(isValidBankName("HOUSE-58/2, SECTOR-7, UTTARA")).toBe(false);
    expect(isValidBankName("GAZIPUR-1700")).toBe(false);
    expect(isValidBankName("VILLAGE: GILAR CHALA")).toBe(false);
  });

  // 2. Scientific Notation Cleaning
  it("correctly converts floating scientific notation into clean full LC IDs", () => {
    const cleanLcId = (val: any): string => {
      if (!val) return "";
      let str = String(val).trim();
      if (/[eE]\+?\d+/.test(str)) {
        const num = Number(str);
        if (!isNaN(num)) {
          str = BigInt(Math.round(num)).toString();
        }
      }
      return str;
    };

    expect(cleanLcId("1.94526E+12")).toBe("1945260000000");
    expect(cleanLcId("3.05326E+11")).toBe("305326000000");
    expect(cleanLcId("1013260000000")).toBe("1013260000000");
  });

  // 3. Branch Code Leading Zero Trimming
  it("removes leading zeroes from ADS branch codes while preserving legitimate identifiers", () => {
    const cleanBranchCode = (val: any): string => {
      if (val === null || val === undefined) return "";
      let str = String(val).trim();
      if (/^\d+$/.test(str)) {
        str = str.replace(/^0+(?=\d)/, "");
        return str || "0";
      }
      return str;
    };

    expect(cleanBranchCode("00000201")).toBe("201");
    expect(cleanBranchCode("00001421")).toBe("1421");
    expect(cleanBranchCode("001")).toBe("1");
    expect(cleanBranchCode("3085")).toBe("3085");
    expect(cleanBranchCode("0")).toBe("0");
  });

  // 4. Currency and Value Parsing
  it("parses numeric LC values and cleans currency symbols and commas", () => {
    const parseNumeric = (val: any): string => {
      if (val === null || val === undefined || val === "") return "0";
      const cleaned = String(val).replace(/[^0-9.-]/g, "").trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? "0" : num.toFixed(2);
    };

    expect(parseNumeric("$14,336.19")).toBe("14336.19");
    expect(parseNumeric("2,057.00")).toBe("2057.00");
    expect(parseNumeric("24,442.50 USD")).toBe("24442.50");
    expect(parseNumeric("")).toBe("0");
    expect(parseNumeric(null)).toBe("0");
  });
});
