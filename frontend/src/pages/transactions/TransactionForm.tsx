import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../../hooks/useBanks";
import { useCategories, useProjects } from "../../hooks/useCategories";
import {
  useCreateTransaction,
  useUpdateTransaction,
} from "../../hooks/useTransactions";
import CurrencyInput from "../../components/ui/CurrencyInput";
import { FUND_TYPES } from "../../utils";
import type { Transaction } from "../../types";

interface Props {
  onClose: () => void;
  editTransaction?: Transaction;
  duplicateFrom?: Transaction;
}

type AutofillData = {
  from_to: string;
  description: string;
  purpose: string;
};

const MONTH_NAMES_SHORT = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const getCategoryAutofill = (
  categoryName: string,
  transactionDate: string,
): AutofillData | undefined => {
  const date = transactionDate ? new Date(transactionDate) : new Date();
  const monthName = MONTH_NAMES_SHORT[date.getMonth()];
  const year = date.getFullYear();

  if (categoryName === "Bunga Bank") {
    return {
      from_to: "Bank",
      description: "Bunga bulan " + monthName + " " + year,
      purpose: "Bunga rekening",
    };
  }

  if (categoryName === "Bunga Deposito") {
    return {
      from_to: "Bank",
      description: "Bunga deposito bulan " + monthName + " " + year,
      purpose: "Bunga deposito",
    };
  }

  if (categoryName === "Pajak Bunga Bank") {
    return {
      from_to: "Bank - PPh Final",
      description: "Pajak bunga bulan " + monthName + " " + year,
      purpose: "Pajak bunga bank",
    };
  }

  return undefined;
};

