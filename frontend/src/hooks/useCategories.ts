import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import type { Category, Project } from '../types'

export const useCategories = (type?: string, fund_type?: string) =>
  useQuery({
    queryKey: ['categories', type, fund_type],
    queryFn: async (): Promise<Category[]> => {
      const { data } = await client.get('/categories', {
        params: {
          ...(type      ? { type }      : {}),
          ...(fund_type ? { fund_type } : {}),
        }
      })
      return data
    },
  })

export const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data } = await client.get('/projects')
      return data
    },
  })