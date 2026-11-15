import { supabase } from '@/lib/supabase'
import { isUuid } from '@/lib/utils'
import {
  generateUuidV4,
  saveStoredWeeklyTemplates
} from '@/lib/calculations/weeklyTemplateCalculations'
import type { Database, Json } from '@/types/supabase'
import type { WeeklyMealTemplate, WeeklyTemplateEntry } from '@/types/calendar'

type WeeklyTemplateRow = Database['public']['Tables']['weekly_meal_templates']['Row']

function parseTemplateEntries(raw: Json): WeeklyTemplateEntry[] {
  if (!Array.isArray(raw)) return []
  const parsed: WeeklyTemplateEntry[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const obj = item as Record<string, Json | undefined>
    parsed.push({
      day_offset: typeof obj.day_offset === 'number' ? obj.day_offset : 0,
      meal_id: typeof obj.meal_id === 'string' ? obj.meal_id : null,
      meal_name: typeof obj.meal_name === 'string' ? obj.meal_name : null,
      meal_category_id: typeof obj.meal_category_id === 'number' ? obj.meal_category_id : null,
      custom_name: typeof obj.custom_name === 'string' ? obj.custom_name : null,
      is_ad_hoc: Boolean(obj.is_ad_hoc),
      servings: typeof obj.servings === 'number' && obj.servings > 0 ? obj.servings : 1,
      target_kcal: typeof obj.target_kcal === 'number' ? obj.target_kcal : null,
      notes: typeof obj.notes === 'string' ? obj.notes : null,
      sort_order: typeof obj.sort_order === 'number' ? obj.sort_order : 0
    })
  }

  return parsed
}

export function mapWeeklyTemplateRow(row: WeeklyTemplateRow): WeeklyMealTemplate {
  return {
    id: row.id,
    household_id: row.household_id,
    name: row.name,
    created_at: row.created_at,
    entries: parseTemplateEntries(row.entries)
  }
}

export const weeklyTemplateService = {
  /**
   * Fetches all weekly templates belonging to a household.
   * Returns null on query/network failure so callers can preserve offline cache.
   */
  async getWeeklyTemplates(householdId: string): Promise<WeeklyMealTemplate[] | null> {
    if (!isUuid(householdId)) return []

    try {
      const { data, error } = await supabase
        .from('weekly_meal_templates')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[weeklyTemplateService] Error fetching templates:', error)
        return null
      }

      return (data || []).map(mapWeeklyTemplateRow)
    } catch (err) {
      console.error('[weeklyTemplateService] Unexpected error fetching templates:', err)
      return null
    }
  },

  /**
   * Inserts or updates a weekly meal template in Supabase.
   */
  async saveWeeklyTemplate(template: WeeklyMealTemplate): Promise<WeeklyMealTemplate | null> {
    if (!isUuid(template.household_id)) return null

    const safeId = isUuid(template.id) ? template.id : generateUuidV4()

    try {
      const { data, error } = await supabase
        .from('weekly_meal_templates')
        .upsert(
          {
            id: safeId,
            household_id: template.household_id,
            name: template.name.trim(),
            entries: template.entries as unknown as Json,
            created_at: template.created_at || new Date().toISOString()
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single()

      if (error || !data) {
        console.error('[weeklyTemplateService] Error saving template:', error)
        return null
      }

      return mapWeeklyTemplateRow(data)
    } catch (err) {
      console.error('[weeklyTemplateService] Unexpected error saving template:', err)
      return null
    }
  },

  /**
   * Deletes a household weekly meal template from Supabase.
   */
  async deleteWeeklyTemplate(templateId: string, householdId: string): Promise<boolean> {
    if (!isUuid(templateId) || !isUuid(householdId)) {
      return false
    }

    try {
      const { error } = await supabase
        .from('weekly_meal_templates')
        .delete()
        .eq('id', templateId)
        .eq('household_id', householdId)

      if (error) {
        console.error('[weeklyTemplateService] Error deleting template:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('[weeklyTemplateService] Unexpected error deleting template:', err)
      return false
    }
  },

  /**
   * Synchronizes weekly templates from Supabase into localStorage cache,
   * migrating any legacy non-UUID local templates once when remote is empty.
   */
  async syncRemoteTemplates(
    householdId: string,
    cachedLocal: WeeklyMealTemplate[]
  ): Promise<WeeklyMealTemplate[]> {
    const remote = await this.getWeeklyTemplates(householdId)
    if (remote === null) {
      return cachedLocal
    }

    if (remote.length === 0 && cachedLocal.length > 0) {
      const legacyLocal = cachedLocal.filter((tpl) => !isUuid(tpl.id))
      if (legacyLocal.length > 0) {
        const migrated = await Promise.all(
          legacyLocal.map((tpl) =>
            this.saveWeeklyTemplate({
              ...tpl,
              id: generateUuidV4(),
              household_id: householdId
            })
          )
        )
        const validMigrated = migrated.filter((t): t is WeeklyMealTemplate => t !== null)
        if (validMigrated.length > 0) {
          saveStoredWeeklyTemplates(householdId, validMigrated)
          return validMigrated
        }
      }
    }

    saveStoredWeeklyTemplates(householdId, remote)
    return remote
  }
}
