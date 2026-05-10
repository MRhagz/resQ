"use client"

import { useActionState } from 'react'
import { createDisasterEvent } from '../../actions/admin'

export default function CreateDisasterForm() {
  const [state, formAction, isPending] = useActionState(createDisasterEvent, null)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
      <h2 className="text-xl font-bold mb-4 border-b pb-2">Create New Disaster Event</h2>
      
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Official Name</label>
          <input 
            type="text" 
            name="name" 
            placeholder="e.g. Typhoon Odette"
            required 
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>



        <div>
          <label className="block text-sm font-medium text-gray-700">Eligible Region (Geofence)</label>
          <select name="region" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
            <option value="NCR">National Capital Region (NCR)</option>
            <option value="Region VII">Region VII (Central Visayas)</option>
            <option value="Region VIII">Region VIII (Eastern Visayas)</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full bg-red-600 text-white rounded-md py-2 px-4 hover:bg-red-700 disabled:opacity-50 mt-2 font-bold"
        >
          {isPending ? 'Deploying Campaign...' : 'Deploy Disaster Campaign'}
        </button>

        {state?.message && (
          <div className={`p-3 rounded text-sm font-medium ${state.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {state.message}
          </div>
        )}
      </form>
    </div>
  )
}
