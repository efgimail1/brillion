interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export default function CurrencyInput({ value, onChange, placeholder = '0' }: Props) {
  const display = value
    ? Number(value).toLocaleString('id-ID')
    : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
    onChange(raw)
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
      />
    </div>
  )
}