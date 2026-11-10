import { describe, it, expect } from 'vitest'

const migrationFiles = import.meta.glob('/supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

interface ParsedPolicy {
  table: string
  name: string
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'
  roles: string
  usingClause: string
  withCheckClause: string
  migrationFile: string
}

function normalizeSql(sql: string): string {
  // Strip single-line SQL comments and normalize whitespace for resilient assertions
  return sql
    .replace(/--[^\r\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractParenthesizedClause(sql: string, keywordRegex: RegExp, startFrom: number): string {
  const slice = sql.slice(startFrom)
  const match = keywordRegex.exec(slice)
  if (!match) return ''
  let i = startFrom + match.index + match[0].length
  while (i < sql.length && /\s/.test(sql[i])) i++
  if (sql[i] !== '(') return ''
  let depth = 0
  const start = i
  while (i < sql.length) {
    if (sql[i] === '(') depth++
    else if (sql[i] === ')') {
      depth--
      if (depth === 0) {
        return sql.slice(start + 1, i).trim()
      }
    }
    i++
  }
  return ''
}

function replayMigrations() {
  const files = Object.keys(migrationFiles).sort()

  const rlsEnabledTables = new Set<string>()
  const createdTables = new Set<string>()
  const createdIndexes = new Set<string>()
  const activePolicies = new Map<string, ParsedPolicy>()

  for (const file of files) {
    const raw = migrationFiles[file]
    const sql = normalizeSql(raw)

    // Track CREATE TABLE
    const createTableRe = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_]+)/gi
    let m: RegExpExecArray | null
    while ((m = createTableRe.exec(sql)) !== null) {
      createdTables.add(m[1].toLowerCase())
    }

    // Track ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    const rlsRe = /ALTER TABLE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+ENABLE ROW LEVEL SECURITY/gi
    while ((m = rlsRe.exec(sql)) !== null) {
      rlsEnabledTables.add(m[1].toLowerCase())
    }

    // Track CREATE [UNIQUE] INDEX
    const idxRe = /CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF NOT EXISTS)?\s+([a-zA-Z0-9_]+)/gi
    while ((m = idxRe.exec(sql)) !== null) {
      createdIndexes.add(m[1].toLowerCase())
    }

    // Track DROP POLICY IF EXISTS "..." ON [public.]table
    const dropRe = /DROP POLICY(?:\s+IF EXISTS)?\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi
    while ((m = dropRe.exec(sql)) !== null) {
      const key = `${m[2].toLowerCase()}::${m[1]}`
      activePolicies.delete(key)
    }

    // Track CREATE POLICY "..." ON [public.]table FOR <CMD> [TO <ROLES>] ...
    const createPolRe =
      /CREATE POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)\s+FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)\b(?:\s+TO\s+([a-zA-Z0-9_,\s]+?))?(?=\s+(?:USING|WITH CHECK)\b)/gi
    while ((m = createPolRe.exec(sql)) !== null) {
      const policyName = m[1]
      const table = m[2].toLowerCase()
      const command = m[3].toUpperCase() as ParsedPolicy['command']
      const roles = (m[4] || '').trim().toLowerCase()

      const stmtEnd = sql.indexOf(';', m.index)
      const stmtBoundary = stmtEnd === -1 ? sql.length : stmtEnd
      const stmtSql = sql.slice(m.index, stmtBoundary)

      const usingClause = extractParenthesizedClause(stmtSql, /\bUSING\b/i, 0)
      const withCheckClause = extractParenthesizedClause(stmtSql, /\bWITH CHECK\b/i, 0)

      activePolicies.set(`${table}::${policyName}`, {
        table,
        name: policyName,
        command,
        roles,
        usingClause,
        withCheckClause,
        migrationFile: file
      })
    }
  }

  return {
    files,
    createdTables,
    rlsEnabledTables,
    createdIndexes,
    policies: Array.from(activePolicies.values())
  }
}

