import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type ProductCategory = Database['public']['Tables']['product_categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']

export const productService = {
  async getCategories(householdId?: string | null): Promise<ProductCategory[]> {
    let query = supabase.from('product_categories').select('*')

    if (householdId) {
      query = query.or(`household_id.is.null,household_id.eq.${householdId}`)
    }

    const { data, error } = await query.order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching product categories:', error)
      return []
    }
    return data || []
  },

  async getProducts(householdId?: string | null): Promise<Product[]> {
    try {
      let query = supabase.from('products').select('*')

      if (householdId) {
        query = query.or(`household_id.eq.${householdId},type.eq.Global,household_id.is.null`)
      } else {
        query = query.or('type.eq.Global,household_id.is.null')
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (!error && data && data.length > 0) {
        return data
      }

      if (error) {
        console.warn('[productService.getProducts] OR query error:', error)
      }

      // Fallback: fetch all session-accessible products and filter client-side
      const fallbackResult = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      if (fallbackResult.error) {
        console.error('[productService.getProducts] Fallback error fetching products:', fallbackResult.error)
        return []
      }

      const allProds = fallbackResult.data || []
      return allProds.filter((p) => {
        const isGlobal = p.type === 'Global' || !p.household_id
        if (isGlobal) return true
        return householdId ? p.household_id === householdId : false
      })
    } catch (err) {
      console.error('[productService.getProducts] Unexpected error:', err)
      return []
    }
  },

  async createProduct(product: ProductInsert): Promise<Product | null> {
    const payload: ProductInsert = {
      ...product,
      type: product.type || (product.household_id ? 'Household' : 'Global')
    }

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating product:', error)
      return null
    }
    return data
  },

  async updateProduct(id: string, updates: Partial<ProductInsert>): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating product:', error)
      return null
    }
    return data
  },

  async deleteProduct(productId: string): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) {
      console.error('Error deleting product:', error)
      return false
    }
    return true
  }
}
