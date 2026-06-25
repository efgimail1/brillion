import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBanks, getAccounts, createAccount } from '../api/banks'

export const useBanks = () =>
  useQuery({ queryKey: ['banks'], queryFn: getBanks })

export const useAccounts = (bank_id?: string) =>
  useQuery({
    queryKey: ['accounts', bank_id],
    queryFn: () => getAccounts(bank_id),
  })

export const useCreateAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}