# HunarHub — Digital Marketplace for Local Micro-Entrepreneurs

[![Build & Test Status](https://img.shields.io/badge/E2E%20Tests-55%20Passing-brightgreen)](backend/test_all_workflows.js)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20PostGIS-blue)](backend/database/schema.sql)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61dafb)](frontend)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](backend)

**HunarHub** is an end-to-end digital marketplace designed to economically empower local micro-entrepreneurs and traditional tradespeople—specifically **Cobblers, Potters (Kumhars), Tailors, Artisans/Handicrafts, and Local Small Vendors**—by connecting them directly with urban customers for services, custom craft commissions, and handmade physical goods.

---

## Live Deployments

- **Frontend (Production):** [https://hunarhub-frontend-seven.vercel.app](https://hunarhub-frontend-seven.vercel.app/)
- **Backend (Production API):** [https://hunarhub-backend-sandy.vercel.app](https://hunarhub-backend-sandy.vercel.app/)

---

## Key Features & Role-Based Access Control (RBAC)

HunarHub enforces strict server-side role-based authorization across three distinct personas:

### 1. Customer (`CUSTOMER`)
- **Discovery & Search:** Real-time search across verified artisans, physical products, and on-demand services with filters for category, city, price range, and rating.
- **Doorstep & Custom Service Requests:**
  - Direct booking of fixed-price or hourly artisan services with date/time scheduling.
  - Open custom quote requests where local artisans can bid with estimated price and delivery timeline.
- **Multi-Vendor Cart & Checkout:** Persistent multi-item cart with automatic 5% GST tax calculation and flat delivery fee, featuring atomic stock deduction and row-level locking (`FOR UPDATE`).
- **Payments:** Seamless checkout with Razorpay SDK or fallback to Direct UPI / Cash on Delivery (no mock or fake payment signatures).
- **Communication:** Secure in-app direct messaging with artisans regarding bookings, custom orders, or trade inquiries.
- **Verified Feedback & Disputes:** Submit 1-to-5 star reviews exclusively on completed jobs; raise structured complaints with status tracking.

### 2. Micro-Entrepreneur (`ENTREPRENEUR`)
- **Verification Gate:** Newly registered entrepreneurs enter `PENDING` verification status and are hidden from public discovery until verified by an Admin.
- **Artisan Showcase & Profile:** Manage workshop address, geolocation coordinates (PostGIS), business bio, years of experience, and portfolio gallery.
- **Catalog Management:** Add, edit, and toggle services and physical products with inventory stock levels.
- **Order State Machine:** Manage physical orders through safe state transitions:  
  `PENDING` ➔ `PROCESSING` ➔ `READY` ➔ `COMPLETED` (or `CANCELLED`).
- **Service Request Management:** Review incoming bookings and open quote leads:  
  `PENDING` ➔ `ACCEPTED` ➔ `IN_PROGRESS` ➔ `COMPLETED`.
- **Live Analytics:** Track genuine gross revenue, completed jobs, active customer orders, and verified average rating derived directly from customer reviews.

### 3. Administrator (`ADMIN`)
- **Strict Role Protection:** Admin accounts cannot be created via public registration APIs.
- **Artisan KYC & Verification:** Review pending artisan applications and approve or reject profiles.
- **Taxonomy Governance:** Create, update, or remove marketplace categories and craft skills.
- **Dispute Resolution:** Review customer complaints, investigate order/service contexts, and mark complaints `RESOLVED` or `REJECTED` with administrative notes.
- **Platform Analytics:** Real-time database metrics covering aggregate marketplace volume, average order value, active artisan counts, and monthly revenue trends.

---

## Tech Stack & Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │              HunarHub Frontend (React 19)              │
               │  Vite · React Router · Lucide Icons · Tailwind/CSS3   │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                     HTTPS │ /api/*
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │           HunarHub Backend API (Node.js/Express)       │
               │  JWT Auth · Role Guards · Atomic Transactions (ACID)   │
               └─────────────┬────────────────────────────┬─────────────┘
                             │                            │
                             ▼                            ▼
              ┌───────────────────────────┐   ┌───────────────────────────┐
              │  Neon Cloud PostgreSQL   │   │     Razorpay Gateway      │
              │  PostGIS Geolocation      │   │  (Standard Web Checkout)  │
              │  Normalized Schema        │   └───────────────────────────┘
              │  Performance Indexes      │
              └───────────────────────────┘
```

- **Frontend:** React 19, Vite, React Router 7, Lucide Icons, Custom Responsive CSS.
- **Backend:** Node.js, Express.js REST API with standardized `/api` canonical routing.
- **Database:** PostgreSQL (Neon Serverless) with PostGIS extension for spatial queries.
- **Security:** JWT authentication, bcrypt password hashing, parameterized SQL queries preventing SQL injection, strict CORS policies, role-based middleware guards.
- **Data Integrity:** ACID-compliant database transactions (`withTransaction`) for orders, inventory reservations, and rating recalculation.

---

## Project Structure

```text
HunarHub/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPortal.jsx           # Admin governance & KYC verification
│   │   │   ├── ArtisanMapView.jsx        # Geolocation map of local artisans
│   │   │   ├── ArtisanProfileModal.jsx   # Artisan portfolio, skills & reviews modal
│   │   │   ├── CartPage.jsx              # Multi-vendor cart with GST calculation
│   │   │   ├── CustomerPortal.jsx        # Customer order & booking management
│   │   │   ├── EntrepreneurPortal.jsx    # Artisan dashboard & inventory management
│   │   │   ├── Marketplace.jsx           # Main discovery & search catalog
│   │   │   └── QuoteWizardModal.jsx      # Custom artisan quote bidding wizard
│   │   ├── services/
│   │   │   └── api.js                    # Canonical centralized API client
│   │   ├── App.jsx                       # Routing & role authorization guards
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   │   └── db.js                         # PostgreSQL connection pool configuration
│   ├── controllers/                      # Business logic controllers
│   │   ├── authController.js             # Registration & JWT authentication
│   │   ├── orderController.js            # Stock-safe orders & status transitions
│   │   ├── serviceRequestController.js   # Service bookings & quote bids
│   │   ├── reviewController.js           # Verified review & rating recalculation
│   │   ├── messageController.js          # Direct chat & participant authorization
│   │   ├── adminController.js            # KYC approval & dispute resolution
│   │   └── ...
│   ├── database/
│   │   └── schema.sql                    # Full PostgreSQL DDL schema & indexes
│   ├── middleware/
│   │   └── auth.js                       # JWT verification & role authorization
│   ├── routes/                           # Express modular routers
│   ├── utils/
│   │   ├── http.js                       # Standardized HTTP error helpers
│   │   └── transaction.js                # Database transaction wrapper
│   ├── app.js                            # Express app entry & CORS configuration
│   ├── server.js                         # Server listener
│   └── test_all_workflows.js             # Comprehensive 55-test E2E test suite
│
├── AUDIT.md                              # Comprehensive production audit matrix
├── IMPLEMENTATION_REPORT.md              # Detailed implementation & verification report
└── README.md
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=8080
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://hunarhub-frontend-seven.vercel.app

# Optional Razorpay API credentials
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Frontend Configuration (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080

# Optional Razorpay client key ID
VITE_RAZORPAY_KEY_ID=
```

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher) with PostGIS extension

### 2. Clone Repository
```bash
git clone https://github.com/Pratik-Devadhe/HunarHub-Digital-Marketplace-for-Local-Micro-Entrepreneurs.git
cd HunarHub-Digital-Marketplace-for-Local-Micro-Entrepreneurs
```

### 3. Setup Backend
```bash
cd backend
npm install
# Configure backend/.env with your DATABASE_URL and JWT_SECRET
npm start
```
The backend will be available at `http://localhost:8080` (or `PORT`).

### 4. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.

---

## Running Verification & End-to-End Tests

The backend includes a comprehensive automated test suite testing all core marketplace workflows end-to-end against the database:

```bash
cd backend
node test_all_workflows.js
```

### Coverage (54 Automated Tests):
1. **Canonical API Routing:** `/api` routing prefix enforcement and health checks.
2. **Public Discovery:** Category/skill taxonomy, city and price-range search filtering.
3. **Authentication & RBAC:** Customer, Entrepreneur, and Admin login; privilege escalation protection.
4. **Artisan KYC Gate:** `PENDING` visibility quarantine until Admin KYC approval.
5. **Skills Management:** Dynamic portfolio skill addition and deletion.
6. **Stock Concurrency & Orders:** Atomic inventory decrement, oversell prevention (`409`), order fulfillment state transitions.
7. **Service Bookings & State Machine:** Direct booking lifecycle, cancellation constraints, invalid status transition protection.
8. **Reviews & Rating Derivation:** Verified customer review submission, duplicate prevention (`409`), dynamic average rating recalculation.
9. **Disputes & Governance:** Customer complaint ticketing, administrative dispute resolution.
10. **Taxonomy Management:** Category creation and deletion.
11. **Chat Security:** Self-messaging prevention, customer-artisan inquiries, participant authorization on private jobs.
12. **Cart Math & Favorites:** Tax calculation (5% GST), deduplicated favorites with unique constraints.

---

## Production Audit

For a granular record of all audited architectural items, root cause analyses, and solutions, refer to [AUDIT.md](AUDIT.md).

---

## Author

**Pratik Devadhe**  
- GitHub: [@Pratik-Devadhe](https://github.com/Pratik-Devadhe)  
- Repository: [HunarHub-Digital-Marketplace-for-Local-Micro-Entrepreneurs](https://github.com/Pratik-Devadhe/HunarHub-Digital-Marketplace-for-Local-Micro-Entrepreneurs)
