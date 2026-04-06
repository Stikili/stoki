export default function SalesLoading() {
  return (
    <>
      <div className="flex gap-2 mb-5">
        <div className="skeleton h-8 w-16 rounded-full" />
        <div className="skeleton h-8 w-36 rounded-full" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="skeleton h-5 w-40 mb-1.5" />
                <div className="skeleton h-4 w-20" />
              </div>
              <div className="skeleton h-7 w-16 ml-4" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
