import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

const SearchBar = ({ value, onChange, onClose, placeholder = '검색', autoFocus = true }) => {
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleKeyDown = (e) => {
    if (e.key !== 'Escape') return
    // 입력값이 남아 있으면 먼저 비우고, 비어 있으면 검색창을 닫음
    if (value) onChange('')
    else onClose?.()
  }

  return (
    <div className="px-3 py-2 border-b border-border/50">
      <div className="flex items-center gap-2 px-2 h-8 border-2 border-border bg-background">
        <Search size={12} className="flex-shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="검색어 지우기"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

export default SearchBar
