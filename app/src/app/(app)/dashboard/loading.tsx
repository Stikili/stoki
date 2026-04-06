export default function DashboardLoading() {
  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="skeleton rounded-3xl h-36" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton rounded-2xl h-24" />
        <div className="skeleton rounded-2xl h-24" />
      </div>
      <div className="skeleton rounded-2xl h-32" />
      <div className="skeleton rounded-2xl h-48" />
    </div>
  )
}
