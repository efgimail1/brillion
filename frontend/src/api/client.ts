import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.detail || 'Terjadi kesalahan'
    console.error('[API Error]', msg)
    return Promise.reject(err)
  }
)

export default client