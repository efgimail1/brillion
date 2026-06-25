import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/',             icon: '▦', label: 'Dashboard' },
  { to: '/transactions', icon: '⇅', label: 'Transaksi' },
  { to: '/accounts',     icon: '🏦', label: 'Bank & Rekening' },
  { to: '/projects',     icon: '💼', label: 'Project' },
  { to: '/reports',      icon: '📊', label: 'Laporan Bulanan' },
]

export default function Sidebar() {
  return (
    <aside className="w-52 min-h-screen bg-white border-r border-gray-100 flex flex-col py-4">
      <div className="px-5 mb-6">
        <div className="text-lg font-medium text-indigo-600">Dompet</div>
        <div className="text-xs text-gray-400">Personal Finance</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
               ${isActive
                 ? 'bg-indigo-50 text-indigo-700 font-medium'
                 : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}