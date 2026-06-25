import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts, useBanks } from "../../hooks/useBanks";
import { useCategories, useProjects } from "../../hooks/useCategories";
import { useCreateTransaction } from "../../hooks/useTransactions";
import { previewStatement } from "../../api/import";
import { formatRupiah, FUND_TYPES, MONTH_NAMES } from "../../utils";
import type { ParsedTransaction } from "../../types";

interface RowState extends ParsedTransaction {
  included: boolean;
  category_id: string;
  fund_type: string;
  project_id: string;
  is_transfer: boolean;
  to_account_id: string;
}

export default function ImportStatement() {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: banks } = useBanks();
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const create = useCreateTransaction();

  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState<RowState[]>([]);
  const [period, setPeriod] = useState<{ month: number; year: number } | null>(
    null,
  );
  const [detectedAccountName, setDetectedAccountName] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  const [bankFormat, setBankFormat] = useState<"bca" | "blu" | "jago">("bca");

  const mainAccounts =
    accounts?.filter((a) => !a.is_pocket && !a.is_deposit) ?? [];

  const handleFileChange = async (f: File) => {
    setFile(f);
    setIsLoading(true);
    try {
      const result = await previewStatement(f, bankFormat);

      // ... sisanya sama
      setPeriod(
        result.period_month && result.period_year
          ? { month: result.period_month, year: result.period_year }
          : null,
      );

      setDetectedAccountName(result.detected_account_name ?? null);

      // auto-select rekening berdasarkan nama yang terdeteksi di PDF
      if (result.detected_account_name && accounts) {
        const normalize = (s: string) =>
          s.toLowerCase().replace(/[^a-z0-9]/g, ""); // buang spasi & simbol

        const detected = normalize(result.detected_account_name);

        // 1. coba exact match dulu (setelah dinormalisasi)
        let matchedAccount = accounts.find(
          (a) => normalize(a.name) === detected,
        );

        // 2. kalau tidak ketemu, coba partial match (salah satu mengandung yang lain)
        if (!matchedAccount) {
          matchedAccount = accounts.find(
            (a) =>
              normalize(a.name).includes(detected) ||
              detected.includes(normalize(a.name)),
          );
        }

        // 3. khusus untuk "bluAccount" -> biasanya itu rekening utama "Blu Spending"
        if (!matchedAccount && detected.includes("bluaccount")) {
          matchedAccount = accounts.find(
            (a) => normalize(a.name).includes("bluspending") && !a.is_pocket,
          );
        }

        if (matchedAccount) {
          setAccountId(matchedAccount.id);
        }
      }

      const initialRows: RowState[] = result.transactions.map((tx) => {
        const matchedCategory = categories?.find(
          (c) =>
            c.name === tx.suggested_category &&
            (c.fund_type === tx.suggested_fund_type || c.fund_type === null),
        );

        // coba cocokkan nama pocket dari hint ke akun yang sudah ada
        let matchedPocketId = "";
        let autoIsTransfer = false;

        if (
          tx.is_likely_internal_transfer &&
          tx.internal_pocket_hint &&
          accounts
        ) {
          const hint = tx.internal_pocket_hint.toLowerCase().trim();
          const matchedAccount = accounts.find(
            (a) => a.name.toLowerCase().trim() === hint,
          );
          if (matchedAccount) {
            matchedPocketId = matchedAccount.id;
            autoIsTransfer = true;
          }
        }

        return {
          ...tx,
          included: true,
          category_id: autoIsTransfer ? "" : (matchedCategory?.id ?? ""),
          fund_type: tx.suggested_fund_type,
          project_id: "",
          is_transfer: autoIsTransfer,
          to_account_id: matchedPocketId,
        };
      });
      setRows(initialRows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membaca PDF";
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRow = (index: number, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  };

  const includedRows = rows.filter((r) => r.included);
  const totalIncome = includedRows
    .filter((r) => r.type === "income" && !r.is_transfer)
    .reduce((s, r) => s + r.amount, 0);
  const totalExpense = includedRows
    .filter((r) => r.type === "expense" && !r.is_transfer)
    .reduce((s, r) => s + r.amount, 0);
  const totalTransfer = includedRows.filter((r) => r.is_transfer).length;

  const handleSave = async () => {
    if (!accountId) {
      alert("Pilih rekening tujuan import");
      return;
    }
    if (includedRows.length === 0) {
      alert("Tidak ada transaksi yang dipilih");
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

    for (let i = 0; i < includedRows.length; i++) {
      const row = includedRows[i];

      const payload = {
        account_id: accountId,
        category_id: row.category_id || undefined,
        project_id: row.project_id || undefined,
        type: row.is_transfer ? "transfer" : row.type,
        amount: row.amount,
        description: row.description || undefined,
        from_to: row.from_to || undefined,
        fund_type: row.fund_type,
        transaction_date: row.date ?? new Date().toISOString().split("T")[0],
        to_account_id: row.is_transfer ? row.to_account_id : undefined,
      };

      try {
        await create.mutateAsync(
          payload as Parameters<typeof create.mutateAsync>[0],
        );
      } catch (err) {
        console.error("Gagal import baris", i, err);
      }

      setSaveProgress(i + 1);
    }

    setIsSaving(false);
    alert(`${includedRows.length} transaksi berhasil diimport`);
    navigate("/transactions");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium text-gray-800">
          Import e-Statement
        </h1>
        <p className="text-sm text-gray-400">Upload PDF mutasi rekening BCA</p>
      </div>

      {/* Upload area */}
      {!rows.length && (
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          {/* Pilihan format bank */}
          <div className="mb-6">
            <label className="text-xs text-gray-500 mb-2 block">
              Format e-Statement
            </label>
            <div className="flex gap-2">
              {[
                { val: "bca", label: "BCA" },
                { val: "blu", label: "Blu by BCA Digital" },
                { val: "jago", label: "Jago" },
              ].map((b) => (
                <button
                  key={b.val}
                  onClick={() => setBankFormat(b.val as "bca" | "blu" | "jago")}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors
        ${
          bankFormat === b.val
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
        }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-12 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
            />
            <p className="text-sm text-gray-500 mb-1">
              {isLoading
                ? "Membaca PDF..."
                : `Klik untuk pilih file PDF e-statement ${bankFormat === "blu" ? "Blu" : bankFormat === "jago" ? "Jago" : "BCA"}`}
            </p>
            <p className="text-xs text-gray-400">
              Hanya format PDF yang didukung
            </p>
          </label>
          {file && !isLoading && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              {file.name}
            </p>
          )}
        </div>
      )}

      {/* Preview & mapping */}
      {rows.length > 0 && (
        <>
          {/* Info periode + pilih rekening tujuan */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-gray-700 font-medium">
                {period
                  ? `${MONTH_NAMES[period.month - 1]} ${period.year}`
                  : "Periode tidak terdeteksi"}
              </p>
              <p className="text-xs text-gray-400">
                {rows.length} transaksi terdeteksi
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Import ke rekening
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 min-w-50"
              >
                <option value="">Pilih rekening...</option>
                {banks?.map((bank) => {
                  const bankAccounts =
                    accounts?.filter((a) => a.bank_id === bank.id) ?? [];
                  if (bankAccounts.length === 0) return null;
                  return (
                    <optgroup key={bank.id} label={bank.name}>
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.is_pocket ? `↳ ${acc.name}` : acc.name}
                          {acc.is_deposit ? " (deposito)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {detectedAccountName && (
                <p className="text-xs text-gray-400 mt-1">
                  Terdeteksi dari PDF:{" "}
                  <span className="font-medium">{detectedAccountName}</span>
                  {!accountId && " — tidak ditemukan otomatis, pilih manual"}
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-100">
              <p className="text-xs text-green-700 mb-0.5">
                Total Masuk (terpilih)
              </p>
              <p className="text-base font-medium text-green-700">
                {formatRupiah(totalIncome)}
              </p>
            </div>
            <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              <p className="text-xs text-red-600 mb-0.5">
                Total Keluar (terpilih)
              </p>
              <p className="text-base font-medium text-red-600">
                {formatRupiah(totalExpense)}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
              <p className="text-xs text-indigo-600 mb-0.5">
                Transfer Internal
              </p>
              <p className="text-base font-medium text-indigo-700">
                {totalTransfer} transaksi
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-0.5">Dipilih</p>
              <p className="text-base font-medium text-gray-700">
                {includedRows.length} / {rows.length}
              </p>
            </div>
          </div>

          {/* tambahkan ini */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                setRows((prev) => prev.map((r) => ({ ...r, included: true })))
              }
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Pilih Semua
            </button>
            <button
              onClick={() =>
                setRows((prev) => prev.map((r) => ({ ...r, included: false })))
              }
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Batal Pilih Semua
            </button>
            <button
              onClick={() =>
                setRows((prev) =>
                  prev.map((r) => ({ ...r, included: !r.is_transfer })),
                )
              }
              className="text-xs px-3 py-1.5 border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50"
            >
              Pilih Non-Transfer Saja
            </button>
          </div>

          {/* Tabel preview */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => r.included)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRows((prev) =>
                          prev.map((r) => ({ ...r, included: checked })),
                        );
                      }}
                    />
                  </th>
                  <th className="text-left px-3 py-2">Tanggal</th>
                  <th className="text-left px-3 py-2">Keterangan</th>
                  <th className="text-right px-3 py-2">Nominal</th>
                  <th className="text-left px-3 py-2 w-36">Dana</th>
                  <th className="text-left px-3 py-2 w-44">Kategori</th>
                  <th className="text-left px-3 py-2 w-40">Project</th>
                  <th className="text-left px-3 py-2 w-10">Transfer</th>
                  <th className="text-left px-3 py-2 w-40">Ke rekening</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const filteredCategories = categories?.filter(
                    (c) =>
                      c.type === row.type &&
                      (c.fund_type === row.fund_type || c.fund_type === null),
                  );

                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-50 ${!row.included ? "opacity-40" : ""}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={(e) =>
                            updateRow(i, { included: e.target.checked })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {row.day.toString().padStart(2, "0")}/
                        {row.month.toString().padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2">
                        <p
                          className="text-gray-700 truncate max-w-xs text-xs"
                          title={row.description}
                        >
                          {row.description}
                        </p>
                        {row.from_to && (
                          <p className="text-xs text-gray-400 truncate max-w-xs">
                            {row.from_to}
                          </p>
                        )}
                        {row.is_transfer && row.to_account_id && (
                          <span className="inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                            auto: transfer kantong
                          </span>
                        )}
                        {row.is_likely_internal_transfer &&
                          !row.to_account_id && (
                            <span className="inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                              kemungkinan transfer — pocket "
                              {row.internal_pocket_hint}" tidak ditemukan
                            </span>
                          )}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium tabular-nums text-xs
                        ${row.type === "income" ? "text-green-600" : "text-red-500"}`}
                      >
                        {row.type === "income" ? "+" : "−"}
                        {formatRupiah(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.fund_type}
                          onChange={(e) =>
                            updateRow(i, {
                              fund_type: e.target.value,
                              category_id: "",
                            })
                          }
                          disabled={row.is_transfer}
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white disabled:bg-gray-50"
                        >
                          {FUND_TYPES.map((ft) => (
                            <option key={ft.value} value={ft.value}>
                              {ft.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.category_id}
                          onChange={(e) =>
                            updateRow(i, { category_id: e.target.value })
                          }
                          disabled={row.is_transfer}
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white disabled:bg-gray-50"
                        >
                          <option value="">Pilih kategori...</option>
                          {filteredCategories?.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {row.fund_type === "project" && !row.is_transfer ? (
                          <select
                            value={row.project_id}
                            onChange={(e) =>
                              updateRow(i, { project_id: e.target.value })
                            }
                            className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                          >
                            <option value="">Pilih project...</option>
                            {projects?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.is_transfer}
                          onChange={(e) =>
                            updateRow(i, {
                              is_transfer: e.target.checked,
                              category_id: e.target.checked
                                ? ""
                                : row.category_id,
                              project_id: e.target.checked
                                ? ""
                                : row.project_id,
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        {row.is_transfer ? (
                          <select
                            value={row.to_account_id}
                            onChange={(e) =>
                              updateRow(i, { to_account_id: e.target.value })
                            }
                            className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                          >
                            <option value="">Pilih tujuan...</option>
                            {mainAccounts
                              .filter((a) => a.id !== accountId)
                              .map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            {(accounts ?? [])
                              .filter((a) => a.is_pocket && a.id !== accountId)
                              .map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  ↳ {acc.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setRows([]);
                setFile(null);
              }}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !accountId}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving
                ? `Menyimpan... (${saveProgress}/${includedRows.length})`
                : `Import ${includedRows.length} Transaksi`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
