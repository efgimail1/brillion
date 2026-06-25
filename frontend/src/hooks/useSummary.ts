import { useQuery } from '@tanstack/react-query'
import { getDashboard, getProjectSummary, getMonthlyReport  } from '../api/summary'

export const useDashboard = (month: number, year: number) =>
  useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: () => getDashboard(month, year),
    staleTime: 1000 * 60 * 5,
  })

export const useProjectSummary = () =>
  useQuery({
    queryKey: ['project-summary'],
    queryFn: getProjectSummary,
  })

export const useMonthlyReport = (month: number, year: number) =>
  useQuery({
    queryKey: ['monthly-report', month, year],
    queryFn: () => getMonthlyReport(month, year),
  })