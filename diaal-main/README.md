# DILAAL — Verified Real Estate & Asset Marketplace

> **Production-Oriented Architecture, Internationalization, and Compliance Master Document**

---

## 1. System Overview & Philosophy

**DILAAL** (*Dilaal = Broker/Agent*) is an evidence-based marketplace for residential properties, land/plots, commercial real estate, rentals, and certified automotive assets across both regional hubs (Mogadishu, Hargeisa, Garowe, Nairobi) and global diaspora corridors (UK, UAE, US, Turkey).

### Core Engineering Principles
1. **Evidence-Based Trust Over Visual Claims:** The platform never makes claims of "100% sovereign guarantee" or "absolute fraud elimination". Badges reflect specific audited records (e.g., Banadir Regional Land Registry filing, ArdhiSasa survey coordinate clearance, Customs duty clearance) with auditor names, reference dates, and explicit caveats.
2. **Internationalization From Inception:** The data architecture is not hardcoded to one country, one currency, or one legal system. It supports ISO 4217 multi-currency conversion (USD, EUR, GBP, AED, KES, SOS, SLSH, TRY), configurable units ($m^2$ vs $sqft$), and trilingual localization (English, Somali, Arabic with native RTL text direction).
3. **Privacy & Google Play Policy Alignment:** Complete in-app Data Safety declarations, machine-readable data export, and self-service account/data purging matching GDPR and Google Play Store developer requirements.

---

## 2. Feature Inventory: Reality & Operational Matrix

| Feature | Implementation Status | Operating Mode | Production Requirements |
| :--- | :--- | :--- | :--- |
| **Discovery & Search Feed** | **100% Real** | Live / Persistent | Fully responsive across mobile, tablet, and desktop |
| **Interactive Map Cartography** | **100% Real** | Live vector canvas | Supports custom coordinate pins, floating detail cards, and zoom/pan simulation |
| **Trilingual Localization** | **100% Real** | Live | English, Somali, and Arabic with automatic `dir="rtl"` layout |
| **Multi-Currency Engine** | **100% Real** | Live | Dynamic conversion using ISO 4217 codes and indicative reference rates |
| **Title Deed Audit Modal** | **100% Real** | Evidence-based | Displays issuing authority, auditor name, reference PDF, and legal disclosure |
| **Listing Report & Moderation** | **100% Real** | In-app Queue | Users can report fake listings, disputes, or pricing discrepancies |
| **Reviewer & Compliance Hub** | **100% Real** | Role-protected | Allows compliance review to approve, request proof, or reject listings |
| **Support & Dispute Center** | **100% Real** | In-app Desk | Ticket opening, real-time replies, and safety rules |
| **Data Export & Account Purge** | **100% Real** | In-app Self-Service | JSON data export and complete local data wiping |
| **Transaction Milestone Tracker** | **Demonstration Mode** | **Sandbox Pilot** | Milestone advancement requires recorded evidence notes |
| **Payment & Custody Rail** | **Demonstration Mode** | **Sandbox Simulator** | **Production requires:** Registered banking institution or licensed trust provider agreement |

---

## 3. Role-Based Access Architecture

The system enforces distinct perspectives and privilege scopes:

* **Guest (Read Only):** Can browse public listings, filter by price and category, inspect public title audit details, and view broker ratings. Cannot submit offers, chat with brokers, or access the deal tracker.
* **Buyer / Investor:** Can save favorites, set saved search alerts, open encrypted broker inquiry threads, submit formal offers, and participate in transaction milestone tracking.
* **Property Owner / Seller:** Can submit new listings with title deed documentation for audit review, respond to inquiries, and review buyer escrow offers.
* **Licensed Broker:** Can manage active portfolio listings, issue formal counter-proposals in chat, send voice memos, and coordinate physical site visits.
* **Compliance Reviewer / Admin:** Protected administrative dashboard to audit deed evidence, review fraud reports, reject non-compliant listings, and inspect immutable system audit logs.

---

## 4. Google Play Release & Android Deployment Checklist

