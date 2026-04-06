export default function DashboardLoading() {
  return (
    <div className="px-5 pt-5 flex flex-col gap-5">
      <div><div className="skeleton h-7 w-40 mb-1" /><div className="skeleton h-4 w-24" /></div>
      <div className="skeleton rounded-2xl h-36" />
      <div className="skeleton rounded-2xl h-14" />
      <div className="skeleton rounded-2xl h-24" />
    </div>
  )
}
