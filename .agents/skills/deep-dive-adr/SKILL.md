---
name: deep-dive-adr
description: >-
  Interactive, highly rigorous Architecture Decision Record (ADR) generator that deep-dives into edge cases,
  evaluates industry/market benchmarks, probes trade-offs, and produces exhaustive, production-grade ADR documents.
---

# Deep-Dive ADR Authoring Framework

This skill guides the agent and user through creating comprehensive, battle-tested Architecture Decision Records (ADRs) for **SmartShopping**. It prevents shallow or hand-wavy decisions by systematically probing edge cases, analyzing industry benchmarks, and formulating rock-solid technical architectures.

---

## 1. The Interactive Probing Protocol (8-Dimension Drill-Down)

When requested to create or design an ADR, the agent **MUST NOT** jump straight to a brief summary. Instead, execute the following multi-step discovery process:

### Step 1: Interactive Problem Exploration & Edge Case Probing
Ask targeted questions across the **8 Critical Dimensions**:

1. **User Flows & UX Duality:**
   - How does this feature behave on Mobile PWA (one-handed thumb zone, 44x44px, bottom sheets, swipe gestures, haptics) vs Desktop (sidebar, header, centered dialogs, keyboard shortcuts, multi-column tables)?
2. **Edge Cases & Corner Scenarios:**
   - What happens on slow 3G or total offline disconnects (e.g. in a basement supermarket aisle)?
   - What happens when two household members edit the same entity simultaneously?
   - What are the boundary limits (e.g., 0 items, 1000 items, empty strings, rapid spam clicking)?
3. **Data Model & Supabase RLS:**
   - Which tables are affected? How is multi-tenant isolation guaranteed via `public.get_user_household_ids(auth.uid())`?
   - Are cascading deletes or foreign keys properly defined?
4. **State Management & Optimistic UI:**
   - How does Zustand manage local optimistic state?
   - What is the rollback mechanism if the async network request to Supabase fails?
5. **Performance & Latency:**
   - What is the impact on bundle size, initial load time, and database query complexity?
   - Are indexes needed on foreign keys or search fields?
6. **Industry & Market Standards:**
   - How do market-leading meal planning / grocery shopping apps (e.g., AnyList, Paprika, Whisk, Todoist, Cronometer) handle this problem?
   - What modern React 19 / TypeScript best practices apply?
7. **Failure Modes & Telemetry:**
   - How is the user informed of errors (Toast notifications, inline alerts)?
   - Can the system recover automatically without a full page reload?
8. **Business Intent:**
   - Make sure user intent is fully understood and make sense compared to whole application.

---

## 2. Exhaustive ADR Template

Every finalized ADR must be written in English and saved to `docs/adr/ADR-XXX-<name>.md` following this structure:

```markdown
# ADR-XXX: [Descriptive Title]

## 1. Metadata
- **Status:** [Proposed | Accepted | Superseded | Deprecated]
- **Date:** YYYY-MM-DD
- **Decision Drivers:** [List top 3-4 architectural drivers, e.g. Offline UX, Multi-tenant Isolation, Performance]
- **Scope:** [Frontend | Backend | State | Database | Security | Full-Stack]

## 2. Context & Problem Statement
[Detailed description of the architectural challenge, background context, and user needs.]

## 3. Market & Technology Benchmarks
[Analysis of how industry-leading applications (AnyList, Paprika, Whisk, etc.) and modern stacks solve this problem.]

## 4. Considered Alternatives & Decision Matrix
| Evaluation Criteria | Option A: [Name] | Option B: [Name] | Option C: [Name] (Selected) |
| :--- | :--- | :--- | :--- |
| **UX & Responsiveness** | ... | ... | ... |
| **Realtime Sync & Optimistic UI** | ... | ... | ... |
| **Implementation Complexity** | ... | ... | ... |
| **Security & Isolation** | ... | ... | ... |
| **Verdict** | Rejected | Rejected | **Adopted** |

## 5. Technical Decision & Deep Architecture
### 5.1 System & Data Flow
[Mermaid diagram or structured flow explaining component interactions.]

### 5.2 Schema & Database Changes (if applicable)
[Complete PostgreSQL DDL with mandatory RLS policies matching project standards.]

### 5.3 Frontend & State Architecture
[Zustand store actions, Service layer interfaces, and component layer responsibilities.]

## 6. Comprehensive Edge Cases & Mitigation Matrix
| # | Scenario / Edge Case | Failure Risk | Architectural Mitigation |
| :- | :--- | :--- | :--- |
| 1 | Network drops during mutation | Data desynchronization | Optimistic UI with automatic rollback and Toast feedback |
| 2 | Simultaneous multi-device edits | Conflicting overwrite | WebSocket real-time subscription listener auto-sync |
| ... | ... | ... | ... |

## 7. Security, Privacy & Multi-Tenancy
[Detailed verification of household multi-tenant scoping and RLS policy rules.]

## 8. Testing & Verification Strategy
- **Unit Tests:** Pure functions and calculation algorithms in `src/lib/calculations/__tests__/`.
- **UI User Flows:** Enumerate all unique user flows covered via Vitest and `@testing-library/react`.

## 9. Rollout, Migration & Rollback Plan
[Step-by-step deployment procedure, database migrations, and backward compatibility considerations.]

## 10. Consequences
### Positive
- [Key architectural benefits]
### Negative / Accepted Trade-offs
- [Known trade-offs and mitigation measures]
```

---

## 3. Post-Decision Workflow

1. Register the new ADR in the ADR index in `docs/adr/` and [.agents/rules/06-documentation-and-adrs.md](../../rules/06-documentation-and-adrs.md).
2. Synchronize [docs/PRD.md](../../../docs/PRD.md) and [docs/plan.md](../../../docs/plan.md) with any new product requirements or roadmap adjustments resulting from the ADR.
