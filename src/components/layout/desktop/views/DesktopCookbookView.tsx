import React from 'react'
import { useTranslation } from '@/i18n'
import { useCookbookController } from '@/hooks/useCookbookController'
import { CookbookMealCard } from '@/components/cookbook/CookbookMealCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MealDetailsSheet } from '@/components/dialogs/MealDetailsSheet'
import { AddMealSheet } from '@/components/dialogs/AddMealSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { Search, Plus, Home, Globe, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopCookbookView: React.FC = () => {
  const { t } = useTranslation()
  const ctrl = useCookbookController({ listenToRefreshEvent: true })

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('cookbook.searchPlaceholder')}
            value={ctrl.searchQuery}
            onChange={(e) => ctrl.setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background border-input focus-visible:ring-primary rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={ctrl.openNewMeal}
            className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('cookbook.addRecipe')}</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap pb-1">
        <button onClick={() => ctrl.setTypeFilter('all')} className="cursor-pointer">
          <Badge
            variant={ctrl.typeFilter === 'all' ? 'default' : 'outline'}
            className={cn(
              'px-3.5 py-1.5 text-xs transition-all font-medium',
              ctrl.typeFilter === 'all'
                ? 'bg-foreground text-background border-foreground font-bold shadow-xs'
                : 'text-muted-foreground border-border hover:border-border/80'
            )}
          >
            {t('common.all')} ({ctrl.totalCount})
          </Badge>
        </button>

        <button
          onClick={() =>
            ctrl.setTypeFilter(ctrl.typeFilter === 'Household' ? 'all' : 'Household')
          }
          className="cursor-pointer"
        >
          <Badge
            variant={ctrl.typeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              'px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium',
              ctrl.typeFilter === 'Household'
                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                : 'text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>
              {t('navigation.households')} ({ctrl.householdCount})
            </span>
          </Badge>
        </button>

        <button
          onClick={() => ctrl.setTypeFilter(ctrl.typeFilter === 'Global' ? 'all' : 'Global')}
          className="cursor-pointer"
        >
          <Badge
            variant={ctrl.typeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              'px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium',
              ctrl.typeFilter === 'Global'
                ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-xs'
                : 'text-muted-foreground border-border hover:border-sky-500/40 hover:text-sky-300'
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>
              {t('common.global')} ({ctrl.globalCount})
            </span>
          </Badge>
        </button>

        {ctrl.allTags.length > 0 && <span className="h-5 w-px bg-border mx-1" />}

        {ctrl.allTags.map((tag) => {
          const isSelected = ctrl.selectedTag === tag
          return (
            <button
              key={tag}
              onClick={() => ctrl.setSelectedTag(isSelected ? null : tag)}
              className="cursor-pointer"
            >
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'px-3 py-1.5 text-xs transition-all',
                  isSelected
                    ? 'bg-card text-primary border-primary/50 font-bold'
                    : 'text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
                )}
              >
                #{tag}
              </Badge>
            </button>
          )
        })}
      </div>

      {ctrl.loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : ctrl.filteredMeals.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-4">
            <Utensils className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-foreground">{t('cookbook.noRecipes')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {ctrl.searchQuery || ctrl.typeFilter !== 'all' || ctrl.selectedTag
              ? t('products.emptySubtitle')
              : t('cookbook.emptySubtitle')}
          </p>
          {(ctrl.searchQuery || ctrl.typeFilter !== 'all' || ctrl.selectedTag) && (
            <Button
              variant="outline"
              size="sm"
              onClick={ctrl.resetFilters}
              className="mt-4 text-xs border-border bg-card text-muted-foreground hover:bg-muted rounded-xl cursor-pointer"
            >
              {t('common.clear')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ctrl.filteredMeals.map((meal) => (
            <CookbookMealCard
              key={meal.id}
              meal={meal}
              pantryMapByProductId={ctrl.pantryMapByProductId}
              pantryItemsByParentId={ctrl.pantryItemsByParentId}
              isJustAdded={ctrl.addedMealId === meal.id}
              variant="desktop"
              onSelect={ctrl.openMealDetails}
              onQuickAdd={ctrl.handleQuickAdd}
              onEdit={ctrl.handleEditMeal}
              onDelete={ctrl.handleDeleteMeal}
            />
          ))}
        </div>
      )}

      <MealDetailsSheet
        meal={ctrl.activeMeal}
        open={ctrl.isDetailsOpen}
        onOpenChange={ctrl.setIsDetailsOpen}
        onEdit={(meal) => ctrl.handleEditMeal(undefined, meal)}
      />

      <AddMealSheet
        open={ctrl.isAddMealOpen}
        onOpenChange={ctrl.handleAddMealOpenChange}
        mealToEdit={ctrl.mealToEdit}
        onMealSaved={ctrl.loadMeals}
      />

      <ConfirmDeleteDialog
        open={ctrl.isDeleteModalOpen}
        onOpenChange={ctrl.setIsDeleteModalOpen}
        itemName={ctrl.mealToDelete?.name}
        onConfirm={ctrl.handleConfirmDeleteMeal}
      />
    </div>
  )
}
