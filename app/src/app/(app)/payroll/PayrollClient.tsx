'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type Employee, type PayrollRun,
} from '@/domain/entities/employee'
import { ArrowLeft, Plus, UserPlus, Calculator, Download, Trash2 } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import {
  addEmployeeAction, archiveEmployeeAction, toggleEmployeeAction,
  runPayrollAction, finaliseRunAction,
} from './actions'

function fmtMoney(n: number) { return `R${n.toFixed(2)}` }
function fmtR0(n: number) { return `R${Math.round(n)}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtPeriod(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

const fieldStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '14px 16px',
  color: 'var(--foreground)',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
} as const

export default function PayrollClient({
  employees, runs, currentPeriod, currentRun,
}: {
  employees: Employee[]
  runs: PayrollRun[]
  currentPeriod: string
  currentRun: PayrollRun | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onAddEmployee(input: {
    name: string
    idNumber: string
    baseSalary: number
    hireDate: string
    uifEnrolled: boolean
  }) {
    startTransition(async () => {
      const res = await addEmployeeAction({
        name: input.name,
        idNumber: input.idNumber || undefined,
        baseSalary: input.baseSalary,
        hireDate: input.hireDate,
        uifEnrolled: input.uifEnrolled,
      })
      if (res.ok) {
        haptic(20); toast('Employee added')
        setShowAdd(false); router.refresh()
      } else toast(res.error ?? 'Failed')
    })
  }

  function onToggle(emp: Employee) {
    startTransition(async () => {
      const res = await toggleEmployeeAction(emp.id, !emp.active)
      if (res.ok) router.refresh()
      else toast(res.error ?? 'Failed')
    })
  }

  function onArchive(emp: Employee) {
    if (!confirm(`Remove ${emp.name} from the employee list? Past payslips are kept.`)) return
    startTransition(async () => {
      const res = await archiveEmployeeAction(emp.id)
      if (res.ok) { toast('Removed'); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  function onRunPayroll() {
    startTransition(async () => {
      const res = await runPayrollAction(currentPeriod)
      if (res.ok) { haptic(30); toast('Payroll calculated'); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  function onFinalise(runId: string) {
    if (!confirm('Finalise this payroll run? Re-running afterwards is still possible but the status will reset to draft.')) return
    startTransition(async () => {
      const res = await finaliseRunAction(runId)
      if (res.ok) { toast('Run finalised'); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  function downloadEmp201Csv(run: PayrollRun) {
    const header = ['Employee', 'Gross', 'PAYE', 'UIF (employee)', 'UIF (employer)', 'SDL', 'Net']
    const rows = run.lines.map(l => [
      l.employeeName ?? '',
      l.gross.toFixed(2),
      l.paye.toFixed(2),
      l.uifEmployee.toFixed(2),
      l.uifEmployer.toFixed(2),
      l.sdl.toFixed(2),
      l.net.toFixed(2),
    ])
    const totals = ['TOTAL', run.totalGross, run.totalPaye, run.totalUifEmployee, run.totalUifEmployer, run.totalSdl, run.totalNet]
      .map((v, i) => i === 0 ? v : (v as number).toFixed(2))
    const csv = [header, ...rows, totals]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `emp201_${run.periodOf}.csv`
    a.click()
  }

  if (showAdd) {
    return <EmployeeForm onCancel={() => setShowAdd(false)} onSubmit={onAddEmployee} isPending={isPending} />
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <ArrowLeft size={18} color="#7B8CA1" />
          </Link>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Payroll</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm w-auto"
        >
          <UserPlus size={14} /> Add employee
        </button>
      </div>

      {/* Current period run */}
      <div className="card p-5 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-1">This month</p>
        <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{fmtPeriod(currentPeriod)}</p>
        {currentRun ? (
          <>
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
              <div>
                <p className="text-muted text-[11px]">Total gross</p>
                <p className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{fmtR0(currentRun.totalGross)}</p>
              </div>
              <div>
                <p className="text-muted text-[11px]">Total net (to employees)</p>
                <p className="text-base font-bold" style={{ color: '#00C896' }}>{fmtR0(currentRun.totalNet)}</p>
              </div>
              <div>
                <p className="text-muted text-[11px]">PAYE (to SARS)</p>
                <p className="text-base font-bold" style={{ color: '#F59E0B' }}>{fmtR0(currentRun.totalPaye)}</p>
              </div>
              <div>
                <p className="text-muted text-[11px]">UIF total + SDL (to SARS)</p>
                <p className="text-base font-bold" style={{ color: '#F59E0B' }}>
                  {fmtR0(currentRun.totalUifEmployee + currentRun.totalUifEmployer + currentRun.totalSdl)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-4">
              <button onClick={onRunPayroll} disabled={isPending} className="rounded-xl py-3 text-sm font-semibold" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
                Recalculate
              </button>
              <button onClick={() => downloadEmp201Csv(currentRun)} className="rounded-xl px-3 py-3 text-sm font-semibold inline-flex items-center gap-1.5" style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}>
                <Download size={14} /> EMP201
              </button>
              {currentRun.status === 'draft' && (
                <button onClick={() => onFinalise(currentRun.id)} disabled={isPending} className="btn-primary px-3 w-auto">Finalise</button>
              )}
            </div>
          </>
        ) : employees.filter(e => e.active).length === 0 ? (
          <p className="text-muted text-sm mt-2">Add at least one active employee to run payroll.</p>
        ) : (
          <button onClick={onRunPayroll} disabled={isPending} className="btn-primary mt-4 inline-flex items-center gap-1.5">
            <Calculator size={14} /> Calculate payroll
          </button>
        )}
      </div>

      {/* Employee list */}
      <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 ml-1 mt-4">Employees</p>
      {employees.length === 0 ? (
        <EmptyState
          icon={<UserPlus />}
          tone="violet"
          title="No employees yet"
          description="Add an employee to start running monthly PAYE / UIF / SDL through Stoki."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {employees.map((e) => (
            <div key={e.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>{e.name}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {fmtMoney(e.baseSalary)} / month · hired {fmtDate(e.hireDate)}
                    {!e.uifEnrolled && ' · UIF opted out'}
                    {!e.active && ' · inactive'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onToggle(e)} disabled={isPending} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
                    {e.active ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => onArchive(e)} disabled={isPending} className="rounded-xl p-2" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: '#EF4444' }} aria-label="Remove employee">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past runs */}
      {runs.filter(r => r.periodOf !== currentPeriod).length > 0 && (
        <>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 ml-1 mt-6">Past runs</p>
          <div className="flex flex-col gap-2">
            {runs.filter(r => r.periodOf !== currentPeriod).map(r => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{fmtPeriod(r.periodOf)}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {r.lines.length} employee{r.lines.length === 1 ? '' : 's'} · {fmtR0(r.totalGross)} gross · {fmtR0(r.totalNet)} net
                    </p>
                  </div>
                  <button onClick={() => downloadEmp201Csv(r)} className="rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5" style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}>
                    <Download size={12} /> CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function EmployeeForm({
  onCancel, onSubmit, isPending,
}: {
  onCancel: () => void
  onSubmit: (input: { name: string; idNumber: string; baseSalary: number; hireDate: string; uifEnrolled: boolean }) => void
  isPending: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [salary, setSalary] = useState('')
  const [hireDate, setHireDate] = useState(today)
  const [uifEnrolled, setUifEnrolled] = useState(true)

  const salaryNum = parseFloat(salary)
  const canSubmit = name.trim().length > 0
    && Number.isFinite(salaryNum) && salaryNum >= 0
    && !!hireDate

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <ArrowLeft size={18} color="#7B8CA1" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Add employee</h1>
      </div>

      <div className="card p-5 flex flex-col gap-3">
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Full name</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Themba Mokoena" style={fieldStyle} />
        </div>
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">SA ID number (optional)</p>
          <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="13 digits" style={fieldStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Monthly salary (R)</p>
            <input type="number" step="0.01" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0.00" style={fieldStyle} />
          </div>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Hire date</p>
            <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} style={fieldStyle} />
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
          <div>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>UIF-enrolled</p>
            <p className="text-muted text-[10px] mt-0.5">Default on. Owners and foreign workers may opt out.</p>
          </div>
          <input type="checkbox" checked={uifEnrolled} onChange={(e) => setUifEnrolled(e.target.checked)} className="w-5 h-5 accent-brand" />
        </label>
        <button
          onClick={() => onSubmit({ name: name.trim(), idNumber, baseSalary: salaryNum, hireDate, uifEnrolled })}
          disabled={!canSubmit || isPending}
          className="btn-primary mt-1"
        >
          {isPending ? 'Saving…' : 'Add employee'}
        </button>
      </div>
    </>
  )
}
