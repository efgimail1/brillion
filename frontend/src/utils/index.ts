export const formatRupiah = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)

export const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

export const FUND_TYPES = [
  { value: 'pribadi',          label: 'Pribadi',          color: 'bg-blue-100 text-blue-800',    icon: '👤' },
  { value: 'project',          label: 'Project',          color: 'bg-amber-100 text-amber-800',  icon: '🏢' },
  { value: 'tpp',              label: 'TPP',              color: 'bg-teal-100 text-teal-800',    icon: '🏗️' },
  { value: 'professional_fee', label: 'Professional Fee', color: 'bg-purple-100 text-purple-800',icon: '💼' },
  { value: 'investasi',        label: 'Investasi',        color: 'bg-green-100 text-green-800',  icon: '💰' },
]

export const FUND_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  FUND_TYPES.map(f => [f.value, f.label])
)

export const FUND_TYPE_COLOR: Record<string, string> = Object.fromEntries(
  FUND_TYPES.map(f => [f.value, f.color])
)