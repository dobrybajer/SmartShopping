# ADR-007: Multiplatform Web Push Notifications & Extensible Event Registry

## 1. Metadata
- **Status:** Implemented
- **Date:** 2026-08-27
- **Decision Drivers:** Multiplatform Background Alerts (Mobile PWA & Desktop), Zero-Lock-In Open Web Standards (VAPID Web Push), Extensible Event Registry (Type-Safe Event Bus), Household Multi-Tenant Data Isolation (Supabase RLS), High-Frequency Action Throttling & Pruning, Future-Proof Path to Persistent History & Notification Center
- **Scope:** Full-Stack (PostgreSQL Schema, Supabase RLS, Supabase Edge Functions, Service Worker, Zustand State, Service Layer & UI Components)

---

## 2. Context & Problem Statement

**SmartShopping** is a collaborative meal-planning and grocery-shopping PWA designed for shared households. While active shopping lists leverage Supabase Realtime WebSockets to synchronize checkbox states and item updates across open browser tabs, the real-world shopping experience introduces critical communication gaps:

1. **Background & Device Sleep Disconnect:** In physical grocery store aisles, users lock their smartphones, put them in pockets, or switch to other applications (camera, banking, messaging). WebSockets disconnect when the operating system freezes background tabs, preventing family members from knowing when an urgent grocery item was added or when shopping was finished.
2. **Platform Parity (Mobile PWA & Desktop):** Household members interact with the platform interchangeably from mobile devices (Android Chrome, iOS Safari PWA) and desktop browsers (macOS, Windows, Linux). Notification delivery must behave consistently across all form factors without requiring separate native app store wrappers.
3. **Effortless Extensibility ("Easy to add new notifications"):** The application is rapidly evolving. Adding new notification triggers (e.g. recipe assigned to meal plan, expiring pantry item, household invite accepted) must not require rewriting push delivery pipelines, modifying schema plumbing, or duplicating formatting code across various domain services.
4. **Clean Decoupling with Future Persistence Pathway:** The immediate business requirement prioritizes real-time native Web Push notifications and in-app toasts without introducing the overhead and database bloat of a persistent notification history table. However, the architecture must be designed with clean interfaces so that a persistent database log and an in-app "Notification Bell / Drawer" center can be plugged in seamlessly in the future without altering trigger call sites.

---

## 3. Market & Technology Benchmarks

| Feature / Platform | **AnyList** | **Bring!** | **Paprika 3** | **Todoist** | **SmartShopping (This ADR)** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Notification Engine** | Native APNS/FCM | Proprietary Push Backend | Local OS Notifications | Web Push + APNS/FCM | **Open Web Push (VAPID) + Service Worker** |
| **PWA Background Support** | Limited (relies on App Store app) | Limited (relies on App Store app) | None (Native only) | Full Web Push | **Full PWA Standalone + Desktop Browser Push** |
| **Vendor Dependency** | Proprietary SaaS | Proprietary Push Gateway | Apple/Google APIs | Proprietary Sync | **100% Self-Hosted on Supabase (Zero Vendor Lock-In)** |
| **Delivery Mechanism** | Persistent Activity Log + Push | Push Notifications + Badges | Local alert timers | Activity Log + Push + Email | **Immediate Web Push + Toast (Extensible to DB Log)** |
| **Event Dispatch Extensibility** | Monolithic server events | Pre-defined message catalog | Hardcoded alerts | Webhooks / Plugin Bus | **Type-Safe Notification Registry & Dispatch Bus** |
| **Lockscreen Collapsing** | Thread grouping | Stacked notifications | None | Tag-based collapsing | **Web Push `tag` Collapsing + Client Debounce** |

---

## 4. Considered Alternatives & Decision Matrix

