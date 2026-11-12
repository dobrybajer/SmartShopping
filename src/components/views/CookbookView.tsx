import React from 'react'
import { useTranslation } from '@/i18n'
import { useCookbookController } from '@/hooks/useCookbookController'
import { CookbookMealCard } from '@/components/cookbook/CookbookMealCard'
import { MealDetailsSheet } from '@/components/dialogs/MealDetailsSheet'
import { AddMealSheet } from '@/components/dialogs/AddMealSheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Plus, Utensils, Globe, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export const CookbookView: React.FC = () => {
  const { t } = useTranslation()
  const ctrl = useCookbookController()

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('cookbook.searchPlaceholder')}
            value={ctrl.searchQuery}
            onChange={(e) => ctrl.setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>

        <Button
          onClick={() => ctrl.setIsAddMealOpen(true)}
          size="icon"
          className="h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shrink-0 shadow-lg cursor-pointer"
          title={t('cookbook.addRecipe')}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => ctrl.setTypeFilter('all')} className="shrink-0 cursor-pointer">
          <Badge
            variant={ctrl.typeFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1 text-xs"
          >
            {t('common.all')}
          </Badge>
        </button>

        <button
          onClick={() =>
            ctrl.setTypeFilter(ctrl.typeFilter === 'Household' ? 'all' : 'Household')
          }
          className="shrink-0 cursor-pointer"
        >
          <Badge
            variant={ctrl.typeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer px-2.5 py-1 text-xs flex items-center gap-1',
              ctrl.typeFilter === 'Household'
                ? 'bg-primary text-primary-foreground border-primary font-bold'
                : 'text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
            )}
          >
            <Home className="w-3 h-3" />
            <span>{t('navigation.households')}</span>
          </Badge>
        </button>

        <button
          onClick={() => ctrl.setTypeFilter(ctrl.typeFilter === 'Global' ? 'all' : 'Global')}
          className="shrink-0 cursor-pointer"
        >
          <Badge
            variant={ctrl.typeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer px-2.5 py-1 text-xs flex items-center gap-1',
              ctrl.typeFilter === 'Global'
                ? 'bg-sky-500 text-black border-sky-400 font-bold'
                : 'text-zinc-400 border-zinc-800 hover:border-sky-500/40 hover:text-sky-300'
            )}
          >
            <Globe className="w-3 h-3" />
            <span>{t('common.global')}</span>
          </Badge>
        </button>

        {ctrl.allTags.length > 0 && <span className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />}

        {ctrl.allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => ctrl.setSelectedTag(ctrl.selectedTag === tag ? null : tag)}
            className="shrink-0 cursor-pointer"
          >
            <Badge
              variant={ctrl.selectedTag === tag ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1 text-xs"
            >
              {tag}
            </Badge>
          </button>
        ))}
      </div>

      {ctrl.loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : ctrl.filteredMeals.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-2xl p-6">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Utensils className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-foreground">{t('cookbook.noRecipes')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('cookbook.subtitle')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {ctrl.filteredMeals.map((meal) => (
            <CookbookMealCard
              key={meal.id}
              meal={meal}
              pantryMapByProductId={ctrl.pantryMapByProductId}
              variant="mobile"
              onSelect={ctrl.openMealDetails}
              onDelete={ctrl.handleDeleteMeal}
            />
          ))}
        </div>
      )}

      <MealDetailsSheet
        meal={ctrl.activeMeal}
        open={ctrl.isDetailsOpen}
        onOpenChange={ctrl.setIsDetailsOpen}
      />

      <AddMealSheet
        open={ctrl.isAddMealOpen}
        onOpenChange={ctrl.setIsAddMealOpen}
        onMealCreated={ctrl.loadMeals}
      />
    </div>
  )
}
