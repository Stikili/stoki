export interface Employee {
  id: string
  storeId: string
  name: string
  idNumber: string | null
  baseSalary: number
  hireDate: string
  endDate: string | null
  uifEnrolled: boolean
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface NewEmployee {
  name: string
  idNumber?: string
  baseSalary: number
  hireDate: string
  uifEnrolled?: boolean
  notes?: string
}

export interface PayrollRun {
  id: string
  storeId: string
  periodOf: string
  totalGross: number
  totalPaye: number
  totalUifEmployee: number
  totalUifEmployer: number
  totalSdl: number
  totalNet: number
  status: 'draft' | 'final'
  lines: PayslipLine[]
  createdAt: string
  updatedAt: string
}

export interface PayslipLine {
  id: string
  runId: string
  storeId: string
  employeeId: string
  employeeName: string | null
  gross: number
  paye: number
  uifEmployee: number
  uifEmployer: number
  sdl: number
  net: number
  createdAt: string
}
