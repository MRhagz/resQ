# ResQ

**Accountability through cryptography.** ResQ is a decentralized disaster-relief aid distribution platform that turns every approval, distribution, and reconciliation event into a verifiable on-chain record — without ever storing personal information about the people it serves.

> _For demonstration purposes only._

---

## What ResQ Does

Traditional disaster aid suffers from two problems: **duplicate distribution** (the same person collects the same aid twice across agencies) and **opaque accounting** (donors and the public have no way to verify aid reached its intended recipients). ResQ addresses both:

- **Zero-PII registry** — Beneficiaries are registered by scanning their PhilSys (Philippine national ID) QR code. The national ID is immediately hashed with a server-side salt; only the hash is stored. The plaintext PhilSys number never touches the database.
- **On-chain identity** — Each verified beneficiary is bound to a Cardano identity NFT (CIP-25) minted to a custodial wallet derived for them.
- **Claim stubs as tokens** — When an admin approves aid for a beneficiary, a claim-stub token is minted on-chain. When a field worker distributes the aid, the stub is burned. Double-spending is impossible because the token can only be burned once.
- **Public transparency portal** — Anyone can audit the full ledger of mints and burns at `/transparency`, with no login required.

### Roles

| Role | Capabilities |
| --- | --- |
| **Super admin** (agency) | Creates disaster events, approves beneficiaries, mints claim stubs |
| **Relief worker** (field) | Scans beneficiary QR codes, redeems (burns) claim stubs at distribution points |
| **Public** | Views the transparency ledger at `/transparency` |

### Architecture at a glance

```
Next.js 16 (App Router, Server Actions)
    ├── Supabase (Auth + Postgres, RLS-enforced)   ← source of truth
    ├── Cardano testnet via Blockfrost + MeshSDK   ← audit trail
    └── Local KMS (encrypted keystore.enc.json)    ← signing boundary
```

The Supabase database is the operational source of truth; the blockchain is the immutable audit trail. Private keys never leave the KMS — server actions request signatures by key index (e.g. `system:master`), and the KMS returns only the witness.

---

## Tech Stack

- **Framework** — Next.js 16 (App Router, React 19, Server Actions)
- **Styling** — Tailwind CSS 4, shadcn/ui, Base UI
- **Backend** — Supabase (Postgres + Auth + RLS)
- **Blockchain** — Cardano (preview/preprod testnet) via MeshSDK + Blockfrost
- **Key management** — Local KMS provider with AES-encrypted keystore
- **QR scanning** — `@yudiel/react-qr-scanner`

---

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 20+** and a package manager (`npm`, `pnpm`, or `bun` — this repo includes both `package-lock.json` and `bun.lock`)
2. **A Supabase project** (free tier is fine) — <https://supabase.com>
3. **A Blockfrost account** with a **preview testnet** project — <https://blockfrost.io>
4. **A Cardano testnet wallet mnemonic** (24 words) funded with test ADA from the [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
5. **`openssl` or Node.js** (for generating the KMS master key)

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url> resq
cd resq
npm install     # or: bun install
```

### 2. Set up Supabase

Create a new Supabase project, then apply the schema from `supabase/migrations/` in order:

- `20260506032300_initial_schema.sql` — tables, sequences, indexes
- `20260506032305_rls_policies.sql` — row-level security
- `20260522205112_campaign_datetime.sql` — schema updates

You can run them via the Supabase SQL editor or the Supabase CLI:

```bash
supabase db push
```

From your Supabase project settings, grab:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon / publishable key` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)

### 3. Generate a KMS master key

This is the AES key that encrypts the local keystore. **Generate a fresh one — do not reuse the example value.**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Create your `.env`

Copy the template and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# Hashing salt for PhilSys IDs (server-only — never expose, never change after registrations exist)
SYSTEM_HASH_SALT="generate-a-long-random-string"

# Cardano / Blockfrost
NETWORK=preview
BLOCKFROST_API_KEY="previewXXXXXXXXXXXXXXXXXXXXXXXXXX"
WALLET_MNEMONIC="word1 word2 word3 ... word24"
SYSTEM_POLICY_ID=""   # leave empty on first run; the app derives it

# KMS
KMS_PROVIDER=local
KMS_MASTER_KEY="<the 64-char hex string from step 3>"
```

### 5. Bootstrap the KMS

Extract the system signing key from your mnemonic and store it encrypted in `keystore.enc.json`:

```bash
node --env-file=.env lib/kms/bootstrap.js
```

You should see:

```
✅ System signing key bootstrapped into KMS.
   Keystore file: keystore.enc.json
   Key index:     system:master
```

`keystore.enc.json` is git-ignored. If you lose `KMS_MASTER_KEY`, the keystore is unrecoverable.

### 6. Run the dev server

```bash
npm run dev     # or: bun dev
```

Open <http://localhost:3000>.

### 7. Create your first super admin

Sign up via `/login` and select the **super admin** role. You'll need to be added to a Supabase Auth user; the app then creates a `staff_profiles` row and asynchronously mints your staff identity NFT (you'll see a transaction hash appear on the dashboard once Blockfrost confirms it).

---

## Wallet & Network Setup

ResQ uses a **custodial wallet model** — beneficiaries and staff do **not** install Nami, Eternl, Lace, or any browser wallet. There is nothing to "Connect Wallet" to. Instead:

- A single HD wallet (the **system wallet**) is derived from `WALLET_MNEMONIC` at account 0.
- Each staff member and beneficiary gets a unique address derived at an auto-incremented `wallet_index` from the same mnemonic.
- All signing happens server-side through the KMS — the mnemonic itself only lives in `.env`, and the derived signing key is stored encrypted in `keystore.enc.json`.

### Funding the system wallet

The system wallet pays all transaction fees and holds the minting policy. Before you can mint anything, send test ADA to its base address (account 0, key 0).

To find the address, start the dev server and visit any admin/worker action that triggers an on-chain call — the address will appear in the server logs. Then top it up at the [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/) (~10,000 tADA is plenty for hundreds of mints).

### Network

| Setting | Value |
| --- | --- |
| Network | `preview` (default) or `preprod` |
| Provider | Blockfrost (matching project type — preview vs. preprod) |
| Policy | Derived per-deployment from the system wallet's key hash; the policy ID is auto-populated into `SYSTEM_POLICY_ID` on first use |

**Do not run this on mainnet.** All scripts, addresses, and policies in this repo are configured for testnet.

---

## Project Structure

```
app/
  page.tsx              — public landing page
  login/                — auth (super admin + relief worker signup/login)
  admin/dashboard/      — disaster events, beneficiary approvals, stub minting
  worker/dashboard/     — QR scan, distribution flow, lock-in sessions
  transparency/         — public on-chain ledger view
  actions/              — Next.js server actions (admin, worker, auth, tokens, wallets…)
lib/
  blockchain/           — Mesh + Cardano: wallet derivation, mint/burn, policies
  kms/                  — KMS interface + local encrypted-keystore provider
  supabase/             — Supabase client helpers
supabase/migrations/    — SQL schema and RLS policies
utils/philsys.ts        — PhilSys QR parser
```

---

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
```

---

## Security Notes

- `keystore.enc.json`, `.env`, and the system mnemonic are sensitive — they are all git-ignored and must never be committed.
- `SYSTEM_HASH_SALT` is part of the beneficiary ID hash. **Changing it after beneficiaries are registered will orphan every existing record.**
- The `service_role` Supabase key bypasses RLS. It is used only inside server actions and must never reach the browser bundle.
