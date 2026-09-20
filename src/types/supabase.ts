export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UnitEnum = 'g' | 'ml' | 'pcs'
export type ListStatusEnum = 'draft' | 'active' | 'archived'

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          household_id: string | null
          email: string
          name: string | null
          language: string
          theme: string
          created_at: string | null
        }
        Insert: {
          id: string
          household_id?: string | null
          email: string
          name?: string | null
          language?: string
          theme?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string | null
          email?: string
          name?: string | null
          language?: string
          theme?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      household_invites: {
        Row: {
          id: string
          household_id: string
          email: string
          created_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          email: string
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          email?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      product_categories: {
        Row: {
          id: number
          household_id: string | null
          name: string
          sort_order: number
        }
        Insert: {
          id?: number
          household_id?: string | null
          name: string
          sort_order: number
        }
        Update: {
          id?: number
          household_id?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      household_category_settings: {
        Row: {
          id: string
          household_id: string
          category_id: number
          custom_sort_order: number
          is_hidden: boolean
          custom_name: string | null
          store_profile_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: number
          custom_sort_order: number
          is_hidden?: boolean
          custom_name?: string | null
          store_profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: number
          custom_sort_order?: number
          is_hidden?: boolean
          custom_name?: string | null
          store_profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_category_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_category_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          household_id: string | null
          name: string
          unit_type: UnitEnum
          category_id: number | null
          kcal_per_100: number | null
          protein_per_100: number | null
          carbs_per_100: number | null
          fat_per_100: number | null
          is_ad_hoc: boolean | null
          type: 'Global' | 'Household'
        }
        Insert: {
          id?: string
          household_id?: string | null
          name: string
          unit_type: UnitEnum
          category_id?: number | null
          kcal_per_100?: number | null
          protein_per_100?: number | null
          carbs_per_100?: number | null
          fat_per_100?: number | null
          is_ad_hoc?: boolean | null
          type?: 'Global' | 'Household'
        }
        Update: {
          id?: string
          household_id?: string | null
          name?: string
          unit_type?: UnitEnum
          category_id?: number | null
          kcal_per_100?: number | null
          protein_per_100?: number | null
          carbs_per_100?: number | null
          fat_per_100?: number | null
          is_ad_hoc?: boolean | null
          type?: 'Global' | 'Household'
        }
        Relationships: [
          {
            foreignKeyName: "products_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      meal_categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          id: string
          household_id: string | null
          name: string
          description: string | null
          preparation_steps: string | null
          comments: string | null
          category_id: number | null
          tags: string[] | null
          type: 'Global' | 'Household'
        }
        Insert: {
          id?: string
          household_id?: string | null
          name: string
          description?: string | null
          preparation_steps?: string | null
          comments?: string | null
          category_id?: number | null
          tags?: string[] | null
          type?: 'Global' | 'Household'
        }
        Update: {
          id?: string
          household_id?: string | null
          name?: string
          description?: string | null
          preparation_steps?: string | null
          comments?: string | null
          category_id?: number | null
          tags?: string[] | null
          type?: 'Global' | 'Household'
        }
        Relationships: [
          {
            foreignKeyName: "meals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "meal_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      meal_ingredients: {
        Row: {
          id: string
          meal_id: string | null
          product_id: string | null
          base_quantity: number
          is_pantry_item: boolean | null
        }
        Insert: {
          id?: string
          meal_id?: string | null
          product_id?: string | null
          base_quantity: number
          is_pantry_item?: boolean | null
        }
        Update: {
          id?: string
          meal_id?: string | null
          product_id?: string | null
          base_quantity?: number
          is_pantry_item?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_ingredients_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      shopping_lists: {
        Row: {
          id: string
          household_id: string | null
          name: string | null
          original_name: string | null
          status: ListStatusEnum | null
          is_default: boolean
          target_date: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
          preset_tags: string[] | null
        }
        Insert: {
          id?: string
          household_id?: string | null
          name?: string | null
          original_name?: string | null
          status?: ListStatusEnum | null
          is_default?: boolean
          target_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          preset_tags?: string[] | null
        }
        Update: {
          id?: string
          household_id?: string | null
          name?: string | null
          original_name?: string | null
          status?: ListStatusEnum | null
          is_default?: boolean
          target_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          preset_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      shopping_list_items: {
        Row: {
          id: string
          shopping_list_id: string | null
          product_id: string | null
          total_quantity: number
          is_checked: boolean | null
          added_ad_hoc: boolean | null
          category_id?: number | null
        }
        Insert: {
          id?: string
          shopping_list_id?: string | null
          product_id?: string | null
          total_quantity: number
          is_checked?: boolean | null
          added_ad_hoc?: boolean | null
          category_id?: number | null
        }
        Update: {
          id?: string
          shopping_list_id?: string | null
          product_id?: string | null
          total_quantity?: number
          is_checked?: boolean | null
          added_ad_hoc?: boolean | null
          category_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          household_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
          last_used_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
          last_used_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
          last_used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      unit_enum: UnitEnum
      list_status_enum: ListStatusEnum
    }
    CompositeTypes: Record<string, never>
  }
}