export default function TransactionForm({
  onClose,
  editTransaction,
  duplicateFrom,
}: Props) {
  const navigate = useNavigate();

  const prefillSource = editTransaction ?? duplicateFrom;
  const isEditMode = !!editTransaction;

  const [form, setForm] = useState({
    account_id: prefillSource?.account_id ?? "",
    to_account_id: prefillSource?.to_account_id ?? "",
    category_id: prefillSource?.category_id ?? "",
    project_id: prefillSource?.project_id ?? "",
    type: (prefillSource?.type ?? "expense") as
      | "income"
      | "expense"
      | "transfer",
    amount: prefillSource?.amount?.toString() ?? "",
    description: prefillSource?.description ?? "",
    notes: prefillSource?.notes ?? "",
    from_to: prefillSource?.from_to ?? "",
    purpose: prefillSource?.purpose ?? "",
    fund_type: prefillSource?.fund_type ?? "pribadi",
    transaction_date: duplicateFrom
      ? new Date().toISOString().split("T")[0]
      : (prefillSource?.transaction_date ??
        new Date().toISOString().split("T")[0]),
  });

  // state untuk 2-step account selector
  // null = belum dipilih manual oleh user -> derive dari prefillSource
  const [selectedMainIdManual, setSelectedMainIdManual] = useState<
    string | null
  >(null);
  const [selectedToMainId, setSelectedToMainId] = useState("");

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories(
    form.type === "transfer" ? undefined : form.type,
    form.type === "transfer" ? undefined : form.fund_type,
  );
  const { data: projects } = useProjects();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();

  // derive selectedMainId dari prefillSource (edit/duplicate) tanpa useEffect
  const derivedMainIdFromPrefill = (() => {
    if (!prefillSource?.account_id || !accounts) return "";
    const acc = accounts.find((a) => a.id === prefillSource.account_id);
    if (!acc) return "";
    return acc.is_pocket && acc.parent_account_id
      ? acc.parent_account_id
      : acc.id;
  })();

  const selectedMainId = selectedMainIdManual ?? derivedMainIdFromPrefill;

  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories?.find((c) => c.id === categoryId);
    const autofill = selectedCategory
      ? getCategoryAutofill(selectedCategory.name, form.transaction_date)
      : undefined;

    setForm((prev) => ({
      ...prev,
      category_id: categoryId,
      from_to: autofill && !prev.from_to ? autofill.from_to : prev.from_to,
      description:
        autofill && !prev.description ? autofill.description : prev.description,
      purpose: autofill && !prev.purpose ? autofill.purpose : prev.purpose,
    }));
  };

  const handleDateChange = (newDate: string) => {
    const selectedCategory = categories?.find((c) => c.id === form.category_id);
    const autofill = selectedCategory
      ? getCategoryAutofill(selectedCategory.name, newDate)
      : undefined;

    setForm((prev) => ({
      ...prev,
      transaction_date: newDate,
      description:
        autofill && prev.description.includes("bulan")
          ? autofill.description
          : prev.description,
    }));
  };

  const isTransfer = form.type === "transfer";
  const isProject = form.fund_type === "project";

  // akun utama = bukan pocket dan bukan deposito
  const mainAccounts =
    accounts?.filter((a) => !a.is_pocket && !a.is_deposit) ?? [];
  const deposits = accounts?.filter((a) => a.is_deposit) ?? [];

  // pocket dari akun utama yang dipilih (rekening asal)
  const pocketsOfSelected =
    accounts?.filter(
      (a) => a.is_pocket && a.parent_account_id === selectedMainId,
    ) ?? [];

  // pocket dari akun utama tujuan (transfer)
  const pocketsOfSelectedTo =
    accounts?.filter(
      (a) => a.is_pocket && a.parent_account_id === selectedToMainId,
    ) ?? [];

  // handler saat pilih akun utama (rekening asal / tujuan)
  const handleSelectMain = (
    mainId: string,
    field: "account_id" | "to_account_id",
  ) => {
    if (field === "account_id") {
      setSelectedMainIdManual(mainId);
    } else {
      setSelectedToMainId(mainId);
    }

    const pockets =
      accounts?.filter((a) => a.is_pocket && a.parent_account_id === mainId) ??
      [];
    if (pockets.length === 0) {
      set(field, mainId);
    } else {
      set(field, "");
    }
  };

  const filteredCategories = categories;

  const handleSubmit = async () => {
    if (!form.account_id || !form.amount || !form.transaction_date) {
      alert("Rekening, nominal, dan tanggal wajib diisi");
      return;
    }
    if (isTransfer && !form.to_account_id) {
      alert("Pilih rekening tujuan transfer");
      return;
    }
    if (isProject && !form.project_id) {
      alert("Pilih project untuk dana project");
      return;
    }

    const payload = {
      account_id: form.account_id,
      to_account_id: form.to_account_id || undefined,
      category_id: form.category_id || undefined,
      project_id: form.project_id || undefined,
      type: form.type,
      amount: parseFloat(form.amount),
      description: isTransfer
        ? `Transfer ke ${accounts?.find((a) => a.id === form.to_account_id)?.name}`
        : form.description || undefined,
      notes: form.notes || undefined,
      from_to: isTransfer
        ? accounts?.find((a) => a.id === form.to_account_id)?.name
        : form.from_to || undefined,
      purpose: form.purpose || undefined,
      fund_type: form.fund_type,
      transaction_date: form.transaction_date,
    };

    if (isEditMode && editTransaction) {
      await update.mutateAsync({
        id: editTransaction.id,
        data: payload as Partial<Transaction>,
      });
    } else {
      await create.mutateAsync(
        payload as Parameters<typeof create.mutateAsync>[0],
      );
    }

    onClose();
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-800">
            {isEditMode
              ? "Edit Transaksi"
              : duplicateFrom
                ? "Duplikat Transaksi"
                : "Tambah Transaksi"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Tipe */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Tipe</label>
            <div className="flex gap-2">
              {[
                {
                  val: "income",
                  label: "Pemasukan",
                  cls: "bg-green-500 text-white",
                },
                {
                  val: "expense",
                  label: "Pengeluaran",
                  cls: "bg-red-400 text-white",
                },
                {
                  val: "transfer",
                  label: "Transfer",
                  cls: "bg-indigo-500 text-white",
                },
              ].map((t) => (
                <button
                  key={t.val}
                  onClick={() => set("type", t.val)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors
                    ${form.type === t.val ? t.cls : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rekening asal — 2 step: akun utama, lalu kantong */}
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">
                {isTransfer ? "Rekening Asal" : "Rekening"}
              </label>
              <select
                value={selectedMainId}
                onChange={(e) => handleSelectMain(e.target.value, "account_id")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Pilih rekening...</option>
                {mainAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
                {deposits.length > 0 && (
                  <optgroup label="Deposito">
                    {deposits.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedMainId && pocketsOfSelected.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Kantong
                </label>
                <select
                  value={form.account_id}
                  onChange={(e) => set("account_id", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Pilih kantong...</option>
                  <option value={selectedMainId}>
                    {mainAccounts.find((a) => a.id === selectedMainId)?.name}{" "}
                    (rekening utama)
                  </option>
                  {pocketsOfSelected.map((pocket) => (
                    <option key={pocket.id} value={pocket.id}>
                      {pocket.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Rekening tujuan — transfer, 2 step juga */}
          {isTransfer && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Rekening Tujuan
                </label>
                <select
                  value={selectedToMainId}
                  onChange={(e) =>
                    handleSelectMain(e.target.value, "to_account_id")
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Pilih rekening tujuan...</option>
                  {mainAccounts
                    .filter((a) => a.id !== selectedMainId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  {deposits.length > 0 && (
                    <optgroup label="Deposito">
                      {deposits
                        .filter((a) => a.id !== selectedMainId)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {selectedToMainId && pocketsOfSelectedTo.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Kantong Tujuan
                  </label>
                  <select
                    value={form.to_account_id}
                    onChange={(e) => set("to_account_id", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="">Pilih kantong...</option>
                    <option value={selectedToMainId}>
                      {
                        mainAccounts.find((a) => a.id === selectedToMainId)
                          ?.name
                      }{" "}
                      (rekening utama)
                    </option>
                    {pocketsOfSelectedTo.map((pocket) => (
                      <option key={pocket.id} value={pocket.id}>
                        {pocket.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Nominal */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Nominal
            </label>
            <CurrencyInput
              value={form.amount}
              onChange={(val) => set("amount", val)}
            />
          </div>

          {/* Tanggal */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Tanggal
            </label>
            <input
              type="date"
              value={form.transaction_date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>

          {/* Field khusus non-transfer */}
          {!isTransfer && (
            <>
              {/* Dana */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Dana
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {FUND_TYPES.map((ft) => (
                    <button
                      key={ft.value}
                      onClick={() => {
                        set("fund_type", ft.value);
                        set("category_id", "");
                      }}
                      className={`py-2 px-1 rounded-lg text-xs text-center transition-colors border
                        ${
                          form.fund_type === ft.value
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      <div>{ft.icon}</div>
                      <div className="mt-0.5 leading-tight">{ft.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Project picker */}
              {isProject && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-amber-700 font-medium">
                      Pilih Project
                    </label>
                    <button
                      onClick={() => {
                        onClose();
                        navigate("/projects");
                      }}
                      className="text-xs text-amber-600 hover:underline"
                    >
                      + Buat project baru →
                    </button>
                  </div>
                  {projects &&
                  projects.filter((p) => p.status === "active").length > 0 ? (
                    <div className="space-y-1.5">
                      {projects
                        .filter((p) => p.status === "active")
                        .map((proj) => (
                          <label
                            key={proj.id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border transition-colors
                            ${
                              form.project_id === proj.id
                                ? "bg-amber-100 border-amber-300"
                                : "bg-white border-gray-100 hover:bg-amber-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="project"
                              value={proj.id}
                              checked={form.project_id === proj.id}
                              onChange={(e) =>
                                set("project_id", e.target.value)
                              }
                              className="accent-amber-500"
                            />
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: proj.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 font-medium truncate">
                                {proj.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {proj.code}
                              </p>
                            </div>
                          </label>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-xs text-amber-600 mb-2">
                        Belum ada project aktif
                      </p>
                      <button
                        onClick={() => {
                          onClose();
                          navigate("/projects");
                        }}
                        className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                      >
                        Buat project sekarang
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Kategori */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Kategori
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Pilih kategori...</option>
                  {filteredCategories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dari / Ke */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  {form.type === "income"
                    ? "Dari siapa / sumber"
                    : "Ke siapa / tujuan"}
                </label>
                <input
                  type="text"
                  value={form.from_to}
                  onChange={(e) => set("from_to", e.target.value)}
                  placeholder={
                    form.type === "income"
                      ? "Contoh: PT Maju Jaya"
                      : "Contoh: Alfamart"
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>

              {/* Keterangan / Memo */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Contoh: bensin tol subang, makan siang"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>

              {/* Untuk apa — hanya muncul untuk dana Project */}
              {isProject && (
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Untuk keperluan apa{" "}
                    <span className="text-gray-400 font-normal">
                      (opsional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.purpose}
                    onChange={(e) => set("purpose", e.target.value)}
                    placeholder="Contoh: Biaya operasional project"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  />
                </div>
              )}
            </>
          )}

          {/* Catatan tambahan — opsional, hanya untuk info ekstra */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Catatan tambahan{" "}
              <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Info tambahan jika diperlukan..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : isEditMode ? "Update" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
