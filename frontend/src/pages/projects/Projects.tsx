import { useState } from 'react'
import { useNavigate } from 'react-router-dom'          // ← tambah
import { useProjectSummary } from '../../hooks/useSummary'
import { useProjects } from '../../hooks/useCategories'
import { formatRupiah } from '../../utils'
import ProjectForm from './ProjectForm'

export default function Projects() {
  const navigate             = useNavigate()             // ← tambah
  const { data: summary  }   = useProjectSummary()
  const { data: projects }   = useProjects()
  const [filter,   setFilter]   = useState('all')
  const [showForm, setShowForm] = useState(false)

  const filtered = summary?.filter(p =>
    filter === 'all' ? true : p.status === filter
  )

  // gabungkan summary dengan id dari projects
  const withId = filtered?.map(s => ({
    ...s,
    id: projects?.find(p => p.code === s.code)?.id,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-800">Project</h1>
          <p className="text-sm text-gray-400">{projects?.length ?? 0} project terdaftar</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          + Tambah Project
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { val: 'all',       label: 'Semua'   },
          { val: 'active',    label: 'Aktif'   },
          { val: 'completed', label: 'Selesai' },
          { val: 'on_hold',   label: 'Ditahan' },
        ].map(s => (
          <button key={s.val} onClick={() => setFilter(s.val)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors
              ${filter === s.val
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {withId?.map(proj => (
          <div key={proj.code}
            onClick={() => proj.id && navigate(`/projects/${proj.id}`)}
            className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: proj.color }} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{proj.name}</p>
                  <p className="text-xs text-gray-400">{proj.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full
                  ${proj.status === 'active'    ? 'bg-green-100 text-green-700'  :
                    proj.status === 'completed' ? 'bg-blue-100 text-blue-700'   :
                                                  'bg-amber-100 text-amber-700'}`}>
                  {proj.status === 'active' ? 'Aktif' : proj.status === 'completed' ? 'Selesai' : 'Ditahan'}
                </span>
                <span className="text-gray-300 text-xs">→</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-lg py-2">
                <p className="text-xs text-green-600">Masuk</p>
                <p className="text-xs font-medium text-green-700">{formatRupiah(proj.total_income)}</p>
              </div>
              <div className="bg-red-50 rounded-lg py-2">
                <p className="text-xs text-red-500">Keluar</p>
                <p className="text-xs font-medium text-red-600">{formatRupiah(proj.total_expense)}</p>
              </div>
              <div className={`rounded-lg py-2 ${proj.balance >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}`}>
                <p className={`text-xs ${proj.balance >= 0 ? 'text-indigo-500' : 'text-orange-500'}`}>Balance</p>
                <p className={`text-xs font-medium ${proj.balance >= 0 ? 'text-indigo-700' : 'text-orange-600'}`}>
                  {formatRupiah(proj.balance)}
                </p>
              </div>
            </div>

            {proj.total_income > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Penggunaan dana</span>
                  <span>{Math.round((proj.total_expense / proj.total_income) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (proj.total_expense / proj.total_income) * 100)}%`,
                      backgroundColor: proj.color,
                    }} />
                </div>
              </div>
            )}
          </div>
        ))}

        {withId?.length === 0 && (
          <div className="col-span-2 text-center py-16 text-gray-300 text-sm">
            Belum ada project — klik "+ Tambah Project" untuk mulai
          </div>
        )}
      </div>

      {showForm && <ProjectForm onClose={() => setShowForm(false)} />}
    </div>
  )
}