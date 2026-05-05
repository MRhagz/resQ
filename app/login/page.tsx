"use client"

import { useActionState, useState } from 'react'
import { login, signup } from '../actions/auth'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  
  // Setup action states for both login and signup
  const [loginState, loginAction, isLoginPending] = useActionState(login, null)
  const [signupState, signupAction, isSignupPending] = useActionState(signup, null)

  const state = isLogin ? loginState : signupState
  const isPending = isLogin ? isLoginPending : isSignupPending
  const currentAction = isLogin ? loginAction : signupAction

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? 'ResQ System Login' : 'Create Staff Account'}
        </h1>

        <form action={currentAction} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="worker@resq.gov"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select name="role" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="relief_worker">Relief Worker</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 disabled:opacity-50 mt-4 font-semibold"
          >
            {isPending ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
          </button>

          {state?.message && (
            <div className={`p-3 rounded text-sm font-medium ${state.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {state.message}
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </main>
  )
}
