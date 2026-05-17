/**
 * =============================================================================
 * ADMIN DASHBOARD PAGE — Server Component entry point
 * =============================================================================
 *
 * WHY IS THIS SO SIMPLE?
 * ----------------------
 * In Next.js App Router, `page.tsx` is a Server Component by default.
 * It's the "entry point" for the route `/admin/dashboard`.
 *
 * We keep it minimal because:
 *   1. The actual UI is in AdminDashboardClient (a Client Component)
 *   2. Client Components need "use client" for interactivity (useState, etc.)
 *   3. This server page COULD do auth checks and data fetching, but we're
 *      using mock data, so it just renders the client component
 *
 * WHEN YOU CONNECT TO A DATABASE LATER:
 * You'd add auth checks and data fetching here (in the server component),
 * then pass the data as props to AdminDashboardClient.
 */

import AdminDashboardClient from './AdminDashboardClient'

export default function AdminDashboard() {
  return <AdminDashboardClient />
}
