import { useState, useRef, useEffect } from 'react'
import { IconChevronLeft, IconChevronRight, IconCalendar, IconClose } from '../Icons/Icons'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay()
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function DatePicker({ value, onChange, placeholder = 'Selecionar data', label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = parseDate(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  function selectDay(day) {
    const date = new Date(viewYear, viewMonth, day)
    onChange(toDateStr(date))
    setOpen(false)
  }

  function clearDate(e) {
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const cells = []

  for (let i = 0; i < firstDay; i++) {
    cells.push(<span key={`empty-${i}`} className="datepicker-cell empty" />)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d)
    const isToday = date.getTime() === today.getTime()
    const isSelected = selected && date.getTime() === selected.getTime()
    const isPast = date < today

    cells.push(
      <button
        key={d}
        type="button"
        className={`datepicker-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${isPast ? ' past' : ''}`}
        onClick={() => selectDay(d)}
      >
        {d}
      </button>
    )
  }

  const displayValue = selected
    ? selected.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  return (
    <div className="datepicker-wrapper" ref={ref}>
      <div className="datepicker-trigger" onClick={() => setOpen((o) => !o)}>
        <IconCalendar size={14} />
        <span className={displayValue ? '' : 'datepicker-placeholder'}>
          {displayValue || placeholder}
        </span>
        {value && (
          <button type="button" className="datepicker-clear" onClick={clearDate} title="Limpar data">
            <IconClose size={12} />
          </button>
        )}
      </div>

      {open && (
        <div className="datepicker-dropdown">
          <div className="datepicker-header">
            <button type="button" className="datepicker-nav" onClick={prevMonth}>
              <IconChevronLeft size={14} />
            </button>
            <span className="datepicker-month-year">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" className="datepicker-nav" onClick={nextMonth}>
              <IconChevronRight size={14} />
            </button>
          </div>

          <div className="datepicker-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w} className="datepicker-weekday">{w}</span>
            ))}
          </div>

          <div className="datepicker-grid">
            {cells}
          </div>

          <div className="datepicker-footer">
            <button
              type="button"
              className="datepicker-today-btn"
              onClick={() => {
                setViewMonth(today.getMonth())
                setViewYear(today.getFullYear())
                selectDay(today.getDate())
              }}
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
