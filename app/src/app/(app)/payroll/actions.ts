'use server'

import { revalidatePath } from 'next/cache'
import { getServerData } from '@/lib/getServerData'
import { PayrollRepository } from '@/infrastructure/supabase/repositories/PayrollRepository'
import { buildPayslip, isSdlLiable } from '@/lib/payroll/calculator'
import type { NewEmployee } from '@/domain/entities/employee'

export async function addEmployeeAction(
  input: NewEmployee,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role !== 'owner') return { ok: false, error: 'Only the owner can manage payroll.' }
  if (!input.name.trim()) return { ok: false, error: 'Name is required.' }
  if (!Number.isFinite(input.baseSalary) || input.baseSalary < 0) {
    return { ok: false, error: 'Base salary must be >= 0.' }
  }
  if (!input.hireDate) return { ok: false, error: 'Hire date is required.' }

  const repo = new PayrollRepository(supabase)
  try {
    await repo.createEmployee(store.id, input)
    revalidatePath('/payroll')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}

export async function archiveEmployeeAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role !== 'owner') return { ok: false, error: 'Only the owner can manage payroll.' }
  const repo = new PayrollRepository(supabase)
  try {
    await repo.archiveEmployee(store.id, id)
    revalidatePath('/payroll')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}

export async function toggleEmployeeAction(
  id: string, active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role !== 'owner') return { ok: false, error: 'Only the owner can manage payroll.' }
  const repo = new PayrollRepository(supabase)
  try {
    await repo.updateEmployee(store.id, id, { active })
    revalidatePath('/payroll')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}

/**
 * Build (or rebuild) the payroll run for a period and persist it.
 * Idempotent — re-running for the same period overwrites the totals and
 * payslip lines based on the current employee roster. Useful when an
 * employee was added mid-month or a salary changed.
 */
export async function runPayrollAction(
  periodIso: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role !== 'owner') return { ok: false, error: 'Only the owner can run payroll.' }
  const repo = new PayrollRepository(supabase)

  try {
    const active = await repo.findActiveEmployees(store.id)
    const annualPayroll = active.reduce((s, e) => s + e.baseSalary * 12, 0)
    const sdlLiable = isSdlLiable(annualPayroll)

    const lines = active.map((e) => {
      const slip = buildPayslip(e.baseSalary, e.uifEnrolled, sdlLiable)
      return {
        employeeId: e.id,
        gross: slip.gross,
        paye: slip.paye,
        uifEmployee: slip.uifEmployee,
        uifEmployer: slip.uifEmployer,
        sdl: slip.sdl,
        net: slip.net,
      }
    })

    const totals = lines.reduce(
      (acc, l) => ({
        totalGross:        acc.totalGross + l.gross,
        totalPaye:         acc.totalPaye + l.paye,
        totalUifEmployee:  acc.totalUifEmployee + l.uifEmployee,
        totalUifEmployer:  acc.totalUifEmployer + l.uifEmployer,
        totalSdl:          acc.totalSdl + l.sdl,
        totalNet:          acc.totalNet + l.net,
      }),
      { totalGross: 0, totalPaye: 0, totalUifEmployee: 0, totalUifEmployer: 0, totalSdl: 0, totalNet: 0 },
    )

    await repo.upsertRun(store.id, periodIso, totals, lines)
    revalidatePath('/payroll')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}

export async function finaliseRunAction(runId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role !== 'owner') return { ok: false, error: 'Only the owner can finalise.' }
  const repo = new PayrollRepository(supabase)
  try {
    await repo.setRunStatus(store.id, runId, 'final')
    revalidatePath('/payroll')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}
