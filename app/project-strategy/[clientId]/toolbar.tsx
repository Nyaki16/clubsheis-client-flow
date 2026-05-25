'use client'

export function BriefToolbar({ clientId }: { clientId: string }) {
  return (
    <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur border border-stone-200 rounded-2xl shadow-lg px-3 py-2">
      <a
        href={`/client/${clientId}`}
        className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
      >
        ← Back to flow
      </a>
      <button
        onClick={() => window.print()}
        className="text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 px-4 py-2 rounded-lg transition-colors cursor-pointer"
      >
        Export PDF
      </button>
    </div>
  )
}