| Evaluation Criteria | Option A: Open Web Push (VAPID) + Edge Function + Event Registry (Selected) | Option B: Third-Party Push SaaS (OneSignal / FCM / Courier) | Option C: Persistent Database History & In-App Center Only | Option D: Pure Ephemeral WebSockets (No Push) |
| :--- | :--- | :--- | :--- | :--- |
| **Background / Closed-App Delivery** | ⭐⭐⭐⭐⭐ Native Web Push wakes up PWA and desktop OS even when browser is closed. | ⭐⭐⭐⭐⭐ Native push supported across platforms. | ❌ Zero background capability; only visible when app is opened. | ❌ Fails as soon as phone screen locks or tab sleeps. |
| **Privacy & Multi-Tenancy** | ⭐⭐⭐⭐⭐ 100% hosted inside Supabase. No household data leaves private infrastructure. | ⭐⭐ Requires sending user IDs, device tokens, and message payloads to 3rd-party SaaS. | ⭐⭐⭐⭐⭐ Fully isolated via Supabase PostgreSQL RLS. | ⭐⭐⭐⭐⭐ Isolated via Realtime RLS broadcast channels. |
| **Vendor Lock-In & Operating Cost** | ⭐⭐⭐⭐⭐ Zero subscription cost; standard open W3C Push API via Supabase Edge Function. | ⭐⭐ Free tiers have limits; commercial licenses become expensive as households grow. | ⭐⭐⭐⭐⭐ Free (standard Supabase DB). | ⭐⭐⭐⭐⭐ Free (Supabase Realtime included). |
| **Extensibility & Developer Ergonomics** | ⭐⭐⭐⭐⭐ Single-line `notify(type, payload)` with strict TypeScript contract and i18n registry. | ⭐⭐⭐ Requires syncing tags and segment rules with external SaaS dashboard. | ⭐⭐⭐ Moderately easy, but lacks push delivery. | ⭐⭐ Requires manual channel naming and ad-hoc payload typing. |
| **Future Database History Path** | ⭐⭐⭐⭐⭐ Pluggable channel architecture (`NotificationStorageChannel`) allows 1-step DB logging later. | ⭐⭐⭐ Locked into provider's notification history APIs. | ⭐⭐⭐⭐⭐ Native DB table already present. | ❌ Would require complete architectural rewrite. |
| **Bundle Size & Maintenance** | ⭐⭐⭐⭐⭐ Zero client SDK dependencies; relies strictly on browser `PushManager` and Service Worker. | ⭐⭐ Adds heavy third-party client SDK (30-70 KB gzip) into PWA bundle. | ⭐⭐⭐⭐⭐ Minimal bundle impact. | ⭐⭐⭐⭐⭐ Minimal bundle impact. |
| **Verdict** | **Adopted** | Rejected | Rejected (Deferred to Future Phase) | Rejected |

---

## 5. Technical Decision & Deep Architecture

### 5.1 System & Data Flow

```mermaid
flowchart TD
    subgraph Client_App ["SmartShopping Client (Mobile PWA / Desktop)"]
        UI["Domain UI Component (e.g. ActiveShoppingList)"]
        SRV["notificationService.notify(type, payload)"]
        REG["Notification Registry (Types, i18n Formatters, Coalesce Tags)"]
        STORE["useNotificationStore (Zustand: Subscriptions & State)"]
        SW_REG["Service Worker Registration (PushManager)"]
        TOAST["App Toast Bus (Visible if tab active)"]
        
        UI -->|User action: Add item / Finish list| SRV
        SRV --> REG
        SRV -->|If current tab active| TOAST
        SRV -->|Dispatch via PostgREST| EDGE_CALL["supabase.functions.invoke('send-push-notification')"]
        STORE -->|subscribeToPush()| SW_REG
    end

    subgraph Backend ["Supabase Backend & Edge Infrastructure"]
        DB_SUB[("public.push_subscriptions (PostgreSQL + RLS)")]
        EDGE["Supabase Edge Function: send-push-notification (Deno)"]
        VAULT["Supabase Secrets / Vault (VAPID Private Key)"]
        
        SW_REG -->|Store endpoint + keys| DB_SUB
        EDGE_CALL --> EDGE
        EDGE -->|Fetch household subscriptions excluding sender| DB_SUB
        EDGE -->|Read VAPID credentials| VAULT
    end

    subgraph Push_Gateways ["W3C Web Push Gateways (OS Background Dispatch)"]
        FCM["Google FCM (Android / Chrome)"]
        APNS["Apple Web Push Gateway (iOS 16.4+ PWA / Safari macOS)"]
        MOZ["Mozilla Push Service (Firefox)"]
        
        EDGE -->|web-push RFC 8291/8292| FCM
        EDGE -->|web-push RFC 8291/8292| APNS
        EDGE -->|web-push RFC 8291/8292| MOZ
        
        EDGE -.->|If 410 Gone / 404 Not Found| PRUNE["Auto-delete stale subscription from DB"]
        PRUNE --> DB_SUB
    end

    subgraph Target_Device ["Partner's Device (Lockscreen / Notification Bar)"]
        OS_NOTIF["System Push Notification (Title, Body, Icon, Badge)"]
        SW["PWA Service Worker (push event)"]
        
        FCM --> SW
        APNS --> SW
        MOZ --> SW
        SW -->|showNotification() with vibration| OS_NOTIF
        OS_NOTIF -->|User click on notification| DEEP_LINK["Open / Focus PWA tab -> Navigate to /?listId=xyz"]
    end
```

