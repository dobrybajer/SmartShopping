import React from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Minus, Flame, Sparkles } from 'lucide-react'

interface ProductMacroFieldsProps {
  unitSuffix: string
  kcal: number | ''
  setKcal: React.Dispatch<React.SetStateAction<number | ''>>
  protein: number | ''
  setProtein: React.Dispatch<React.SetStateAction<number | ''>>
  carbs: number | ''
  setCarbs: React.Dispatch<React.SetStateAction<number | ''>>
  fat: number | ''
  setFat: React.Dispatch<React.SetStateAction<number | ''>>
}

const handleStepValue = (
  setter: React.Dispatch<React.SetStateAction<number | ''>>,
  curr: number | '',
  step: number,
  min = 0
) => {
  const val = typeof curr === 'number' ? curr : 0
  const nextVal = Math.max(min, Math.round((val + step) * 10) / 10)
  setter(nextVal)
}

const handleNumericInput = (
  setter: React.Dispatch<React.SetStateAction<number | ''>>,
  valueStr: string
) => {
  if (valueStr === '') {
    setter('')
    return
  }
  const parsed = parseFloat(valueStr)
  if (!isNaN(parsed) && parsed >= 0) {
    setter(parsed)
  }
}

export const ProductMacroFields: React.FC<ProductMacroFieldsProps> = ({
  unitSuffix,
  kcal,
  setKcal,
  protein,
  setProtein,
  carbs,
  setCarbs,
  fat,
  setFat
}) => {
  const { t } = useTranslation()

  const fields = [
    {
      key: 'kcal',
      label: t('dialogs.productForm.kcalLabel'),
      unit: t('common.kcal'),
      value: kcal,
      setter: setKcal,
      buttonStep: 100,
      inputStep: 1,
      showFlame: true,
      labelClass: 'text-foreground flex items-center gap-1',
      inputClass: 'font-bold text-primary'
    },
    {
      key: 'protein',
      label: t('dialogs.productForm.proteinLabel'),
      unit: 'g',
      value: protein,
      setter: setProtein,
      buttonStep: 1,
      inputStep: 0.1,
      showFlame: false,
      labelClass: 'text-blue-400',
      inputClass: 'font-semibold text-blue-400'
    },
    {
      key: 'carbs',
      label: t('dialogs.productForm.carbsLabel'),
      unit: 'g',
      value: carbs,
      setter: setCarbs,
      buttonStep: 1,
      inputStep: 0.1,
      showFlame: false,
      labelClass: 'text-amber-400',
      inputClass: 'font-semibold text-amber-400'
    },
    {
      key: 'fat',
      label: t('dialogs.productForm.fatLabel'),
      unit: 'g',
      value: fat,
      setter: setFat,
      buttonStep: 1,
      inputStep: 0.1,
      showFlame: false,
      labelClass: 'text-rose-400',
      inputClass: 'font-semibold text-rose-400'
    }
  ]

  return (
    <div className="space-y-3.5 p-4 rounded-2xl bg-background border border-border animate-in fade-in-50 zoom-in-95 duration-200">
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {t('products.macrosPer100')} ({unitSuffix})
        </span>
        <span className="text-[10px] text-muted-foreground">±100 kcal, ±1 P/C/F</span>
      </div>

      {fields.map((field) => (
        <div key={field.key} className="flex items-center justify-between gap-3">
          <div className="min-w-28">
            <span className={`text-xs font-semibold ${field.labelClass}`}>
              {field.showFlame && <Flame className="w-3.5 h-3.5 text-amber-400" />}
              {field.label}
            </span>
            <span
              className={`text-[10px] text-muted-foreground ${field.showFlame ? 'block' : 'ml-1'}`}
            >
              {field.unit}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleStepValue(field.setter, field.value, -field.buttonStep)}
              className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <Input
              type="number"
              min={0}
              step={field.inputStep}
              placeholder="0"
              value={field.value}
              onChange={(e) => handleNumericInput(field.setter, e.target.value)}
              className={`h-9 bg-background border-input text-center text-sm focus-visible:ring-primary rounded-lg ${field.inputClass}`}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleStepValue(field.setter, field.value, field.buttonStep)}
              className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

