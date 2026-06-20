import { SupabaseClient } from '@supabase/supabase-js'
import {
  Employee, NewEmployee, PayrollRun, PayslipLine,
} from '@/domain/entities/employee'
import { toEmployee, toPayrollRun, toPayslipLine } from '../mappers'

export class PayrollRepository {
  constructor(private db: SupabaseClient) {}

  // Employees -----------------------------------------------------------

  async findEmployees(storeId: string): Promise<Employee[]> {
    const { data, error } = await this.db
      .from('employees')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []).map(toEmployee)
  }

  async findActiveEmployees(storeId: string): Promise<Employee[]> {
    const all = await this.findEmployees(storeId)
    return all.filter((e) => e.active)
  }

  async createEmployee(storeId: string, data: NewEmployee): Promise<Employee> {
    const { data: row, error } = await this.db
      .from('employees')
      .insert({
        store_id: storeId,
        name: data.name,
        id_number: data.idNumber ?? null,
        base_salary: data.baseSalary,
        hire_date: data.hireDate,
        uif_enrolled: data.uifEnrolled ?? true,
        notes: data.notes ?? null,
      })
      .select()
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to add employee')
    return toEmployee(row)
  }

  async updateEmployee(
    storeId: string, id: string,
    patch: Partial<NewEmployee & { active: boolean; endDate: string }>,
  ): Promise<void> {
    const dbPatch: Record<string, unknown> = {}
    if (patch.name !== undefined) dbPatch.name = patch.name
    if (patch.idNumber !== undefined) dbPatch.id_number = patch.idNumber || null
    if (patch.baseSalary !== undefined) dbPatch.base_salary = patch.baseSalary
    if (patch.hireDate !== undefined) dbPatch.hire_date = patch.hireDate
    if (patch.uifEnrolled !== undefined) dbPatch.uif_enrolled = patch.uifEnrolled
    if (patch.active !== undefined) dbPatch.active = patch.active
    if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate || null
    if (patch.notes !== undefined) dbPatch.notes = patch.notes || null

    const { error } = await this.db
      .from('employees')
      .update(dbPatch)
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async archiveEmployee(storeId: string, id: string): Promise<void> {
    const { error } = await this.db
      .from('employees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Payroll runs --------------------------------------------------------

  async findRuns(storeId: string): Promise<PayrollRun[]> {
    const { data, error } = await this.db
      .from('payroll_runs')
      .select('*, payslip_lines(*, employees(name))')
      .eq('store_id', storeId)
      .order('period_of', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toPayrollRun)
  }

  async findRunForPeriod(storeId: string, periodIso: string): Promise<PayrollRun | null> {
    const { data, error } = await this.db
      .from('payroll_runs')
      .select('*, payslip_lines(*, employees(name))')
      .eq('store_id', storeId)
      .eq('period_of', periodIso)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    return toPayrollRun(data)
  }

  async upsertRun(
    storeId: string,
    periodIso: string,
    totals: {
      totalGross: number; totalPaye: number;
      totalUifEmployee: number; totalUifEmployer: number;
      totalSdl: number; totalNet: number;
    },
    lines: Array<Omit<PayslipLine, 'id' | 'runId' | 'storeId' | 'createdAt' | 'employeeName'>>,
  ): Promise<PayrollRun> {
    // Upsert the run, then wipe & reinsert lines for that run. Simpler and
    // safer than per-line upserts when the employee roster has changed.
    const { data: runRow, error: runErr } = await this.db
      .from('payroll_runs')
      .upsert({
        store_id: storeId,
        period_of: periodIso,
        total_gross: totals.totalGross,
        total_paye: totals.totalPaye,
        total_uif_employee: totals.totalUifEmployee,
        total_uif_employer: totals.totalUifEmployer,
        total_sdl: totals.totalSdl,
        total_net: totals.totalNet,
      }, { onConflict: 'store_id,period_of' })
      .select()
      .single()
    if (runErr || !runRow) throw new Error(runErr?.message ?? 'Failed to save run')

    // Clean existing lines for this run.
    const { error: delErr } = await this.db
      .from('payslip_lines')
      .delete()
      .eq('run_id', runRow.id)
    if (delErr) throw new Error(delErr.message)

    if (lines.length > 0) {
      const { error: lineErr } = await this.db
        .from('payslip_lines')
        .insert(lines.map((l) => ({
          run_id: runRow.id,
          store_id: storeId,
          employee_id: l.employeeId,
          gross: l.gross,
          paye: l.paye,
          uif_employee: l.uifEmployee,
          uif_employer: l.uifEmployer,
          sdl: l.sdl,
          net: l.net,
        })))
      if (lineErr) throw new Error(lineErr.message)
    }

    const reloaded = await this.findRunForPeriod(storeId, periodIso)
    if (!reloaded) throw new Error('Failed to reload run')
    return reloaded
  }

  async setRunStatus(storeId: string, id: string, status: 'draft' | 'final'): Promise<void> {
    const { error } = await this.db
      .from('payroll_runs')
      .update({ status })
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
}