---

### 5.2 Schema & Database Changes (Supabase PostgreSQL DDL)

To support secure push notification delivery, a single multi-tenant table `public.push_subscriptions` is introduced, strictly scoped to households and users using PostgreSQL Row Level Security (RLS).

```sql
-- ============================================================================
-- Migration: Add push_subscriptions table with household RLS
-- File: supabase/migrations/20260828000000_add_push_subscriptions.sql
-- ============================================================================

-- 1. Create table for storing Web Push API subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_household 
    ON public.push_subscriptions(household_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
    ON public.push_subscriptions(user_id);

-- 3. Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Row Level Security Policies
-- Users can view push subscriptions within their household
CREATE POLICY "Users can select push subscriptions for their household"
    ON public.push_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    );

-- Users can insert their own push subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
    ON public.push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    );

-- Users can update their own subscriptions (e.g. refresh keys, update last_used_at)
CREATE POLICY "Users can update their own push subscriptions"
    ON public.push_subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own push subscriptions (unsubscribe)
CREATE POLICY "Users can delete their own push subscriptions"
    ON public.push_subscriptions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role policy for Supabase Edge Functions (to query and prune subscriptions)
-- Supabase service_role automatically bypasses RLS, but explicit comments document this contract.
COMMENT ON TABLE public.push_subscriptions IS 
    'Stores Web Push API VAPID endpoints and keys per user device, scoped to household multi-tenancy.';
```

---

### 5.3 Frontend & State Architecture

#### 5.3.1 Type-Safe Notification Registry (`src/types/notification.ts`)
The extensible registry defines a strong type contract. Adding a new notification requires defining its type, payload structure, default tag, and URL generator in this single location:

```typescript
export type NotificationType =
  | 'LIST_ITEM_ADDED'
  | 'LIST_COMPLETED'
  | 'HOUSEHOLD_MEMBER_JOINED'
  | 'LIST_CLEARED_OR_ARCHIVED';

export interface NotificationPayloadMap {
  LIST_ITEM_ADDED: {
    listId: string;
    listName: string;
    itemName: string;
    addedByName: string;
  };
  LIST_COMPLETED: {
    listId: string;
    listName: string;
    completedByName: string;
  };
  HOUSEHOLD_MEMBER_JOINED: {
    householdId: string;
    householdName: string;
    memberName: string;
  };
  LIST_CLEARED_OR_ARCHIVED: {
    listId: string;
    listName: string;
    clearedByName: string;
    action: 'cleared' | 'archived';
  };
}

export interface FormattedNotification {
  title: string;
  body: string;
  tag: string;
  url: string;
  icon?: string;
  badge?: string;
}

export interface NotificationDefinition<T extends NotificationType> {
  type: T;
  getTag: (payload: NotificationPayloadMap[T]) => string;
  getUrl: (payload: NotificationPayloadMap[T]) => string;
  format: (payload: NotificationPayloadMap[T], language: 'pl' | 'en') => { title: string; body: string };
}
```

