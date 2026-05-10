# ResQ Disaster Relief System

ResQ is a modern, cryptographically secure, and highly transparent disaster relief distribution management system. It is designed to ensure zero-PII (Personally Identifiable Information) data handling while providing robust anti-duplication mechanisms to prevent "double-claiming" of relief aid during crisis events.

## Core Features

- **Transparency Ledger (`/transparency`)**: A public-facing portal displaying a real-time ledger of distributions. Demonstrates accountability using cryptographic identity hashing (ready for future blockchain node sync).
- **Super Admin Dashboard (`/admin/dashboard`)**: Secure portal for deploying new disaster campaigns (e.g., "Typhoon Odette"), managing active events, and issuing system-wide codes.
- **Relief Worker Dashboard (`/worker/dashboard`)**: High-speed, on-site distribution interface. Features a QR scanning simulation that enforces strict database-level unique constraints to physically prevent double-claiming of aid.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 & shadcn/ui (Clean, minimalist, basic UI)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security)

---

## Local Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Setup (Crucial)
The system relies heavily on Supabase Row Level Security (RLS) and PostgreSQL composite unique constraints to enforce business logic (like the anti-duplication ledger).

Execute the SQL scripts located in the `supabase/migrations/` directory in your Supabase SQL Editor:
1. `20260506initial_schema.sql` - Sets up the `staff_profiles`, `disaster_events`, `beneficiaries`, and `claims` tables.
2. `20260506rls_policies.sql` - Enforces strict data access rules (e.g., only Super Admins can close a disaster).

### 4. Create Staff Accounts
For the initial setup, you will need to manually assign staff roles:
1. Create a user via the Supabase Auth dashboard, or sign up via the app's `/login` page.
2. Open the Supabase Table Editor and navigate to the `staff_profiles` table.
3. Update the user's role to either `'super_admin'` or `'relief_worker'`.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## System Architecture Highlights

- **Zero-PII Accountability**: Beneficiaries are tracked using an `id_hash` (e.g., a hashed National ID) rather than their actual names. The system proves aid was distributed to a unique human without knowing who that human is.
- **Ledger Immutability**: The `claims` table utilizes a strict `UNIQUE(beneficiary_uuid, disaster_event_id, aid_type)` constraint. This pushes the anti-duplication logic directly down to the Postgres layer, making duplicate aid distributions impossible even during high-traffic network conditions.
