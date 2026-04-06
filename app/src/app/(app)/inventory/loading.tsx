export default function InventoryLoading() {
  return (
    <>
      <div className="flex items-center justify-between mb-4"><div className="skeleton h-7 w-16" /><div className="skeleton w-11 h-11 rounded-xl" /></div>
      <div className="skeleton h-12 rounded-xl mb-4" />
      <div className="flex gap-2 mb-5">{[60,80,50].map((w,i) => <div key={i} className="skeleton h-10 rounded-xl" style={{ width: w }} />)}</div>
      <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
    </>
  )
}