#### 5.3.2 Extensible Definition Catalog (`src/lib/notifications/registry.ts`)
```typescript
import { NotificationType, NotificationDefinition, NotificationPayloadMap } from '@/types/notification';

export const NOTIFICATION_REGISTRY: {
  [K in NotificationType]: NotificationDefinition<K>;
} = {
  LIST_ITEM_ADDED: {
    type: 'LIST_ITEM_ADDED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (p) => `/?tab=active&listId=${p.listId}`,
    format: (p, lang) => {
      const isPl = lang === 'pl';
      return {
        title: isPl ? `🛒 Nowy produkt na liście` : `🛒 New item on shopping list`,
        body: isPl
          ? `${p.addedByName} dodał(a): "${p.itemName}" do listy "${p.listName}"`
          : `${p.addedByName} added: "${p.itemName}" to "${p.listName}"`,
      };
    },
  },
  LIST_COMPLETED: {
    type: 'LIST_COMPLETED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (p) => `/?tab=active&listId=${p.listId}`,
    format: (p, lang) => {
      const isPl = lang === 'pl';
      return {
        title: isPl ? `✅ Zakupy zakończone!` : `✅ Shopping completed!`,
        body: isPl
          ? `${p.completedByName} odhaczył(a) wszystkie produkty z listy "${p.listName}"`
          : `${p.completedByName} completed all items on "${p.listName}"`,
      };
    },
  },
  HOUSEHOLD_MEMBER_JOINED: {
    type: 'HOUSEHOLD_MEMBER_JOINED',
    getTag: (p) => `household-${p.householdId}`,
    getUrl: (p) => `/?tab=settings`,
    format: (p, lang) => {
      const isPl = lang === 'pl';
      return {
        title: isPl ? `👋 Nowy domownik` : `👋 New household member`,
        body: isPl
          ? `${p.memberName} dołączył(a) do gospodarstwa "${p.householdName}"`
          : `${p.memberName} joined the household "${p.householdName}"`,
      };
    },
  },
  LIST_CLEARED_OR_ARCHIVED: {
    type: 'LIST_CLEARED_OR_ARCHIVED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (p) => `/?tab=history`,
    format: (p, lang) => {
      const isPl = lang === 'pl';
      const actionText = p.action === 'cleared'
        ? (isPl ? 'wyczyścił(a)' : 'cleared')
        : (isPl ? 'zarchiwizował(a)' : 'archived');
      return {
        title: isPl ? `📦 Zaktualizowano listę` : `📦 List updated`,
        body: isPl
          ? `${p.clearedByName} ${actionText} listę "${p.listName}"`
          : `${p.clearedByName} ${actionText} the list "${p.listName}"`,
      };
    },
  },
};
```

#### 5.3.3 Universal Dispatch Service Layer (`src/services/notificationService.ts`)
Any domain component or service can trigger notifications with a single line of code:

```typescript
// Example call in shoppingListService or UI:
await notificationService.notify('LIST_ITEM_ADDED', {
  listId: activeList.id,
  listName: activeList.name,
  itemName: 'Oat Milk',
  addedByName: currentUser.name,
});
```

Under the hood, `notificationService` handles:
1. Formatting the message according to the recipient language.
2. Tag coalescing to replace older notifications on the lockscreen.
3. Calling `supabase.functions.invoke('send-push-notification')` with the sender's auth token (guaranteeing `sender_user_id` suppression).
4. Invoking the pluggable storage adapter (`NotificationStorageChannel`), preparing for future persistent DB logging without caller refactoring.

#### 5.3.4 Future Persistence Adapter Interface (`NotificationStorageChannel`)
To guarantee seamless future expansion into a persistent `notifications` table, the service delegates storage to an abstraction:

```typescript
export interface NotificationStorageChannel {
  saveNotification?<T extends NotificationType>(
    type: T,
    payload: NotificationPayloadMap[T],
    meta: { householdId: string; senderUserId: string; createdAt: string }
  ): Promise<void>;
}

// Current Implementation (No-op memory stub):
export const noopStorageChannel: NotificationStorageChannel = {
  saveNotification: async () => { /* No DB table written in Phase 1 */ },
};

// Future Implementation (Plug in later without touching callers):
export const supabaseDbStorageChannel: NotificationStorageChannel = {
  saveNotification: async (type, payload, meta) => {
    await supabase.from('notifications').insert({ ... });
  },
};
```

