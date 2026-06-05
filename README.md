# Tathep Ad Genius — Smart DOOH CRM 👁️

CRM/Sales OS สำหรับแพลตฟอร์ม Smart DOOH ของตาเทพ — จัดการ Leads → Accounts →
Pipeline, ค้นหา lead ด้วย AI (Google Maps), วางแผน Brand Activations (DOOH +
Influencer) พร้อม AI insights และผู้ช่วย Sales OS AI

Stack: **TanStack Start** (SSR) · React 19 · Vite · Tailwind v4 · **Supabase**
(Postgres) · OpenAI (gpt-4o) · Apify (Google Maps Scraper)

---

## โครงสร้างหลัก

- **Lead Intelligence** — AI Lead Finder (ดึงชื่อ/เบอร์จริงจาก Google Maps), Import
  Leads (CSV/วาง), Leads + Convert (Lead → Account + Contact + Opportunity)
- **CRM** — Accounts, Pipeline (drag-drop deals), Contacts, Activities
- **Campaigns** — Influencers, Billboard Inventory, Brand Activations (campaign OS 9 แท็บ)
- **Sales OS AI** — ผู้ช่วยถาม-ตอบด้านขวา เห็นข้อมูล pipeline จริง

---

## ติดตั้ง & รัน

ต้องมี **Node 20+** และ **บัญชี Supabase** (ฟรีพอ)

```bash
git clone https://github.com/jsprettyhatesyou/tathep-ad-genius.git
cd tathep-ad-genius
npm install
```

### 1) ตั้งค่า environment

```bash
cp .env.example .env
```

แล้วเติมค่าใน `.env`:

| ตัวแปร | จำเป็น | เอาจากไหน |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Project Settings → API (server-only) |
| `OPENAI_API_KEY` | สำหรับฟีเจอร์ AI | platform.openai.com → API keys |
| `APIFY_API_TOKEN` | สำหรับดึงเบอร์จาก Google Maps | console.apify.com → Integrations |

> ⚠️ `.env` ถูก gitignore ไว้ ห้าม commit — `SERVICE_ROLE_KEY` มีสิทธิ์เต็มในฐานข้อมูล

### 2) สร้างตารางใน Supabase

เปิด **Supabase → SQL Editor** แล้วรันตามลำดับ:

1. `supabase/schema.sql` — ตารางหลักทั้งหมด (companies, contacts, deals, …)
2. ไฟล์ `supabase/migration_*.sql` ที่เหลือ (campaigns, leads, classification ฯลฯ)

### 3) ใส่ข้อมูลตัวอย่าง (ไม่บังคับ)

```bash
node --env-file=.env --experimental-strip-types scripts/seed.ts
```

### 4) รัน dev server

```bash
npm run dev
```

เปิด http://localhost:8080

---

## สคริปต์

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server (HMR) |
| `npm run build` | build สำหรับ production |
| `npm run preview` | ดู production build |
| `npm run lint` | ESLint |

---

## หมายเหตุ

- ฟีเจอร์ AI (Lead Finder, Sales OS AI, campaign insights) ต้องมี `OPENAI_API_KEY`
  ถ้าไม่ใส่ ส่วนอื่นยังใช้ได้ปกติ
- การดึง "เบอร์กลาง" ของลูกค้ามาจาก Google Maps จริงผ่าน Apify — ถ้าไม่ใส่
  `APIFY_API_TOKEN` หน้าจะขึ้น banner เตือนและข้ามการดึงเบอร์
