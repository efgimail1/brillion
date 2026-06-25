import { useState } from 'react'
import { useBanks, useAccounts } from '../../hooks/useBanks'
import { formatRupiah } from '../../utils'
import AccountForm from './AccountForm'
import type { Account } from '../../types'

export default function Accounts() {
  const { data: banks    } = useBanks()
  const { data: accounts } = useAccounts()
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const totalBalance = accounts?.reduce((s, a) => s + Number(a.balance), 0) ?? 0

  const groupTotal = (mainAccount: Account, pockets: Account[]) =>
    Number(mainAccount.balance) + pockets.reduce((s, p) => s + Number(p.balance), 0)

  const byBank = banks?.map(bank => {
    const bankAccounts = accounts?.filter(a => a.bank_id === bank.id) ?? []

    const mainAccounts  = bankAccounts.filter(a => !a.is_pocket && !a.is_deposit)
    const deposits      = bankAccounts.filter(a => a.is_deposit)
    const orphanPockets = bankAccounts.filter(a => a.is_pocket && !a.parent_account_id)

    const pocketsOf = (mainId: string) =>
      bankAccounts.filter(a => a.is_pocket && a.parent_account_id === mainId)

    const totalPockets = bankAccounts.filter(a => a.is_pocket).length

    return {
      bank,
      mainAccounts,
      deposits,
      orphanPockets,
      pocketsOf,
      totalPockets,
      total: bankAccounts.reduce((s, a) => s + Number(a.balance), 0),
      count: bankAccounts.length,
    }
  })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-800">Bank & Rekening</h1>
          <p className="text-sm text-gray-400">
            Total saldo:{' '}
            <span className="text-indigo-600 font-medium">
              {formatRupiah(totalBalance)}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          + Tambah Rekening
        </button>
      </div>

      {/* Kartu per bank */}
      <div className="grid grid-cols-2 gap-4">
        {byBank?.map(({ bank, mainAccounts, deposits, orphanPockets, pocketsOf, totalPockets, total, count }) => (
          <div
            key={bank.id}
            className="bg-white rounded-xl border border-gray-100 overflow-hidden"
          >
            {/* Header bank */}
            <div
              className="px-4 py-3.5 flex items-center justify-between"
              style={{ borderLeft: `4px solid ${bank.color}` }}
            >
              <div>
                <p className="font-medium text-gray-800 text-[15px]">{bank.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {mainAccounts.length} {mainAccounts.length === 1 ? 'rekening' : 'rekening'}
                  {totalPockets > 0 && ` · ${totalPockets} kantong`}
                  {deposits.length > 0 && ` · ${deposits.length} deposito`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-800 text-[15px]">{formatRupiah(total)}</p>
                <p className="text-xs text-gray-400">total saldo</p>
              </div>
            </div>

            {count === 0 && (
              <p className="text-xs text-gray-300 text-center py-4 border-t border-gray-50">
                Belum ada rekening
              </p>
            )}

            {/* Akun utama + pocket-nya (collapsible) */}
            {mainAccounts.map(main => {
              const pockets    = pocketsOf(main.id)
              const grandTotal = groupTotal(main, pockets)
              const isOpen     = expanded[main.id] ?? false
              const hasPockets = pockets.length > 0

              return (
                <div key={main.id}>
                  {/* Row akun utama */}
                  <div
                    onClick={() => hasPockets && toggle(main.id)}
                    className={`flex items-center justify-between px-4 py-3 border-t border-gray-50 transition-colors
                      ${hasPockets ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3.5 text-gray-300 text-xs transition-transform inline-block
                        ${hasPockets ? '' : 'opacity-0'} ${isOpen ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{main.name}</p>
                        {hasPockets && (
                          <p className="text-xs text-gray-400">
                            {pockets.length} kantong
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">
                        {formatRupiah(grandTotal)}
                      </p>
                      {hasPockets && (
                        <p className="text-xs text-gray-400">termasuk kantong</p>
                      )}
                    </div>
                  </div>

                  {/* Pocket-pocket — collapsible */}
                  {hasPockets && isOpen && (
                    <div className="bg-gray-50">
                      {pockets.map(pocket => (
                        <div
                          key={pocket.id}
                          className="flex items-center justify-between pl-11 pr-4 py-2 not-first:border-t not-first:border-gray-100"
                        >
                          <span className="text-[13px] text-gray-500">{pocket.name}</span>
                          <span className="text-[13px] font-medium text-gray-700">
                            {formatRupiah(Number(pocket.balance))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pocket tanpa parent (jika ada) */}
            {orphanPockets.map(pocket => (
              <div
                key={pocket.id}
                className="flex items-center justify-between px-4 py-3 border-t border-gray-50"
              >
                <span className="text-sm text-gray-600">{pocket.name}</span>
                <span className="text-sm font-medium text-gray-800">
                  {formatRupiah(Number(pocket.balance))}
                </span>
              </div>
            ))}

            {/* Deposito */}
            {deposits.map(dep => (
              <div
                key={dep.id}
                className="flex items-center justify-between px-4 py-3 border-t border-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    Deposito
                  </span>
                  <span className="text-sm text-gray-600">{dep.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {formatRupiah(Number(dep.balance))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {showForm && <AccountForm onClose={() => setShowForm(false)} />}
    </div>
  )
}