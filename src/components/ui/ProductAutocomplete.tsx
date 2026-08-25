import React, { useState, useRef, useEffect } from 'react'
import type { Product, ProductCategory } from '@/services/productService'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Search, Globe, Home, Check } from 'lucide-react'
import { useTranslation } from '@/i18n'

interface ProductAutocompleteProps {
  value: string
  onChange: (value: string) => void
  products: Product[]
  categories?: ProductCategory[]
  onSelectProduct: (product: Product) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  listClassName?: string
  id?: string
}

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
  value,
  onChange,
  products,
  categories = [],
  onSelectProduct,
  placeholder,
  autoFocus = false,
  className,
  listClassName,
  id
}) => {
  const { t, formatUnit } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Normalization for comparison
  const normalize = (str: string) =>
    str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const filteredProducts = React.useMemo(() => {
    if (!value.trim()) {
      return products
    }
    const query = normalize(value)
    const startsWithMatches: Product[] = []
    const containsMatches: Product[] = []

    for (const p of products) {
      const pName = normalize(p.name)
      if (pName.startsWith(query)) {
        startsWithMatches.push(p)
      } else if (pName.includes(query)) {
        containsMatches.push(p)
      }
    }

    return [...startsWithMatches, ...containsMatches]
  }, [products, value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement
      if (item && typeof item.scrollIntoView === 'function') {
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
    if (!cat) return null
    return t(`categories.${cat.name}` as any) !== `categories.${cat.name}`
      ? t(`categories.${cat.name}` as any)
      : cat.name
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
            setTimeout(() => {
              if (typeof e.target.scrollIntoView === 'function') {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }, 300)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('products.searchPlaceholder')}
          autoFocus={autoFocus}
          autoComplete="off"
          className="pr-9 h-11 text-xs bg-background border-input focus:border-primary rounded-xl"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 left-0 right-0 top-full mt-1.5 max-h-[260px] overflow-y-auto rounded-xl bg-card border border-border shadow-2xl backdrop-blur-lg animate-in fade-in-50 zoom-in-95 scrollbar-thin',
            listClassName
          )}
        >
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
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'text-foreground hover:bg-muted',
                      isSelected && 'bg-primary/20 text-primary font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : p.type === 'Global' ? (
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Home className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      )}
                      <span className="truncate">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {categoryName && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-background text-muted-foreground border border-border font-normal truncate max-w-[120px]"
                        >
                          {categoryName}
                        </Badge>
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                        ({formatUnit(p.unit_type)})
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground flex flex-col gap-1">
              <span className="font-medium text-foreground">{t('products.emptyTitle')}</span>
              <span className="text-[11px] text-muted-foreground">
                {t('products.emptySubtitle')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
