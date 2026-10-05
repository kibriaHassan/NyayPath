import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { filterSuggestions } from '@/lib/bdLocations'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  hint?: string
  disabled?: boolean
  className?: string
}

export function SuggestInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  hint,
  disabled,
  className,
}: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const filtered = filterSuggestions(suggestions, value, 12)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className={cn('relative space-y-1.5', className)} ref={wrapRef}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        className={cn(
          'h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-teal focus:ring-2 focus:ring-teal/20',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-border bg-white py-1 shadow-lg">
          {filtered.map((item) => (
            <li key={item}>
              <button
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-sm text-ink hover:bg-teal/10',
                  item === value && 'bg-teal/5 font-semibold text-teal',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(item)
                  setOpen(false)
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
