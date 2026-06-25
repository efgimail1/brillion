import { useState } from "react";
import {
  useTransactions,
  useDeleteTransaction,
} from "../../hooks/useTransactions";
import { useNavigate } from "react-router-dom";
import { useAccounts, useBanks } from "../../hooks/useBanks";
import { useCategories } from "../../hooks/useCategories";
import { formatRupiah, FUND_TYPE_LABEL, FUND_TYPE_COLOR } from "../../utils";
import TransactionForm from "./TransactionForm";
import type { Transaction } from "../../types";

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [duplicateTx, setDuplicateTx] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterFund, setFilterFund] = useState("");
  const [filterAcct, setFilterAcct] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const navigate = useNavigate();

  const { data: transactions, isLoading } = useTransactions({
    type: filterType || undefined,
    fund_type: filterFund || undefined,
    account_id: filterAcct || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    limit: 100,
  });

  const { data: accounts } = useAccounts();
  const { data: banks } = useBanks();
  const { data: categories } = useCategories();
  const deleteTx = useDeleteTransaction();

  const totalIncome =
    transactions
      ?.filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0) ?? 0;
  const totalExpense =
    transactions
      ?.filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0) ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-800">Transaksi</h1>
          <p className="text-sm text-gray-400">
            {transactions?.length ?? 0} transaksi ditemukan
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/transactions/import")}
            className="px-4 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
          >
            Import Statement
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            + Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-100">
          <p className="text-xs text-green-700 mb-0.5">Total Masuk</p>
          <p className="text-base font-medium text-green-700">
            {formatRupiah(totalIncome)}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-100">
          <p className="text-xs text-red-600 mb-0.5">Total Keluar</p>
          <p className="text-base font-medium text-red-600">
            {formatRupiah(totalExpense)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <p className="text-xs text-gray-500 mb-0.5">Net</p>
          <p
            className={`text-base font-medium ${totalIncome - totalExpense >= 0 ? "text-green-700" : "text-red-600"}`}
          >
            {formatRupiah(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600"
        >
          <option value="">Semua tipe</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
          <option value="transfer">Transfer</option>
        </select>

        <select
          value={filterFund}
          onChange={(e) => setFilterFund(e.target.value)}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600"
        >
          <option value="">Semua dana</option>
          <option value="pribadi">Pribadi</option>
          <option value="project">Project</option>
          <option value="tpp">TPP</option>
          <option value="professional_fee">Professional Fee</option>
          <option value="investasi">Investasi</option>
        </select>

        <select
          value={filterAcct}
          onChange={(e) => setFilterAcct(e.target.value)}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600"
        >
          <option value="">Semua rekening</option>
          {accounts?.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600"
        />
        <span className="text-gray-400 self-center text-sm">s/d</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600"
        />

        {(filterType || filterFund || filterAcct || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setFilterType("");
              setFilterFund("");
              setFilterAcct("");
              setDateFrom("");
              setDateTo("");
            }}
            className="text-sm text-indigo-500 hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Tanggal</th>
              <th className="text-left px-4 py-3">Rekening</th>
              <th className="text-left px-4 py-3">Keterangan</th>
              <th className="text-left px-4 py-3">Dari / Ke</th>
              <th className="text-left px-4 py-3">Kategori</th>
              <th className="text-left px-4 py-3">Dana</th>
              <th className="text-right px-4 py-3">Nominal</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-300">
                  Memuat...
                </td>
              </tr>
            ) : transactions?.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-300">
                  Belum ada transaksi
                </td>
              </tr>
            ) : (
              transactions?.map((tx) => {
                const acc = accounts?.find((a) => a.id === tx.account_id);
                const bank = banks?.find((b) => b.id === acc?.bank_id);
                const cat = categories?.find((c) => c.id === tx.category_id);

                return (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {tx.transaction_date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {bank && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: bank.color }}
                          />
                        )}
                        <span className="text-gray-600 text-xs">
                          {acc?.name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-medium truncate max-w-xs">
                        {tx.description || tx.purpose || "—"}
                      </p>
                      {tx.notes && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">
                          {tx.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-30">
                      {tx.from_to || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {cat ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-gray-600 text-xs truncate max-w-25">
                            {cat.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${FUND_TYPE_COLOR[tx.fund_type] ?? "bg-gray-100 text-gray-500"}`}
                      >
                        {FUND_TYPE_LABEL[tx.fund_type] ?? tx.fund_type}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums
                      ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}
                    >
                      {tx.type === "income" ? "+" : "−"}
                      {formatRupiah(Number(tx.amount || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditTx(tx)}
                          title="Edit"
                          className="text-gray-400 hover:text-indigo-500 text-xs px-1.5 py-1 rounded hover:bg-indigo-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDuplicateTx(tx)}
                          title="Duplikat"
                          className="text-gray-400 hover:text-indigo-500 text-xs px-1.5 py-1 rounded hover:bg-indigo-50 transition-colors"
                        >
                          Salin
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Hapus transaksi ini?"))
                              deleteTx.mutate(tx.id);
                          }}
                          title="Hapus"
                          className="text-gray-300 hover:text-red-400 text-xs px-1.5 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}

      {editTx && (
        <TransactionForm
          onClose={() => setEditTx(null)}
          editTransaction={editTx}
        />
      )}

      {duplicateTx && (
        <TransactionForm
          onClose={() => setDuplicateTx(null)}
          duplicateFrom={duplicateTx}
        />
      )}
    </div>
  );
}