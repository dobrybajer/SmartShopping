export const TEST_HOUSEHOLD_NAME = 'Household_Test'

export const BASE_CATEGORIES = {
  supplements: '[BASE] Suplementy i Odżywki',
  ecoHome: '[BASE] EKO Chemia i Dom',
} as const

export interface ProductSeed {
  name: string
  unit: 'g' | 'ml' | 'pcs'
  categoryLabel: string
  isGeneral?: boolean
  parentName?: string
  isNonFood?: boolean
  macros?: {
    kcal: number
    protein: number
    carbs: number
    fat: number
  }
}

export const BASE_GENERAL_PRODUCTS: ProductSeed[] = [
  {
    name: '[BASE] Awokado',
    unit: 'pcs',
    categoryLabel: 'Owoce i Warzywa',
    isGeneral: true,
  },
  {
    name: '[BASE] Mleko',
    unit: 'ml',
    categoryLabel: 'Nabiał i Jaja',
    isGeneral: true,
  },
  {
    name: '[BASE] Baterie',
    unit: 'pcs',
    categoryLabel: BASE_CATEGORIES.ecoHome,
    isGeneral: true,
    isNonFood: true,
  },
]

export const BASE_CHILD_PRODUCTS: ProductSeed[] = [
  {
    name: '[BASE] Awokado Hass',
    unit: 'pcs',
    categoryLabel: 'Owoce i Warzywa',
    parentName: '[BASE] Awokado',
    macros: { kcal: 220, protein: 2.8, carbs: 11.8, fat: 20.5 },
  },
  {
    name: '[BASE] Awokado Fuerte',
    unit: 'pcs',
    categoryLabel: 'Owoce i Warzywa',
    parentName: '[BASE] Awokado',
    macros: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  },
  {
    name: '[BASE] Mleko bez laktozy 1.5%',
    unit: 'ml',
    categoryLabel: 'Nabiał i Jaja',
    parentName: '[BASE] Mleko',
    macros: { kcal: 45, protein: 3.3, carbs: 4.8, fat: 1.5 },
  },
  {
    name: '[BASE] Mleko klasyczne 3.2%',
    unit: 'ml',
    categoryLabel: 'Nabiał i Jaja',
    parentName: '[BASE] Mleko',
    macros: { kcal: 60, protein: 3.2, carbs: 4.7, fat: 3.2 },
  },
  {
    name: '[BASE] Baterie AA Alkaliczne',
    unit: 'pcs',
    categoryLabel: BASE_CATEGORIES.ecoHome,
    parentName: '[BASE] Baterie',
    isNonFood: true,
  },
]

export const BASE_STANDALONE_PRODUCTS: ProductSeed[] = [
  {
    name: '[BASE] Pierś z kurczaka',
    unit: 'g',
    categoryLabel: 'Mięso i Ryby',
    macros: { kcal: 110, protein: 23, carbs: 0, fat: 1.5 },
  },
  {
    name: '[BASE] Ryż basmati',
    unit: 'g',
    categoryLabel: 'Spiżarnia i Sypkie',
    macros: { kcal: 350, protein: 7.5, carbs: 77, fat: 0.8 },
  },
  {
    name: '[BASE] Oliwa z oliwek Extra Virgin',
    unit: 'ml',
    categoryLabel: 'Spiżarnia i Sypkie',
    macros: { kcal: 884, protein: 0, carbs: 0, fat: 100 },
  },
  {
    name: '[BASE] Odżywka białkowa WPI',
    unit: 'g',
    categoryLabel: BASE_CATEGORIES.supplements,
    macros: { kcal: 380, protein: 85, carbs: 4, fat: 2.5 },
  },
  {
    name: '[BASE] Sól morska',
    unit: 'g',
    categoryLabel: 'Spiżarnia i Sypkie',
    macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  },
]

export const CANONICAL_MEAL_NAME = '[BASE] Kurczak Teriyaki z ryżem i awokado'

export const JSON_IMPORT_RECIPES = [
  {
    name: '[BASE] Szejk Białkowy Po Treningu',
    description: 'Szybki shake potreningowy',
    tags: ['WOD', 'Białko'],
    category_id: 1,
    ingredients: [
      { name: '[BASE] Odżywka białkowa WPI', quantity: 0.04, unit: 'kg' },
      { name: '[BASE] Mleko bez laktozy 1.5%', quantity: 0.3, unit: 'l' },
    ],
  },
  {
    name: '[BASE] Omlet z płatkami owsianymi',
    description: 'Klasyczne śniadanie białkowo-tłuszczowe',
    tags: ['Śniadanie'],
    category_id: 1,
    ingredients: [
      {
        name: '[BASE] Płatki owsiane górskie',
        quantity: 6,
        unit: 'dag',
        kcal_per_100: 370,
        protein_per_100: 13,
        carbs_per_100: 62,
        fat_per_100: 7,
      },
      {
        name: '[BASE] Jajka wiejskie L',
        quantity: 3,
        unit: 'szt',
        kcal_per_100: 75,
        protein_per_100: 6.5,
        carbs_per_100: 0.6,
        fat_per_100: 5,
      },
    ],
  },
]

export const BASE_ACTIVE_LISTS = {
  groceries: '[BASE] Zakupy Spożywcze Tydzień',
  homeChem: '[BASE] Dom i Chemia',
  weekendArchive: '[BASE] Zakupy Weekendowe',
  weekendArchiveRenamed: '[BASE] Archiwum: Weekendowe zakupy spożywcze',
} as const

export const BASE_TEMPLATES = {
  workweek: '[BASE] Szablon Tygodnia Roboczego (Pn-Pt)',
  fullWeek: '[BASE] Pełny Szablon Treningowy (Pn-Nd)',
} as const