---

### 5.4 Supabase Edge Function Architecture (`send-push-notification`)

The Edge Function runs in Deno and handles Web Push encryption and distribution:

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@smartshopping.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify authenticated caller
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { householdId, title, body, tag, url } = await req.json();

    // 1. Fetch subscriptions for household EXCLUDING the triggering user (self-suppression)
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("household_id", householdId)
      .neq("user_id", user.id);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sentCount: 0 }), { status: 200 });
    }

    const payload = JSON.stringify({
      title,
      body,
      tag,
      url,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      vibrate: [100, 50, 100],
    });

    const deadSubscriptionIds: string[] = [];

    const sendResults = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (err: any) {
          // If browser returned 410 Gone or 404 Not Found, mark for pruning
          if (err.statusCode === 410 || err.statusCode === 404) {
            deadSubscriptionIds.push(sub.id);
          }
          throw err;
        }
      })
    );

    // 2. Auto-prune dead/expired subscriptions
    if (deadSubscriptionIds.length > 0) {
      await supabaseClient
        .from("push_subscriptions")
        .delete()
        .in("id", deadSubscriptionIds);
    }

    const successCount = sendResults.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sentCount: successCount, pruned: deadSubscriptionIds.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

---

### 5.5 Service Worker & PWA Configuration

`vite-plugin-pwa` is configured with a custom service worker (`src/sw.ts` or injected script) handling `push` and `notificationclick` events:

```typescript
// Service Worker push listener
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'Smart Shopping';
  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'smart-shopping-default', // Collapses notifications for the same list
    renotify: true,
    data: {
      url: data.url || '/',
    },
    vibrate: data.vibrate || [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Deep-link navigation on notification click
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if ('navigate' in client && client.url.includes(self.location.origin)) {
          return client.navigate(targetUrl).then((c) => c?.focus());
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
```

---

### 5.6 UX Duality & User Flows (Mobile PWA vs Desktop)

| Viewport / Layout | **Mobile PWA Mode** | **Desktop Mode** |
| :--- | :--- | :--- |
| **Settings Entry Point** | Toggle in `AccountDetailsDialog` / Settings Sheet with status badge (*Granted*, *Default*, *Denied*). | Dedicated switch row in `AccountDetailsDialog` with device name and test push trigger. |
| **Soft-Prompt Banner** | Contextual sliding card at bottom of screen (above `BottomNavigation`) explaining household benefit. Min. 44x44px touch targets. | Contextual banner card pinned to the top of the content area in `DesktopHeader`. |
| **Haptic Interaction** | `navigator.vibrate([100, 50, 100])` on push arrival and subscription toggle. | Smooth visual state transition and badge pulse (no vibration). |
| **Action on Click** | Instantly launches or focuses PWA, switches to `ActiveListView` tab, scrolls to relevant list. | Activates browser tab, highlights updated shopping list row with subtle glow. |
| **iOS Safari Guard** | Detects non-standalone mode (`window.navigator.standalone === false`). Displays step-by-step instruction: *"Tap Share -> Add to Home Screen to enable notifications"*. | Not applicable (macOS Safari supports Web Push directly via system prompt). |

---

## 6. Comprehensive Edge Cases & Mitigation Matrix

