import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useMonthlyReport } from "../../hooks/useSummary";
import { formatRupiah, MONTH_NAMES, FUND_TYPE_LABEL } from "../../utils";

const FUND_TYPE_CHART_COLOR: Record<string, string> = {
  pribadi: "#185FA5",
  project: "#EF9F27",
  tpp: "#0F6E56",
  professional_fee: "#534AB7",
  investasi: "#1D9E75",
};

// helper formatter aman untuk Recharts Tooltip — terima value apa pun
const tooltipFormatter = (value: unknown): string => {
  const num = typeof value === "number" ? value : Number(value);
  return formatRupiah(Number.isFinite(num) ? num : 0);
};

export default function MonthlyReport() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: report, isLoading } = useMonthlyReport(month, year);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Memuat laporan...
      </div>
    );
  }

  const totalOpening =
    report?.account_balances.reduce((s, a) => s + a.opening_balance, 0) ?? 0;
  const totalClosing =
    report?.account_balances.reduce((s, a) => s + a.closing_balance, 0) ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-800">Laporan Bulanan</h1>
          <p className="text-sm text-gray-400">
            {MONTH_NAMES[month - 1]} {year} · {report?.transaction_count ?? 0}{" "}
            transaksi
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Saldo awal / akhir / income / expense / net */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Saldo Awal Bulan</p>
          <p className="text-base font-medium text-gray-700">
            {formatRupiah(totalOpening)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Saldo Akhir Bulan</p>
          <p className="text-base font-medium text-gray-700">
            {formatRupiah(totalClosing)}
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-green-600 mb-1">Pemasukan</p>
          <p className="text-base font-medium text-green-700">
            {formatRupiah(report?.total_income ?? 0)}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-xs text-red-500 mb-1">Pengeluaran</p>
          <p className="text-base font-medium text-red-600">
            {formatRupiah(report?.total_expense ?? 0)}
          </p>
        </div>
        <div
          className={`rounded-xl p-4 border ${(report?.net ?? 0) >= 0 ? "bg-indigo-50 border-indigo-100" : "bg-orange-50 border-orange-100"}`}
        >
          <p
            className={`text-xs mb-1 ${(report?.net ?? 0) >= 0 ? "text-indigo-500" : "text-orange-500"}`}
          >
            Net
          </p>
          <p
            className={`text-base font-medium ${(report?.net ?? 0) >= 0 ? "text-indigo-700" : "text-orange-600"}`}
          >
            {formatRupiah(report?.net ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Tren harian */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            Tren Harian
          </h2>
          {report?.daily_breakdown && report.daily_breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={report.daily_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => `${d}`}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1e6).toFixed(1)}jt`}
                />
                <Tooltip formatter={tooltipFormatter} />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Masuk"
                  stroke="#4ade80"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Keluar"
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
              Belum ada transaksi bulan ini
            </div>
          )}
        </div>

        {/* Breakdown per Dana */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Breakdown per Dana
          </h2>
          <div className="space-y-3">
            {report?.fund_breakdown.map((fund) => {
              const net = fund.income - fund.expense;
              return (
                <div key={fund.fund_type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            FUND_TYPE_CHART_COLOR[fund.fund_type] ?? "#888780",
                        }}
                      />
                      <span className="text-xs text-gray-600">
                        {FUND_TYPE_LABEL[fund.fund_type] ?? fund.fund_type}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium ${net >= 0 ? "text-green-600" : "text-red-500"}`}
                    >
                      {formatRupiah(net)}
                    </span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                    {fund.income > 0 && (
                      <div
                        className="bg-green-400 h-full"
                        style={{
                          width: `${(fund.income / (fund.income + fund.expense || 1)) * 100}%`,
                        }}
                      />
                    )}
                    {fund.expense > 0 && (
                      <div
                        className="bg-red-400 h-full"
                        style={{
                          width: `${(fund.expense / (fund.income + fund.expense || 1)) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {!report?.fund_breakdown.length && (
              <p className="text-xs text-gray-300 text-center py-6">
                Belum ada data
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Breakdown per Kategori - chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            Pengeluaran per Kategori
          </h2>
          {report?.category_breakdown.filter((c) => c.expense > 0).length ? (
            <ResponsiveContainer
              width="100%"
              height={Math.max(
                200,
                report.category_breakdown.filter((c) => c.expense > 0).length *
                  32,
              )}
            >
              <BarChart
                layout="vertical"
                data={report.category_breakdown.filter((c) => c.expense > 0)}
                margin={{ left: 0, right: 16 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1e6).toFixed(1)}jt`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={110}
                />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="expense" name="Pengeluaran" radius={[0, 4, 4, 0]}>
                  {report.category_breakdown
                    .filter((c) => c.expense > 0)
                    .map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
              Belum ada pengeluaran bulan ini
            </div>
          )}
        </div>

        {/* Saldo per rekening */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-700">
              Saldo Awal & Akhir per Rekening
            </h2>
          </div>
          <div className="max-h-65 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left px-4 py-2">Rekening</th>
                  <th className="text-right px-4 py-2">Awal</th>
                  <th className="text-right px-4 py-2">Akhir</th>
                </tr>
              </thead>
              <tbody>
                {report?.account_balances.map((acc) => (
                  <tr key={acc.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-gray-700">{acc.name}</td>
                    <td className="px-4 py-2 text-right text-gray-400 tabular-nums">
                      {formatRupiah(acc.opening_balance)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800 tabular-nums">
                      {formatRupiah(acc.closing_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabel kategori lengkap */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">
            Detail per Kategori
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="text-left px-4 py-2">Kategori</th>
              <th className="text-right px-4 py-2">Pemasukan</th>
              <th className="text-right px-4 py-2">Pengeluaran</th>
            </tr>
          </thead>
          <tbody>
            {report?.category_breakdown.map((cat) => (
              <tr
                key={cat.name}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-gray-700">{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-green-600 tabular-nums">
                  {cat.income > 0 ? formatRupiah(cat.income) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right text-red-500 tabular-nums">
                  {cat.expense > 0 ? formatRupiah(cat.expense) : "—"}
                </td>
              </tr>
            ))}
            {!report?.category_breakdown.length && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center py-8 text-gray-300 text-xs"
                >
                  Belum ada transaksi bulan ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}