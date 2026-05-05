"use client"

import { useActionState } from 'react'
import { registerBeneficiary } from '../actions/register'

export default function TestRegPage() {
  const [state, formAction, isPending] = useActionState(registerBeneficiary, null)

  return (
    <main className="p-8">
      <form action={formAction} className="flex flex-col gap-4 max-w-sm">
        <input type="text" name="national_id" placeholder="National ID" required />
        <input type="hidden" name="source" value="WEB_PUBLIC" />
        <input type="text" name="region" placeholder="Region" />

        <button type="submit" disabled={isPending} className="bg-blue-500 text-white p-2 disabled:opacity-50">
          {isPending ? 'Registering...' : 'Register'}
        </button>

        {/* Display the returned message if it exists */}
        {state?.message && (
          <p className={state.status === 'error' ? 'text-red-500' : 'text-green-500'}>
            {state.message}
          </p>
        )}
      </form>
    </main>
  )
}