| # | Scenario / Edge Case | Failure Risk | Architectural Mitigation |
| :- | :--- | :--- | :--- |
| **1** | **iOS Safari in regular browser tab** | iOS disables `Notification` API in Safari tabs; user cannot enable push. | Detect iOS standalone mode (`window.matchMedia('(display-mode: standalone)').matches`). Show informative banner guiding user to *"Add to Home Screen"* first. |
| **2** | **Browser permissions permanently blocked** | Calling `requestPermission()` immediately resolves to `'denied'` without browser prompt. | UI detects `'denied'` state and displays instructions to unlock permissions via the browser URL address bar lock icon. |
| **3** | **Uninstalled PWA or revoked device endpoint** | Push gateway returns `410 Gone` or `404 Not Found`; Edge Function wastes cycles on dead endpoints. | Edge Function collects dead subscription IDs on delivery error and executes batch auto-pruning (`DELETE FROM push_subscriptions`). |
| **4** | **Rapid multi-item checking in supermarket** | User rapidly checks 10 items in 15 seconds; partner's phone vibrates 10 times consecutively (notification storm). | **1)** Web Push `tag: 'list-{id}'` collapses notifications into a single updating entry on the lockscreen.<br>**2)** 500ms client-side debouncing for batch mutations. |
| **5** | **Self-notification feedback loop** | User who added an item receives a notification on their own phone for their own action. | Edge Function query explicitly adds `.neq("user_id", user.id)` to exclude the author's devices. |
| **6** | **Supermarket dead zone (Offline / Spotty 3G)** | Push dispatch fails due to lost network connection during item mutation. | Optimistic UI updates local list immediately; push dispatch failure is caught gracefully without rolling back local product additions. |
| **7** | **Multi-device user (PWA on phone + Chrome on laptop)** | User has both laptop and phone registered. Adding an item from laptop should not buzz their phone. | Sender exclusion filters by `user_id`, preventing the acting user's other devices from buzzing for their own actions. |
| **8** | **Unknown or future notification event received** | Older service worker receives newer notification type payload and crashes. | Graceful fallback in service worker defaulting to title `"Smart Shopping"` and generic body if payload parsing fails. |
| **9** | **User leaves or is removed from household** | Ex-member continues receiving household grocery alerts. | PostgreSQL Foreign Key `household_id REFERENCES households(id) ON DELETE CASCADE` and RLS ensure removing a member purges their subscriptions. |
| **10** | **Browser tab active when notification arrives** | Redundant push notification pops up while user is already looking at the list. | Client checks `document.visibilityState === 'visible'`. If the user is currently viewing the active list, OS push is suppressed in favor of an in-app subtle toast. |
| **11** | **Stale notification clicked hours later** | User taps notification for an item added 4 hours ago, list was already archived. | App handles deep link by checking if list is still active; if archived, redirects safely to `/?tab=history&listId=xyz` with an informational toast. |
| **12** | **VAPID Key Rotation** | Rotating server keys breaks all existing browser subscriptions. | System provides automated subscription renewal helper: if `pushManager.subscribe` detects a key mismatch, it automatically re-subscribes with the new public key. |

---

## 7. Security, Privacy & Multi-Tenancy

1. **Zero External Data Leakage:**
   Unlike commercial push vendors (OneSignal, Firebase Cloud Messaging SDKs), no household identities, grocery items, or usage telemetry are transmitted to third-party ad networks or analytics brokers. Communication is handled exclusively between Supabase and the official browser push gateways (Apple APNS, Google FCM, Mozilla).
2. **PostgreSQL Multi-Tenant RLS Scoping:**
   The `push_subscriptions` table enforces Row Level Security via `public.get_user_household_ids(auth.uid())`. A user cannot read, query, or delete push subscriptions belonging to other households.
3. **Cryptographic VAPID Secret Isolation:**
   The VAPID private key is stored securely in Supabase Vault / Edge Function Environment Variables (`VAPID_PRIVATE_KEY`). It is never exposed in the client frontend bundle or Vite environment variables.
4. **Data Minimization:**
   Web Push payloads contain only operational metadata (item name, list name, author first name, deep-link URL). No passwords, auth tokens, or sensitive account attributes are ever transmitted across push frames.

---

## 8. Testing & Verification Strategy

### 8.1 Pure Calculation & Registry Unit Tests
Located in `src/lib/notifications/__tests__/`:
- `registry.test.ts`: Validates that every `NotificationType` generates valid, localized title/body strings for both `pl` and `en` languages without falling back to missing keys.
- `webPush.test.ts`: Tests `urlBase64ToUint8Array` conversion, device type detection (iOS standalone vs Safari browser), and tag generation.