Before building the production Android App Bundle (`.aab`):

### 1. Store Listing & Metadata
- [x] Package Name configured (e.g. `market.dilaal.app`)
- [x] High-contrast 512x512 app icon & 1024x500 feature graphic prepared
- [x] Accurate app description: No false claims of government ownership or unconditional financial guarantees
- [x] Honest screenshots from actual device viewports (Phone & 7"/10" Tablet)

### 2. Data Safety & Privacy Declarations
- [x] Privacy Policy hosted and linked in the Google Play Console
- [x] Data collection declared: User-provided inquiry messages, listing photos, and local device preferences
- [x] Data sharing declared: No user data is sold to third parties or advertising networks
- [x] **Account Deletion URL & In-App Path:** Implemented in `LegalPrivacyScreen.tsx` with one-click data purge

### 3. Permissions & Security
- [x] Minimal runtime permissions (No unnecessary background location, contact list, or SMS permissions)
- [x] Target API level complies with current Google Play requirements (Target SDK 34 / 35+)
- [x] HTTPS enforced for all network calls
- [x] Secrets excluded from client source code and bundle

### 4. Financial & Real Estate Policy
- [x] Escrow tracker clearly disclosed as a sandbox demonstration / milestone tracker
- [x] Real money movement disabled until licensed banking partner is onboarded and KYC/AML procedures are filed

---

## 5. Development & Build Instructions

### Prerequisites
* Node.js v18+ or v20+
* npm or bun

### Commands
```bash
# Install dependencies
npm install

# Run local development server (port 3000 full-stack Express + Vite)
npm run dev

# Run TypeScript typecheck / linter
npm run lint

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 6. Backend API Suite & Security Baseline

The application runs a secure Node.js Express server (`server.ts`) implementing server-side validation and role boundaries:

* `GET /api/health`: System health check, active payment rails, and compliance metrics.
* `POST /api/listings`: Validates mandatory title length (>=5 chars), category verification, price boundaries (>0), and creates an immutable audit trail entry.
* `POST /api/verification/audit`: Enforces least-privilege boundary (only `reviewer` or `admin` can set verification outcomes to `approved`, `rejected`, or `more_info_required`).
* `POST /api/offers`: Server-side state machine for negotiations (`submit`, `counter`, `accept`, `decline`) with version stamping.
* `POST /api/escrow/milestone`: Sandboxed transaction milestone manager enforcing transparent disclaimer notice and audit trail logging.
* `POST /api/reports`: Safety report submission queue with category classification.
* `POST /api/account/export`: Machine-readable user data export endpoint.
* `POST /api/account/purge`: Irreversible data purge endpoint requiring explicit `'DELETE'` confirmation payload.

---

## 7. Deliverables & Production Launch Readiness

### Completed Items
* ✅ Multi-jurisdiction catalog supporting Somalia (`SO`), Kenya (`KE`), UAE (`AE`), UK (`GB`), USA (`US`), and Turkey (`TR`).
* ✅ Full-stack Express backend with server-side validation and security boundaries.
* ✅ Multi-step listing creation wizard (5 steps) with real image handling and step validation.
* ✅ Truthful sandbox escrow model with downloadable cryptographic audit proofs and zero misleading sovereign claims.
* ✅ In-app compliance & reviewer dashboard with audit log tracking and report moderation.
* ✅ In-app GDPR / Play Store data export & one-click account purge workflow.
* ✅ Clean TypeScript build with zero lint errors and tested API endpoints.

### Items Requiring Owner Accounts / External Legal Authorization
1. **Commercial Escrow & Banking Partner:** Formal trust agreement with a licensed commercial bank in the target jurisdiction before switching `ESCROW_MODE=sandbox` to production live money custody.
2. **Google Play Console Developer Account:** App listing publication, content rating questionnaire, and Data Safety form submission based on the declared inventory.
3. **SMS Gateway / Twilio Credentials:** If transition from instant sandbox OTP verification to telco-carrier SMS is required.

