import client from './client'
import type { Bank, Account } from '../types'

export const getBanks = async (): Promise<Bank[]> => {
  const { data } = await client.get('/banks')
  return data
}

export const getAccounts = async (bank_id?: string): Promise<Account[]> => {
  const { data } = await client.get('/accounts', { params: bank_id ? { bank_id } : {} })
  return data
}

export const createAccount = async (payload: {
  bank_id: string
  name: string
  account_type: string
  initial_balance: number
  is_pocket: boolean
  is_deposit: boolean
  parent_account_id?: string
}): Promise<Account> => {
  const { data } = await client.post('/accounts', payload)
  return data
}