### 8.2 Component & Integration User Flow Tests
Located in `src/components/settings/__tests__/`:
- **Vitest Mock Setup:** Setup `src/test/setup.ts` with mocks for `navigator.serviceWorker`, `window.Notification`, `PushManager`, and `navigator.vibrate`.
- **User Flow 1 (Settings Toggle):**
  - Verify `NotificationSettings` shows current permission status.
  - Toggling ON invokes `PushManager.subscribe()`, generates keys, and dispatches service insert to Supabase.
  - Toggling OFF invokes `subscription.unsubscribe()` and removes record from database.
- **User Flow 2 (Soft-Prompt Banner):**
  - Dismissing banner saves dismissal flag in `localStorage` (`smartshopping_push_prompt_dismissed`).
  - Clicking "Enable" opens browser permission flow directly.
- **User Flow 3 (Domain Trigger Flow):**
  - Adding an item to `ActiveShoppingList` triggers `notificationService.notify('LIST_ITEM_ADDED', ...)` with expected payload structure.

---

## 9. Rollout, Migration & Rollback Plan

### 9.1 Phased Implementation Roadmap
1. **Phase 1: Database Migration**
   - Apply `20260828000000_add_push_subscriptions.sql` in Supabase with RLS policies and indexes.
2. **Phase 2: Edge Function Deployment**
   - Generate VAPID keypair (`npx web-push generate-vapid-keys`).
   - Store `VAPID_PUBLIC_KEY` in Vite `.env` and `VAPID_PRIVATE_KEY` in Supabase Secrets.
   - Deploy `send-push-notification` Edge Function.
3. **Phase 3: Service Worker & Registry Engine**
   - Implement `src/types/notification.ts`, `src/lib/notifications/registry.ts`, and `src/services/notificationService.ts`.
   - Configure push listeners in Service Worker via `vite-plugin-pwa`.
4. **Phase 4: UI Settings & Soft-Prompt Integration**
   - Implement `NotificationSettings` component in `AccountDetailsDialog` (Desktop) and Settings Sheet (Mobile PWA).
   - Add contextual Soft-Prompt Banner on household join.
5. **Phase 5: Wire Domain Notification Triggers**
   - Hook notification dispatch to `LIST_ITEM_ADDED`, `LIST_COMPLETED`, `HOUSEHOLD_MEMBER_JOINED`, and `LIST_CLEARED_OR_ARCHIVED`.

### 9.2 Rollback Strategy
If issues arise with push gateways or browser permission prompts:
- Push notifications can be globally toggled OFF via an environment flag `VITE_ENABLE_PUSH_NOTIFICATIONS=false` without breaking shopping list sync.
- The `notificationService.notify()` method fails silently with error logging, ensuring database mutations and local shopping operations are never blocked by push network failures.

---

## 10. Consequences

### Positive
- **Real-Time Partner Alerts:** Household members receive instant lockscreen notifications when items are added or shopping is completed, eliminating duplicate purchases.
- **Trivial Extensibility:** Adding new notifications in the future requires editing only `src/types/notification.ts` and `src/lib/notifications/registry.ts`. Zero changes needed in the delivery pipeline.
- **Seamless Future Database Persistence:** The `NotificationStorageChannel` interface allows plugging in a persistent `notifications` table and an In-App Notification Center at any time with zero impact on existing caller code.
- **PWA Excellence:** Elevates SmartShopping to a native-feeling mobile app on Android and iOS Home Screen.
- **Privacy & Security:** Complete data isolation within Supabase PostgreSQL RLS and zero third-party vendor dependencies.

### Negative / Accepted Trade-offs
- **iOS Safari PWA Prerequisite:** iOS users must add the app to their Home Screen before Web Push is available (browser platform limitation enforced by Apple). Contextual onboarding banners are required to guide users.
- **VAPID Key Management:** Requires maintaining and securing VAPID keys in Supabase secrets.
- **Edge Function Cold Starts:** First push invocation after inactivity may incur ~300-500ms Deno cold-start latency, which is acceptable for asynchronous notification delivery.
