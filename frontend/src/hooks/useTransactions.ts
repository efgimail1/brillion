import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  type TransactionFilters,
} from "../api/transactions";
import type { Transaction } from "../types";

export const useTransactions = (filters?: TransactionFilters) =>
  useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => getTransactions(filters),
  });

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useUpdateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transaction> }) => {
      const { data: result } = await client.patch(`/transactions/${id}`, data);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};