export default function SalesLoading() {
  return (
    <>
      <div className="flex gap-2 mb-5"><div className="skeleton h-10 w-20 rounded-xl" /><div className="skeleton h-10 w-24 rounded-xl" /></div>
      <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
    </>
  )
}
