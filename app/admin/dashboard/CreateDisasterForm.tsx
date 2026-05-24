"use client"

/**
 * =============================================================================
 * CREATE DISASTER FORM — Restyled for dark glassmorphic theme
 * =============================================================================
 *
 * KEY PATTERN: useActionState (React 19)
 * ----------------------------------------
 * `useActionState` is a React 19 hook for form submissions.
 * It gives you: [state, formAction, isPending]
 *   - state: the return value of your action (starts as initialState)
 *   - formAction: a function to pass to <form action={...}>
 *   - isPending: true while the action is running
 *
 * Since we're NOT connecting to the database, we use a local mock action.
 */

import { useState } from 'react'
import { createDisaster } from '@/app/actions/data'
import { type DisasterEvent } from './mock-data'

interface Props {
  onSuccess?: (disaster: DisasterEvent) => void
}

export default function CreateDisasterForm({ onSuccess }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [result, setResult] = useState<{ status: string; message: string } | null>(null)
  const REGIONS = [
    'NCR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region V',
    'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X',
    'Region XI', 'Region XII', 'CAR', 'BARMM',
  ]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setResult(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await createDisaster(formData)
      setResult({ status: res.status, message: res.message })
      if (res.status === 'success') {
        form.reset()
        // Call the parent callback to update dashboard
        if (onSuccess && res.disaster) {
          onSuccess(res.disaster as DisasterEvent)
        }
      }
    } catch (err: any) {
      console.error(err)
      setResult({ status: 'error', message: err?.message || 'Failed to communicate with server.' })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
      <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Deploy Disaster Campaign</h2>
          <p className="text-xs text-slate-500">Create a new relief operation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <div>
          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            Official Name
          </label>
          <input
            type="text"
            name="name"
            placeholder="e.g. Typhoon Odette"
            required
            className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white placeholder-slate-600 px-3 py-2.5 outline-none focus:border-blue-500/40 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            Eligible Region (Geofence)
          </label>
          <select
            name="region"
            className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white px-3 py-2.5 outline-none focus:border-blue-500/40 transition-colors appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>
            ))}
          </select>
        </div>

        {/* Campaign Window */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              Start Date &amp; Time
            </label>
            <input
              type="datetime-local"
              name="starts_at"
              className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white px-3 py-2.5 outline-none focus:border-blue-500/40 transition-colors [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              End Date &amp; Time <span className="normal-case font-normal text-slate-600">(optional)</span>
            </label>
            <input
              type="datetime-local"
              name="ends_at"
              className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white px-3 py-2.5 outline-none focus:border-blue-500/40 transition-colors [color-scheme:dark]"
            />
            <p className="mt-1 text-[10px] text-slate-600">Leave blank for open-ended — event auto-closes on end date</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`w-full relative overflow-hidden rounded-xl py-3 text-sm font-bold tracking-wide uppercase transition-all duration-300 mt-2 ${!isPending
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-gradient-to-r from-red-600 to-rose-600 text-white/80 cursor-wait'
            }`}
        >
          <span className="relative flex items-center justify-center gap-2">
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deploying...
              </>
            ) : (
              'Deploy Campaign'
            )}
          </span>
        </button>

        {result && (
          <div className={`px-4 py-3 rounded-xl text-xs font-medium flex items-start gap-2 ${result.status === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {result.message}
          </div>
        )}
      </form>
    </div>
  )
}
