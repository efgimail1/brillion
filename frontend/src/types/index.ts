export interface Bank {
  id: string
  name: string
  code: string
  color: string
  icon?: string
  is_active: boolean
}

export interface Account {
  id: string
  bank_id: string
  name: string
  account_type: string
  balance: number
  initial_balance: number
  is_pocket: boolean
  is_deposit: boolean
  parent_account_id?: string
  is_active: boolean
}

export interface Category {
  id: string
  name: string
  type: string
  fund_type: string
  color: string
  icon?: string
}

export interface Project {
  id: string
  name: string
  code: string
  color: string
  status: string
  budget?: number
  start_date?: string
  end_date?: string
  description?: string
}

export interface Transaction {
  id: string
  account_id: string
  to_account_id?: string
  category_id?: string
  project_id?: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description?: string
  notes?: string
  from_to?: string
  purpose?: string
  fund_type: string
  transaction_date: string
  created_at: string
}

export interface DashboardSummary {
  month: number
  year: number
  total_balance: number
  total_income: number
  total_expense: number
  bank_summary: {
    name: string
    color: string
    balance: number
    income: number
    expense: number
  }[]
  fund_summary: {
    fund_type: string
    income: number
    expense: number
  }[]
}

export interface ProjectSummary {
  name: string
  code: string
  color: string
  status: string
  total_income: number
  total_expense: number
  balance: number
}

export interface MonthlyReport {
  month: number
  year: number
  total_income: number
  total_expense: number
  net: number
  transaction_count: number
  category_breakdown: {
    name: string
    income: number
    expense: number
    color: string
  }[]
  fund_breakdown: {
    fund_type: string
    income: number
    expense: number
  }[]
  daily_breakdown: {
    day: number
    income: number
    expense: number
  }[]
  account_balances: {
    id: string
    name: string
    opening_balance: number
    closing_balance: number
    income: number
    expense: number
  }[]
}

export interface ParsedTransaction {
  date: string | null
  day: number
  month: number
  description: string
  from_to: string
  amount: number
  type: 'income' | 'expense'
  suggested_category: string | null
  suggested_fund_type: string
  internal_pocket_hint?: string | null
  is_likely_internal_transfer?: boolean
}

export interface ImportPreviewResult {
  period_month: number | null
  period_year: number | null
  detected_account_name?: string | null
  count: number
  transactions: ParsedTransaction[]
}