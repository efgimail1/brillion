import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "../../hooks/useCategories";
import { useTransactions } from "../../hooks/useTransactions";
import { formatRupiah } from "../../utils";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const { data: transactions } = useTransactions({
    project_id: id,
    limit: 200,
  });

  const project = projects?.find((p) => p.id === id);

  if (!project)
    return (
      <div className="text-center py-20 text-gray-300">Memuat project...</div>
    );

  const income =
    transactions
      ?.filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0) ?? 0;
  const expense =
    transactions
      ?.filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0) ?? 0;
  const balance = income - expense;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/projects")}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Kembali
        </button>
      </div>

      {/* Info project */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h1 className="text-lg font-medium text-gray-800">
                {project.name}
              </h1>
              <p className="text-sm text-gray-400">{project.code}</p>
              {project.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full
            ${
              project.status === "active"
                ? "bg-green-100 text-green-700"
                : project.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >
            {project.status === "active"
              ? "Aktif"
              : project.status === "completed"
                ? "Selesai"
                : "Ditahan"}
          </span>
        </div>

        {/* Metric */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <p className="text-xs text-green-600 mb-1">Total Masuk</p>
            <p className="text-base font-medium text-green-700">
              {formatRupiah(income)}
            </p>
            <p className="text-xs text-green-500 mt-0.5">
              {transactions?.filter((t) => t.type === "income").length ?? 0}{" "}
              transaksi
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <p className="text-xs text-red-500 mb-1">Total Keluar</p>
            <p className="text-base font-medium text-red-600">
              {formatRupiah(expense)}
            </p>
            <p className="text-xs text-red-400 mt-0.5">
              {transactions?.filter((t) => t.type === "expense").length ?? 0}{" "}
              transaksi
            </p>
          </div>
          <div
            className={`rounded-xl p-3 border ${balance >= 0 ? "bg-indigo-50 border-indigo-100" : "bg-orange-50 border-orange-100"}`}
          >
            <p
              className={`text-xs mb-1 ${balance >= 0 ? "text-indigo-500" : "text-orange-500"}`}
            >
              Net Balance
            </p>
            <p
              className={`text-base font-medium ${balance >= 0 ? "text-indigo-700" : "text-orange-600"}`}
            >
              {formatRupiah(balance)}
            </p>
            <p
              className={`text-xs mt-0.5 ${balance >= 0 ? "text-indigo-400" : "text-orange-400"}`}
            >
              {balance >= 0 ? "Surplus" : "Deficit"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {income > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Penggunaan dana project</span>
              <span>{Math.round((expense / income) * 100)}% terpakai</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (expense / income) * 100)}%`,
                  backgroundColor: project.color,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabel transaksi project */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Semua Transaksi</h2>
          <span className="text-xs text-gray-400">
            {transactions?.length ?? 0} transaksi
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="text-left px-4 py-2">Tanggal</th>
              <th className="text-left px-4 py-2">Keterangan</th>
              <th className="text-left px-4 py-2">Dari / Ke</th>
              <th className="text-right px-4 py-2">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {!transactions || transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-10 text-gray-300 text-xs"
                >
                  Belum ada transaksi untuk project ini
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap text-xs">
                    {tx.transaction_date}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-gray-700 font-medium truncate max-w-xs">
                      {tx.description || tx.purpose || "—"}
                    </p>
                    {tx.notes && (
                      <p className="text-xs text-gray-400 truncate">
                        {tx.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs truncate max-w-30">
                    {tx.from_to || "—"}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-medium tabular-nums
                  ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}
                  >
                    {tx.type === "income" ? "+" : "−"}
                    {formatRupiah(tx.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
