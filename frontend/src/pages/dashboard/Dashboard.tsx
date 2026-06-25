import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
// TooltipProps import removed — using a lightweight formatter instead
import { useDashboard, useProjectSummary } from '../../hooks/useSummary'
import { useTransactions } from '../../hooks/useTransactions'
import { formatRupiah, MONTH_NAMES, FUND_TYPE_LABEL, FUND_TYPE_COLOR } from '../../utils'

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

  const { data: summary, isLoading } = useDashboard(month, year)
  const { data: projects }           = useProjectSummary()
  const { data: transactions }       = useTransactions({ limit: 8 })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Memuat data...
    </div>
  )

  const net = (summary?.total_income ?? 0) - (summary?.total_expense ?? 0)

  const tooltipFormatter = (value: unknown) => {
    if (value == null) return ''
    const n = typeof value === 'number' ? value : Number(String(value))
    return formatRupiah(n)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-400">
            {MONTH_NAMES[month - 1]} {year} · Semua rekening
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Saldo',   value: summary?.total_balance ?? 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Pemasukan',     value: summary?.total_income   ?? 0, color: 'text-green-700',  bg: 'bg-green-50'  },
          { label: 'Pengeluaran',   value: summary?.total_expense  ?? 0, color: 'text-red-700',    bg: 'bg-red-50'    },
          { label: 'Net Bulan Ini', value: net,                          color: net >= 0 ? 'text-green-700' : 'text-red-700', bg: 'bg-gray-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-lg font-medium ${card.color}`}>
              {formatRupiah(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Chart pemasukan vs pengeluaran per bank */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Ringkasan per Bank</h2>
          {summary?.bank_summary && summary.bank_summary.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary.bank_summary} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1e6).toFixed(0)}jt`} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="income"  name="Masuk"  radius={[4,4,0,0]}>
                  {summary.bank_summary.map((_, i) => (
                    <Cell key={i} fill="#4ade80" />
                  ))}
                </Bar>
                <Bar dataKey="expense" name="Keluar" radius={[4,4,0,0]}>
                  {summary.bank_summary.map((_, i) => (
                    <Cell key={i} fill="#f87171" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
              Belum ada data bulan ini
            </div>
          )}
        </div>

        {/* Saldo per bank */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Saldo per Bank</h2>
          <div className="space-y-3">
            {summary?.bank_summary?.map(bank => (
              <div key={bank.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: bank.color }}
                  />
                  <span className="text-sm text-gray-700">{bank.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {formatRupiah(bank.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Transaksi terakhir */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Transaksi Terakhir</h2>
            <a href="/transactions" className="text-xs text-indigo-500 hover:underline">
              Lihat semua →
            </a>
          </div>
          <div className="space-y-1">
            {transactions?.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs
                  ${tx.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {tx.type === 'income' ? '↓' : '↑'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">
                    {tx.description || tx.purpose || '—'}
                  </p>
                  <p className="text-xs text-gray-400">{tx.transaction_date}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${FUND_TYPE_COLOR[tx.fund_type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {FUND_TYPE_LABEL[tx.fund_type] ?? tx.fund_type}
                </span>
                <span className={`text-sm font-medium tabular-nums
                  ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'income' ? '+' : '−'}{formatRupiah(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dana per project */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Dana per Project</h2>
          <div className="space-y-3">
            {projects?.slice(0, 5).map(proj => (
              <div key={proj.code}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 truncate">{proj.name}</span>
                  <span className={proj.balance >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {formatRupiah(proj.balance)}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, proj.total_income > 0
                        ? (proj.total_expense / proj.total_income) * 100
                        : 0)}%`,
                      backgroundColor: proj.color,
                    }}
                  />
                </div>
              </div>
            ))}
            {!projects?.length && (
              <p className="text-xs text-gray-300 text-center py-4">Belum ada project</p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}