import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="w-full bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">ResQ</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/transparency" className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors hidden sm:block">
            Public Ledger
          </Link>
          <Link href="/login" className="bg-gray-900 text-white hover:bg-gray-800 font-medium px-4 py-2 rounded-md text-sm transition-colors shadow-sm">
            Staff Portal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center max-w-5xl mx-auto py-20">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
          Accountability through <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Cryptography</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mb-10 leading-relaxed">
          ResQ ensures 100% transparent, double-spend-proof aid distribution using cryptographic identity hashing and public ledger technology. No PII is stored. No aid is lost.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/transparency" className="bg-blue-600 text-white hover:bg-blue-700 font-bold px-8 py-4 rounded-lg text-lg transition-colors shadow-md flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            View Transparency Portal
          </Link>
          <Link href="/login" className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 font-bold px-8 py-4 rounded-lg text-lg transition-colors shadow-sm flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
            Authorized Personnel Login
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 text-sm border-t border-gray-200">
        &copy; {new Date().getFullYear()} ResQ Disaster Management System. For demonstration purposes only.
      </footer>
    </main>
  )
}
