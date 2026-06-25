import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../../api/client'
import type { Project } from '../../types'
import CurrencyInput from '../../components/ui/CurrencyInput'

interface Props {
  onClose: () => void
}

const COLORS = [
  '#534AB7','#EF9F27','#1D9E75','#E24B4A',
  '#185FA5','#D85A30','#D4537E','#639922',
]

export default function ProjectForm({ onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name:        '',
    code:        '',
    color:       '#534AB7',
    status:      'active',
    budget:      '',
    start_date:  '',
    end_date:    '',
    description: '',
  })

  const set = (key: string, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await client.post<Project>('/projects', {
        ...form,
        budget:     form.budget     ? parseFloat(form.budget)  : undefined,
        start_date: form.start_date || undefined,
        end_date:   form.end_date   || undefined,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project-summary'] })
      onClose()
    },
  })

  const handleSubmit = () => {
    if (!form.name || !form.code) {
      alert('Nama project dan kode wajib diisi')
      return
    }
    create.mutate()
  }

  // auto-generate kode dari nama
  const autoCode = (name: string) => {
    const code = 'PRJ-' + name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .map(w => w.slice(0, 3))
      .join('-')
      .slice(0, 20)
    set('name', name)
    if (!form.code || form.code.startsWith('PRJ-')) set('code', code)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-800">Tambah Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Nama */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Nama Project</label>
            <input
              type="text"
              value={form.name}
              onChange={e => autoCode(e.target.value)}
              placeholder="Contoh: Website PT Maju Jaya"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>

          {/* Kode */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Kode Project
              <span className="text-gray-400 font-normal ml-1">(auto-generate, bisa diubah)</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="PRJ-XXX"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono"
            />
          </div>

          {/* Warna */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Warna</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform
                    ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Status</label>
            <div className="flex gap-2">
              {[
                { val: 'active',    label: 'Aktif'   },
                { val: 'on_hold',   label: 'Ditahan' },
                { val: 'completed', label: 'Selesai' },
              ].map(s => (
                <button
                  key={s.val}
                  onClick={() => set('status', s.val)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors
                    ${form.status === s.val
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Budget <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <CurrencyInput
              value={form.budget}
              onChange={val => set('budget', val)}
              placeholder="Kosongkan jika tidak ada"
            />
          </div>

          {/* Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Tanggal Mulai</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Tanggal Selesai</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Keterangan singkat tentang project..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {create.isPending ? 'Menyimpan...' : 'Simpan Project'}
          </button>
        </div>
      </div>
    </div>
  )
}