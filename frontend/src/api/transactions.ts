import client from './client'
import type { Transaction } from '../types'

export interface TransactionFilters {
  account_id?: string
  project_id?: string
  fund_type?: string
  type?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export const getTransactions = async (filters?: TransactionFilters): Promise<Transaction[]> => {
  const { data } = await client.get('/transactions', { params: filters })
  return data
}

export const createTransaction = async (payload: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> => {
  const { data } = await client.post('/transactions', payload)
  return data
}

export const deleteTransaction = async (id: string): Promise<void> => {
  await client.delete(`/transactions/${id}`)
}