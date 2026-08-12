import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type ProductCategory = Database['public']['Tables']['product_categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']

export const productService = {
  async getCategories(): Promise<ProductCategory[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Błąd pobierania kategorii produktów:', error)
      return []
    }
    return data || []
  },

  async getProducts(householdId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`household_id.eq.${householdId},household_id.is.null`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Błąd pobierania produktów:', error)
      return []
    }
    return data || []
  },

  async createProduct(product: ProductInsert): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select('*')
      .single()

    if (error) {
      console.error('Błąd tworzenia produktu:', error)
      return null
    }
    return data
  }
}
