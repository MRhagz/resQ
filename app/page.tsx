import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* ===== Background — unified dark theme ===== */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950" />
      <div
        className="fixed inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                            radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                            radial-gradient(ellipse at 50% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 50%)`,
        }}
      />
      {/* Floating orbs */}
      <div className="fixed top-1/4 left-1/6 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-1/3 right-1/4 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="fixed top-2/3 left-1/2 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* ===== Content ===== */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <nav className="border-b border-white/[0.06] backdrop-blur-xl bg-black/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white tracking-tight">ResQ</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-5">
                <Link
                  href="/transparency"
                  className="text-slate-400 hover:text-white font-medium text-sm transition-colors hidden sm:block"
                >
                  Public Ledger
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.15] hover:border-white/[0.2] transition-all duration-200 backdrop-blur-sm shadow-lg shadow-black/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Staff Portal
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center max-w-5xl mx-auto py-16 sm:py-24">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-300 tracking-wide uppercase">
              System Operational
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
            Accountability through{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
              Cryptography
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mb-12 leading-relaxed">
            ResQ ensures 100% transparent, double-spend-proof aid distribution using
            cryptographic identity hashing and public ledger technology. No PII is
            stored. No aid is lost.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/transparency"
              className="group relative overflow-hidden inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="relative">View Transparency Portal</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-base font-bold hover:bg-white/[0.08] hover:border-white/[0.2] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Authorized Personnel Login
            </Link>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-16">
            {[
              { icon: '🔐', label: 'Zero-Knowledge Identity' },
              { icon: '📊', label: 'Public Audit Trail' },
              { icon: '⚡', label: 'Real-Time Distribution' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
              >
                <span className="text-sm">{feature.icon}</span>
                <span className="text-xs font-medium text-slate-400">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-4 py-6 border-t border-white/[0.04] text-center">
          <p className="text-[11px] text-slate-600">
            &copy; {new Date().getFullYear()} ResQ Disaster Management System. For demonstration purposes only.
          </p>
        </footer>
      </div>
    </main>
  )
}
