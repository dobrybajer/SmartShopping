import React, { useState, useRef, useEffect } from 'react'
import type { Product, ProductCategory } from '@/services/productService'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Search, Globe, Home, Check } from 'lucide-react'

interface ProductAutocompleteProps {
  value: string
  onChange: (value: string) => void
  products: Product[]
  categories?: ProductCategory[]
  onSelectProduct: (product: Product) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  id?: string
}

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
  value,
  onChange,
  products,
  categories = [],
  onSelectProduct,
  placeholder = 'Wpisz lub wybierz nazwę produktu...',
  autoFocus = false,
  className,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Normalizacja do porównywania (uwzględniająca polskie znaki diakrytyczne i małe litery)
  const normalize = (str: string) =>
    str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Filtrowanie produktów zaczynających się od wpisanych liter (startsWith)
  const filteredProducts = React.useMemo(() => {
    if (!value.trim()) {
      return products
    }
    const query = normalize(value)
    return products.filter((p) => {
      const pName = normalize(p.name)
      return pName.startsWith(query)
    })
  }, [products, value])

  // Zamknięcie listy po kliknięciu poza komponentem
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Przewijanie podświetlonego elementu do widoku
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement
      if (item) {
        item.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  const handleSelect = (product: Product) => {
    onSelectProduct(product)
    onChange(product.name)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true)
        return
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredProducts.length - 1
      )
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        e.preventDefault()
        handleSelect(filteredProducts[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }
  }

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return null
    const cat = categories.find((c) => c.id === categoryId)
    return cat ? cat.name : null
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(0)
          }}
          onFocus={(e) => {
            setIsOpen(true)
            setHighlightedIndex(0)
            // Automatyczne podwinięcie do góry na urządzeniach mobilnych przy otwarciu klawiatury
            setTimeout(() => {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 300)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className="pr-9 h-11 text-xs bg-zinc-950 border-zinc-800 focus:border-emerald-500 rounded-xl"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
      </div>

      {/* Lista podpowiedzi autouzupełniania */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl backdrop-blur-lg animate-in fade-in-50 zoom-in-95">
          {filteredProducts.length > 0 ? (
            <ul ref={listRef} className="p-1 flex flex-col gap-0.5" role="listbox">
              {filteredProducts.map((p, index) => {
                const isSelected = p.name.toLowerCase() === value.trim().toLowerCase()
                const isHighlighted = index === highlightedIndex
                const categoryName = getCategoryName(p.category_id)

                return (
                  <li
                    key={p.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(p)
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors',
                      isHighlighted
                        ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                        : 'text-zinc-200 hover:bg-zinc-900',
                      isSelected && 'bg-emerald-500/20 text-emerald-400 font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : p.type === 'Global' ? (
                        <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      ) : (
                        <Home className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
                      )}
                      <span className="truncate">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {categoryName && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-zinc-900 text-zinc-400 border border-zinc-800 font-normal truncate max-w-[120px]"
                        >
                          {categoryName}
                        </Badge>
                      )}
                      <span className="font-mono text-[10px] text-zinc-500 font-semibold">
                        ({p.unit_type})
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="p-3 text-center text-xs text-zinc-400 flex flex-col gap-1">
              <span className="font-medium text-zinc-300">Brak produktu &quot;{value}&quot; na liście</span>
              <span className="text-[11px] text-zinc-500">
                Po zatwierdzeniu będziesz mógł dodać go do bazy produktów.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
