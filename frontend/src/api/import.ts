import client from './client'
import type { ImportPreviewResult } from '../types'

export const previewStatement = async (
  file: File,
  bankFormat: 'bca' | 'blu' | 'jago'
): Promise<ImportPreviewResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const endpointMap = {
    bca: '/import/preview',
    blu: '/import/preview-blu',
    jago: '/import/preview-jago',
  }
  const { data } = await client.post(endpointMap[bankFormat], formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}