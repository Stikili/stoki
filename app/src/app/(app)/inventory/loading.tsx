export default function InventoryLoading() {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="skeleton h-7 w-16" />
        <div className="skeleton w-10 h-10 rounded-full" />
      </div>
      <div className="flex gap-2 mb-5">
        {[80, 96, 110].map((w, i) => <div key={i} className="skeleton h-8 rounded-full" style={{ width: w }} />)}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-6 w-16 rounded-full ml-3" />
            </div>
            <div className="flex items-center gap-3 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="skeleton h-5 w-14" />
              <div className="skeleton h-4 w-10" />
              <div className="skeleton h-7 w-16 rounded-full ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
