import client from './client'
import type { DashboardSummary, ProjectSummary, Category, Project, MonthlyReport  } from '../types'

export const getDashboard = async (month: number, year: number): Promise<DashboardSummary> => {
  const { data } = await client.get('/summary/dashboard', { params: { month, year } })
  return data
}

export const getProjectSummary = async (): Promise<ProjectSummary[]> => {
  const { data } = await client.get('/summary/by-project')
  return data
}

export const getCategories = async (type?: string): Promise<Category[]> => {
  const { data } = await client.get('/categories', { params: type ? { type } : {} })
  return data
}

export const getProjects = async (): Promise<Project[]> => {
  const { data } = await client.get('/projects')
  return data
}

export const getMonthlyReport = async (month: number, year: number): Promise<MonthlyReport> => {
  const { data } = await client.get('/summary/monthly-report', { params: { month, year } })
  return data
}