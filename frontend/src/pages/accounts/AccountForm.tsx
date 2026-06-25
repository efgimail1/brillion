import { useState } from "react";
import { useBanks, useAccounts, useCreateAccount } from "../../hooks/useBanks";

interface Props {
  onClose: () => void;
}

export default function AccountForm({ onClose }: Props) {
  const { data: banks } = useBanks();
  const createAccount = useCreateAccount();

  const [form, setForm] = useState({
    bank_id: "",
    name: "",
    account_type: "checking",
    initial_balance: "",
    is_pocket: false,
    is_deposit: false,
    parent_account_id: "",
  });

  // ambil akun utama dari bank yang dipilih (untuk parent kantong)
  const { data: existingAccounts } = useAccounts(form.bank_id || undefined);
  const mainAccounts =
    existingAccounts?.filter((a) => !a.is_pocket && !a.is_deposit) ?? [];

  const set = (key: string, val: string | boolean | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.bank_id || !form.name) {
      alert("Bank dan nama rekening wajib diisi");
      return;
    }
    await createAccount.mutateAsync({
      bank_id: form.bank_id,
      name: form.name,
      account_type: form.is_deposit
        ? "deposit"
        : form.is_pocket
          ? "pocket"
          : "checking",
      initial_balance: parseFloat(form.initial_balance || "0"),
      is_pocket: form.is_pocket,
      is_deposit: form.is_deposit,
      parent_account_id: form.parent_account_id || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-800">
            Tambah Rekening
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Pilih Bank */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Bank</label>
            <select
              value={form.bank_id}
              onChange={(e) => set("bank_id", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Pilih bank...</option>
              {banks?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nama rekening */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Nama Rekening
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Contoh: BCA Utama, Kantong Makan, Deposito 3bln"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>

          {/* Tipe rekening */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Tipe</label>
            <div className="flex gap-2">
              {[
                { label: "Rekening Utama", pocket: false, deposit: false },
                { label: "Kantong", pocket: true, deposit: false },
                { label: "Deposito", pocket: false, deposit: true },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    set("is_pocket", opt.pocket);
                    set("is_deposit", opt.deposit);
                  }}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-colors
                    ${
                      form.is_pocket === opt.pocket &&
                      form.is_deposit === opt.deposit
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parent account — muncul kalau kantong */}
          {form.is_pocket && mainAccounts.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">
                Bagian dari rekening utama
              </label>
              <select
                value={form.parent_account_id}
                onChange={(e) => set("parent_account_id", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Pilih rekening utama (opsional)...</option>
                {mainAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Saldo awal */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Saldo Awal (Rp)
            </label>
            <input
              type="number"
              value={form.initial_balance}
              onChange={(e) => set("initial_balance", e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
            <p className="text-xs text-gray-400 mt-1">
              Isi saldo yang sudah ada saat ini di rekening ini
            </p>
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
            disabled={createAccount.isPending}
            className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {createAccount.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
