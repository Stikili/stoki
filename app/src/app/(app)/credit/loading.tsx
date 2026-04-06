export default function CreditLoading() {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="skeleton h-7 w-32" />
        <div className="skeleton w-10 h-10 rounded-full" />
      </div>
      <div className="skeleton rounded-3xl h-28 mb-5" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="skeleton h-5 w-32 mb-1.5" />
                <div className="skeleton h-4 w-24" />
              </div>
              <div className="skeleton h-7 w-20 ml-3" />
            </div>
            <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="skeleton h-9 flex-1 rounded-xl" />
              <div className="skeleton h-9 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
