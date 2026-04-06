export default function CreditLoading() {
  return (
    <>
      <div className="flex items-center justify-between mb-4"><div className="skeleton h-7 w-32" /><div className="skeleton w-11 h-11 rounded-xl" /></div>
      <div className="skeleton rounded-2xl h-28 mb-4" />
      <div className="skeleton h-12 rounded-xl mb-4" />
      <div className="flex flex-col gap-2">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
    </>
  )
}
