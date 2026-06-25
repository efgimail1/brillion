import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/dashboard/Dashboard'
import Transactions from './pages/transactions/Transactions'
import Accounts from './pages/accounts/Accounts'
import Projects from './pages/projects/Projects'
import ProjectDetail from './pages/projects/ProjectDetail'
import MonthlyReport from './pages/reports/MonthlyReport'   // ← tambah
import ImportStatement from './pages/transactions/ImportStatement'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index               element={<Dashboard />}     />
        <Route path="transactions" element={<Transactions />}  />
        <Route path="accounts"     element={<Accounts />}      />
        <Route path="projects"     element={<Projects />}      />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="reports"      element={<MonthlyReport />} /> 
        <Route path="transactions/import" element={<ImportStatement />} />
      </Route>
    </Routes>
  )
}