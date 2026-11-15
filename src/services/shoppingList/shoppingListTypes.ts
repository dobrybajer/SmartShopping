import type { Database } from '@/types/supabase'

export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row']
export type ShoppingListItem = Database['public']['Tables']['shopping_list_items']['Row']

export interface ActiveListItemWithProduct extends Omit<ShoppingListItem, 'category_id' | 'in_pantry'> {
  category_id?: number | null
  in_pantry?: boolean | null
  category?: {
    id: number
    name: string
    sort_order: number
    is_non_food?: boolean
  } | null
  product?: {
    id: string
    name: string
    unit_type: 'g' | 'ml' | 'pcs'
    category_id: number | null
    category?: {
      id: number
      name: string
      sort_order: number
      is_non_food?: boolean
    }
  }
  ad_hoc_name?: string
}

export interface ActiveListWithDetails extends ShoppingList {
  items: ActiveListItemWithProduct[]
}

export interface ShoppingListSummary {
  id: string
  household_id: string
  name: string
  status: 'draft' | 'active' | 'archived'
  is_default: boolean
  target_date: string | null
  created_at: string | null
  updated_at: string | null
  completed_at?: string | null
  total_items: number
  unchecked_items: number
}

export interface HistoryListItemSummary {
  id: string
  is_checked: boolean | null
}

export interface HistoryShoppingList extends ShoppingList {
  items?: HistoryListItemSummary[] | null
}

export interface SummaryListItemJoinRow {
  id: string
  is_checked: boolean | null
  in_pantry?: boolean | null
}

export interface ArchivedSnapshotItem {
  id?: string
  product_id?: string | null
  total_quantity?: number
  is_checked?: boolean | null
  in_pantry?: boolean | null
  meal_plan_item_id?: string | null
}

export interface ArchivedItemsSnapshot {
  total_items?: number
  checked_items?: number
  items?: ArchivedSnapshotItem[]
}

export interface SummaryListJoinRow {
  id: string
  household_id: string | null
  name: string | null
  status: 'draft' | 'active' | 'archived' | null
  is_default: boolean
  target_date: string | null
  created_at: string | null
  updated_at: string | null
  items: SummaryListItemJoinRow[] | null
}

export interface MatchedHealedProduct {
  id: string
  name: string
  category_id: number | null
  category: {
    id: number
    name: string
    sort_order: number
    is_non_food?: boolean
  } | null
}

export type RawActiveListItemRow = ActiveListItemWithProduct

export interface ArchiveRpcUncheckedItem {
  id: string
  product_id: string
  name: string
  unit_type: Database['public']['Enums']['unit_enum']
  category_id?: number | null
  category_name?: string | null
  sort_order?: number | null
  quantity: number
  is_ad_hoc?: boolean
  meal_plan_item_id?: string | null
}

export interface ArchiveRpcResult {
  list_name?: string | null
  unchecked_items?: ArchiveRpcUncheckedItem[]
}

export interface CalendarPipelineItems {
  activeListItems: ShoppingListItem[]
  archivedListItems: ShoppingListItem[]
}
