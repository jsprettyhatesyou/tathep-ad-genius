// Seller / issuer details printed on every quotation & invoice.
// Pure module (no secrets) — safe to import on client and server.
// Edit these constants to match Tathep's registered company info, or override
// any field via env (server reads process.env.* in documents.functions.ts).

export interface Issuer {
  name: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNo?: string;
  logoUrl?: string;
}

export const ISSUER: Issuer = {
  name: "บริษัท ตาเทพ เทคโนโลยี จำกัด (สำนักงานใหญ่)",
  taxId: "0125567026209",
  address:
    "เลขที่ 111 อาคารอัศวิน แอสเสท ชั้นที่ 7 ห้องเลขที่ AW41 หมู่ที่ 1 ตำบลอ้อมเกร็ด อำเภอปากเกร็ด จังหวัดนนทบุรี 11120",
  phone: "093-881-1181",
  email: "info@tathep.com",
  website: "www.tathep.com",
  bankName: "—",
  bankAccountName: "บริษัท ตาเทพ เทคโนโลยี จำกัด",
  bankAccountNo: "—",
  logoUrl: "",
};

// Merge env overrides (server-side only; falls back to the constants above).
export function resolveIssuer(env?: Record<string, string | undefined>): Issuer {
  const e = env ?? {};
  return {
    ...ISSUER,
    name: e.ISSUER_NAME || ISSUER.name,
    taxId: e.ISSUER_TAX_ID || ISSUER.taxId,
    address: e.ISSUER_ADDRESS || ISSUER.address,
    phone: e.ISSUER_PHONE || ISSUER.phone,
    email: e.ISSUER_EMAIL || ISSUER.email,
    website: e.ISSUER_WEBSITE || ISSUER.website,
    bankName: e.ISSUER_BANK_NAME || ISSUER.bankName,
    bankAccountName: e.ISSUER_BANK_ACCOUNT_NAME || ISSUER.bankAccountName,
    bankAccountNo: e.ISSUER_BANK_ACCOUNT_NO || ISSUER.bankAccountNo,
    logoUrl: e.ISSUER_LOGO_URL || ISSUER.logoUrl,
  };
}
