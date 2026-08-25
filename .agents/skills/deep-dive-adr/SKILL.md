---
name: deep-dive-adr
description: >-
  Interactive, highly rigorous Architecture Decision Record (ADR) generator that deep-dives into edge cases,
  evaluates industry/market benchmarks, probes trade-offs, and produces exhaustive, production-grade ADR documents.
---

# Deep-Dive ADR Authoring Framework

This skill guides the agent and user through creating comprehensive, battle-tested Architecture Decision Records (ADRs) for **SmartShopping**. It prevents shallow or hand-wavy decisions by systematically probing edge cases, analyzing industry benchmarks, and formulating rock-solid technical architectures.

---

## 1. The Interactive Probing Protocol (Sequential Decision-Tree Walkthrough)

When requested to create or design an ADR, the agent **MUST NOT** dump a wall of multiple questions or rush into drafting a document. Instead, the agent must conduct a **sequential, point-by-point interview**, walking down the architectural decision tree one node at a time.

### Core Guidelines for the Interview:
1. **One Decision Point at a Time:** Ask questions sequentially. Resolve each decision node before branching into dependent decisions.
2. **Explore Codebase First:** If an answer can be derived from existing code or migrations (e.g. table schemas, RLS functions, store structure), inspect the repository first instead of asking redundant questions.
3. **Always Provide a Recommendation:** For every question, present the agent's recommended choice (prefixed with `(Recommended)`) backed by technical reasoning, SmartShopping conventions, or market benchmarks.
4. **Use Interactive Modals:** Use the `ask_question` tool to present structured, actionable choices to the user.

---

### Step-by-Step Decision Tree Traversal

The agent must navigate through the **8 Architectural Decision Branches** in sequence:

```
  [Branch 1: Business Intent & Scope]
                 │
                 ▼
  [Branch 2: UX Duality & User Flows (Mobile PWA vs Desktop)]
                 │
                 ▼
  [Branch 3: Data Model, PostgreSQL Schema & Supabase RLS]
                 │
                 ▼
  [Branch 4: State Management, Services & Optimistic UI]
                 │
                 ▼
  [Branch 5: Performance, Latency & Indexing]
                 │
                 ▼
  [Branch 6: Edge Cases, Offline & Network Drop Recovery]
                 │
                 ▼
  [Branch 7: Market Standards & Considered Alternatives Matrix]
                 │
                 ▼
  [Branch 8: Testing Strategy, Migration & Verification Plan]
                 │
                 ▼
      ==> Generate Final Exhaustive ADR Document <==
```

#### Detailed Branch Checklist:
1. **Branch 1: Business Intent & Core Problem Statement**
   - What core user problem or architectural limitation is being solved?
   - How does this decision fit into the overall vision of SmartShopping?
2. **Branch 2: UX Duality & User Flows**
   - Mobile PWA flow: One-handed thumb zone, 44x44px targets, bottom sheets, swipe gestures, haptic feedback (`navigator.vibrate`).
   - Desktop flow: Sidebar, header, centered `Dialog` modals, multi-column data grids, keyboard shortcuts.
3. **Branch 3: Data Model & Supabase RLS Security**
   - What tables and foreign keys are needed?
   - Strict multi-tenant RLS isolation via `public.get_user_household_ids(auth.uid())` for SELECT, INSERT, UPDATE, DELETE.
4. **Branch 4: State Management & Optimistic UI**
   - Zustand store actions and state slices.
   - Optimistic state updates with immediate UI feedback and automatic rollback on network failure.
5. **Branch 5: Performance, Latency & Data Indexing**
   - Database indexes on foreign keys and search query columns.
   - Bundle size impact and query optimization.
6. **Branch 6: Edge Cases & Failure Mitigation Matrix**
   - Offline / spotty 3G handling in grocery store aisles.
   - Simultaneous edits by multiple family members (conflict resolution via Realtime WebSockets).
   - Boundary limits (empty lists, 1000+ items, rapid double-clicks).
7. **Branch 7: Market Standards & Alternatives Matrix**
   - Benchmark against market leaders (AnyList, Paprika 3, Whisk, Todoist, Cronometer).
   - Decision matrix comparing Options A, B, and C with pros/cons.
8. **Branch 8: Testing & Rollout Strategy**
   - Pure function unit tests in `src/lib/calculations/__tests__/`.
   - Comprehensive UI user flow integration tests in Vitest with `@testing-library/react`.
   - Migration, deployment, and rollback plan.
9. **Branch 9: Any additional user remark**
   - Ask user whether there is any other information or requirements that should be considered for the ADR.
   - If the user provides any additional information, update the ADR accordingly.  

---

## 2. Exhaustive ADR Template

Once all decision branches are resolved with the user, synthesize the conclusions into a production-grade ADR in English saved to `docs/adr/ADR-XXX-<name>.md`:

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