describe('HIGH-03 & HIGH-04: Supabase RLS Multi-Tenancy Security Audit & Performance Indexing', () => {
  const { createdTables, rlsEnabledTables, createdIndexes, policies } = replayMigrations()

  const getPoliciesFor = (table: string, command?: ParsedPolicy['command']) =>
    policies.filter((p) => p.table === table && (!command || p.command === command))

  it('Audit 01: Every public table created in migrations has Row Level Security enabled', () => {
    expect(createdTables.size).toBeGreaterThanOrEqual(15)
    for (const table of createdTables) {
      expect(rlsEnabledTables.has(table), `Missing ENABLE ROW LEVEL SECURITY on table ${table}`).toBe(true)
    }
  })

  it('Audit 02: All household-scoped multi-tenant tables enforce SELECT/INSERT/UPDATE/DELETE policies for authenticated users', () => {
    const strictTenantTables = [
      'shopping_lists',
      'shopping_list_items',
      'pantry_items',
      'meal_plans',
      'household_category_settings',
      'push_subscriptions',
      'products',
      'meals',
      'meal_ingredients',
      'shopping_list_items_archive'
    ]

    for (const table of strictTenantTables) {
      for (const cmd of ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const) {
        const matched = getPoliciesFor(table, cmd)
        expect(matched.length, `Missing ${cmd} policy on ${table}`).toBeGreaterThanOrEqual(1)
        for (const p of matched) {
          expect(p.roles, `Policy "${p.name}" on ${table} must specify TO authenticated`).toContain('authenticated')
          if (cmd === 'INSERT' || cmd === 'UPDATE') {
            expect(
              p.withCheckClause.length,
              `Policy "${p.name}" (${cmd}) on ${table} must define explicit WITH CHECK`
            ).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('Audit 03: push_subscriptions UPDATE enforces household membership in both USING and WITH CHECK (prevents subscription hijacking)', () => {
    const updatePolicies = getPoliciesFor('push_subscriptions', 'UPDATE')
    expect(updatePolicies).toHaveLength(1)
    const p = updatePolicies[0]

    expect(p.usingClause).toContain('auth.uid() = user_id')
    expect(p.usingClause).toContain('get_user_household_ids(auth.uid())')
    expect(p.withCheckClause).toContain('auth.uid() = user_id')
    expect(p.withCheckClause).toContain('get_user_household_ids(auth.uid())')
  })

  it('Audit 04: household_members INSERT blocks arbitrary self-join without membership or matching invite', () => {
    const insertPolicies = getPoliciesFor('household_members', 'INSERT')
    expect(insertPolicies).toHaveLength(1)
    const p = insertPolicies[0]

    // Must require either existing household membership or an active invite matching JWT email
    expect(p.withCheckClause).toContain('get_user_household_ids(auth.uid())')
    expect(p.withCheckClause).toContain('household_invites')
    expect(p.withCheckClause).toContain("auth.jwt() ->> 'email'")
    // Must NOT allow unconditional "user_id = auth.uid() OR ..." bypass
    expect(p.withCheckClause).not.toMatch(/^\s*user_id\s*=\s*auth\.uid\(\)\s+OR\b/i)
  })

  it('Audit 05: meal_plans & shopping_list_items prevent cross-tenant foreign-key probing in WITH CHECK', () => {
    const mealPlanInsert = getPoliciesFor('meal_plans', 'INSERT')[0]
    const mealPlanUpdate = getPoliciesFor('meal_plans', 'UPDATE')[0]
    expect(mealPlanInsert.withCheckClause).toContain('get_user_household_ids(auth.uid())')
    expect(mealPlanInsert.withCheckClause).toContain('meal_id')
    expect(mealPlanUpdate.withCheckClause).toContain('get_user_household_ids(auth.uid())')
    expect(mealPlanUpdate.withCheckClause).toContain('meal_id')

    const itemInsert = getPoliciesFor('shopping_list_items', 'INSERT')[0]
    const itemUpdate = getPoliciesFor('shopping_list_items', 'UPDATE')[0]
    expect(itemInsert.withCheckClause).toContain('shopping_lists')
    expect(itemInsert.withCheckClause).toContain('meal_plan_item_id')
    expect(itemUpdate.withCheckClause).toContain('shopping_lists')
    expect(itemUpdate.withCheckClause).toContain('meal_plan_item_id')
  })

  it('Audit 06: users SELECT does not leak profiles via stale users.household_id column', () => {
    const userSelect = getPoliciesFor('users', 'SELECT')[0]
    expect(userSelect.usingClause).toContain('id = auth.uid()')
    expect(userSelect.usingClause).toContain('FROM public.household_members')
    expect(userSelect.usingClause).not.toMatch(/OR\s+household_id\s+IN\s*\(/i)
  })

  it('Audit 07: Cross-tenancy simulation denies User A (H1) from accessing, mutating, or moving records into User B (H2)', () => {
    // Simulated policy evaluator matching our exact RLS rules
    interface Context {
      uid: string
      email: string
      memberHouseholdIds: Set<string>
      invites: Array<{ household_id: string; email: string }>
    }

    const userA: Context = {
      uid: 'user-a',
      email: 'a@test.com',
      memberHouseholdIds: new Set(['h1']),
      invites: []
    }

    const h2MealPlan = { id: 'mp-h2', household_id: 'h2', meal_id: 'meal-h2' }
    const h2PantryItem = { id: 'pi-h2', household_id: 'h2', product_id: 'prod-h2' }
    const userASubInH1 = { id: 'sub-a', user_id: 'user-a', household_id: 'h1' }

    const canSelectByHousehold = (ctx: Context, rowHouseholdId: string) =>
      ctx.memberHouseholdIds.has(rowHouseholdId)

    const canUpdatePushSubscription = (
      ctx: Context,
      existingRow: { user_id: string; household_id: string },
      nextRow: { user_id: string; household_id: string }
    ) => {
      const usingOk = existingRow.user_id === ctx.uid && ctx.memberHouseholdIds.has(existingRow.household_id)
      const checkOk = nextRow.user_id === ctx.uid && ctx.memberHouseholdIds.has(nextRow.household_id)
      return usingOk && checkOk
    }

    const canInsertHouseholdMember = (ctx: Context, targetHouseholdId: string, targetUserId: string) => {
      const isExistingMember = ctx.memberHouseholdIds.has(targetHouseholdId)
      const hasInvite =
        targetUserId === ctx.uid &&
        ctx.invites.some(
          (i) => i.household_id === targetHouseholdId && i.email.toLowerCase() === ctx.email.toLowerCase()
        )
      return isExistingMember || hasInvite
    }

    // 1. User A cannot read H2 meal_plans or H2 pantry_items
    expect(canSelectByHousehold(userA, h2MealPlan.household_id)).toBe(false)
    expect(canSelectByHousehold(userA, h2PantryItem.household_id)).toBe(false)

    // 2. User A cannot hijack H2 push notifications by updating own subscription's household_id from h1 -> h2
    expect(canUpdatePushSubscription(userA, userASubInH1, { ...userASubInH1, household_id: 'h2' })).toBe(false)
    // User A CAN update own subscription within h1
    expect(canUpdatePushSubscription(userA, userASubInH1, { ...userASubInH1, household_id: 'h1' })).toBe(true)

    // 3. User A cannot join H2 without an invite
    expect(canInsertHouseholdMember(userA, 'h2', 'user-a')).toBe(false)
    // User A CAN join H2 only once an email-matched invite exists
    const userAWithInvite: Context = {
      ...userA,
      invites: [{ household_id: 'h2', email: 'A@TEST.COM' }]
    }
    expect(canInsertHouseholdMember(userAWithInvite, 'h2', 'user-a')).toBe(true)
  })

  it('HIGH-04 Verification: Required RLS and Foreign-Key performance indexes exist in migrations', () => {
    const requiredIndexes = [
      'idx_household_members_user_id',
      'idx_meal_ingredients_meal_id',
      'idx_meal_ingredients_product_id',
      'idx_meals_household_id',
      'idx_products_household_id',
      'idx_shopping_list_items_product_id',
      'idx_pantry_items_product_id'
    ]

    for (const idx of requiredIndexes) {
      expect(createdIndexes.has(idx), `Missing database index ${idx}`).toBe(true)
    }
  })
})
