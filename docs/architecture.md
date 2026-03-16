# DropOS — Architecture Design Document

**Version**: 1.1 | **Date**: 2026-03-16 | **Status**: Authoritative Reference

---

## Table of Contents

1. [PostgreSQL Data Model](#1-postgresql-data-model)
2. [Backend Folder Structure](#2-backend-folder-structure)
3. [Frontend Folder Structure](#3-frontend-folder-structure)
4. [API Endpoint Map (Phase 1 MVP)](#4-api-endpoint-map--phase-1-mvp)
5. [Key Architectural Decisions](#5-key-architectural-decisions)

---

## 1. PostgreSQL Data Model

### Design Principles

- Every user-owned table carries a `tenant_id` (FK to `users`) — never implicit
- Row-Level Security (RLS) enforced at the DB layer on top of application-level filtering
- Cost layers are normalized columns, not JSON blobs — enables indexed aggregations
- Soft deletes via `deleted_at` on all mutable entities
- All monetary values stored as `BIGINT` in cents — avoids floating-point errors

---

### Core Identity & Auth

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       TEXT,
    plan            TEXT NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free','starter','growth','enterprise')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    device_hint     TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

---

### Multi-Store Layer

```sql
CREATE TABLE stores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shopify_domain      TEXT NOT NULL UNIQUE,
    shopify_access_token TEXT NOT NULL,            -- encrypted at rest
    shopify_shop_id     TEXT NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    timezone            TEXT NOT NULL DEFAULT 'UTC',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    webhook_secret      TEXT,
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX idx_stores_tenant      ON stores(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stores_domain      ON stores(shopify_domain);
CREATE UNIQUE INDEX idx_stores_shopify_id ON stores(shopify_shop_id);
```

---

### Products & Catalog

```sql
CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES users(id),
    store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    shopify_product_id  TEXT NOT NULL,
    title               TEXT NOT NULL,
    sku                 TEXT,
    hs_code             TEXT,                      -- Harmonized System tariff code
    origin_country      CHAR(2),                   -- ISO 3166-1 alpha-2
    weight_grams        INTEGER,
    status              TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','archived','draft')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE (store_id, shopify_product_id)
);
CREATE INDEX idx_products_store    ON products(store_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_tenant   ON products(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_hs_code  ON products(hs_code);

CREATE TABLE product_variants (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id              UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id               UUID NOT NULL REFERENCES users(id),
    shopify_variant_id      TEXT NOT NULL,
    title                   TEXT NOT NULL,
    sku                     TEXT,
    barcode                 TEXT,
    price_cents             BIGINT NOT NULL DEFAULT 0,
    compare_at_price_cents  BIGINT,
    inventory_quantity      INTEGER NOT NULL DEFAULT 0,
    UNIQUE (product_id, shopify_variant_id)
);
CREATE INDEX idx_variants_product ON product_variants(product_id);
```

---

### Supplier Network

```sql
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    contact_email   TEXT,
    country         CHAR(2),
    api_endpoint    TEXT,
    api_key_enc     TEXT,                          -- encrypted
    lead_time_days  INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id) WHERE deleted_at IS NULL;

-- Many-to-many with routing priority
CREATE TABLE product_supplier_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES users(id),
    product_variant_id  UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    supplier_id         UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    priority            SMALLINT NOT NULL DEFAULT 1,   -- 1 = primary, 2 = failover
    supplier_sku        TEXT,
    cogs_cents          BIGINT NOT NULL DEFAULT 0,
    shipping_cost_cents BIGINT NOT NULL DEFAULT 0,
    stock_quantity      INTEGER,
    last_stock_sync_at  TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (product_variant_id, supplier_id)
);
CREATE INDEX idx_psl_variant   ON product_supplier_links(product_variant_id);
CREATE INDEX idx_psl_supplier  ON product_supplier_links(supplier_id);
CREATE INDEX idx_psl_priority  ON product_supplier_links(product_variant_id, priority)
    WHERE is_active = TRUE;

-- Daily materialized supplier metrics
CREATE TABLE supplier_performance_snapshots (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id                 UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES users(id),
    snapshot_date               DATE NOT NULL,
    orders_total                INTEGER NOT NULL DEFAULT 0,
    orders_dispatched_on_time   INTEGER NOT NULL DEFAULT 0,
    stock_checks_total          INTEGER NOT NULL DEFAULT 0,
    stock_accurate              INTEGER NOT NULL DEFAULT 0,
    quality_disputes_total      INTEGER NOT NULL DEFAULT 0,
    on_time_dispatch_rate       NUMERIC(5,4),
    stock_accuracy_rate         NUMERIC(5,4),
    quality_dispute_rate        NUMERIC(5,4),
    composite_score             NUMERIC(5,4),
    UNIQUE (supplier_id, snapshot_date)
);
CREATE INDEX idx_supplier_perf_date ON supplier_performance_snapshots(supplier_id, snapshot_date DESC);
```

---

### Orders & Cost Layers (Financial Core)

```sql
CREATE TABLE orders (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                       UUID NOT NULL REFERENCES users(id),
    store_id                        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    shopify_order_id                TEXT NOT NULL,
    shopify_order_number            TEXT,
    currency                        CHAR(3) NOT NULL,
    status                          TEXT NOT NULL DEFAULT 'pending'
                                        CHECK (status IN (
                                            'pending','processing','fulfilled',
                                            'partially_fulfilled','cancelled','refunded'
                                        )),
    fulfillment_status              TEXT,
    customer_email                  TEXT,
    ordered_at                      TIMESTAMPTZ NOT NULL,
    fulfilled_at                    TIMESTAMPTZ,
    cancelled_at                    TIMESTAMPTZ,

    -- Revenue
    gross_revenue_cents             BIGINT NOT NULL DEFAULT 0,
    discount_amount_cents           BIGINT NOT NULL DEFAULT 0,
    net_revenue_cents               BIGINT NOT NULL DEFAULT 0,

    -- Cost layer 1: COGS
    cogs_cents                      BIGINT NOT NULL DEFAULT 0,
    -- Cost layer 2: Outbound shipping
    shipping_cost_cents             BIGINT NOT NULL DEFAULT 0,
    -- Cost layer 3: Platform fees (Shopify)
    platform_fee_cents              BIGINT NOT NULL DEFAULT 0,
    -- Cost layer 4: Payment processing (Stripe/PayPal)
    payment_processing_fee_cents    BIGINT NOT NULL DEFAULT 0,
    -- Cost layer 5: Chargeback fees
    chargeback_fee_cents            BIGINT NOT NULL DEFAULT 0,
    -- Cost layer 6: Refund/return processing
    refund_fee_cents                BIGINT NOT NULL DEFAULT 0,
    -- Cost layer 7: Currency conversion loss
    fx_loss_cents                   BIGINT NOT NULL DEFAULT 0,
    -- Cost layer 8: Import duties
    import_duty_cents               BIGINT NOT NULL DEFAULT 0,

    -- Derived (maintained by trigger or service)
    total_cost_cents                BIGINT NOT NULL DEFAULT 0,
    net_profit_cents                BIGINT NOT NULL DEFAULT 0,
    profit_margin                   NUMERIC(6,4),

    -- Supplier routing
    fulfilled_by_supplier_id        UUID REFERENCES suppliers(id),
    was_failover                    BOOLEAN NOT NULL DEFAULT FALSE,

    raw_shopify_payload             JSONB,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (store_id, shopify_order_id)
);
CREATE INDEX idx_orders_tenant      ON orders(tenant_id);
CREATE INDEX idx_orders_store       ON orders(store_id);
CREATE INDEX idx_orders_ordered_at  ON orders(ordered_at DESC);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_profit      ON orders(net_profit_cents);
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, ordered_at DESC)
    WHERE cancelled_at IS NULL;

CREATE TABLE order_line_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id               UUID NOT NULL REFERENCES users(id),
    product_variant_id      UUID REFERENCES product_variants(id),
    shopify_line_item_id    TEXT NOT NULL,
    title                   TEXT NOT NULL,
    sku                     TEXT,
    quantity                INTEGER NOT NULL DEFAULT 1,
    unit_price_cents        BIGINT NOT NULL DEFAULT 0,
    unit_cogs_cents         BIGINT NOT NULL DEFAULT 0,
    unit_shipping_cents     BIGINT NOT NULL DEFAULT 0,
    unit_import_duty_cents  BIGINT NOT NULL DEFAULT 0,
    line_revenue_cents      BIGINT NOT NULL DEFAULT 0,
    line_cost_cents         BIGINT NOT NULL DEFAULT 0,
    line_profit_cents       BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_line_items_order   ON order_line_items(order_id);
CREATE INDEX idx_line_items_variant ON order_line_items(product_variant_id);
```

---

### Tariff & Duty Data

```sql
-- Sourced from WTO/UNCTAD, refreshed quarterly
CREATE TABLE tariff_rates (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hs_code               TEXT NOT NULL,
    origin_country        CHAR(2) NOT NULL,
    dest_country          CHAR(2) NOT NULL,
    rate                  NUMERIC(6,4) NOT NULL,    -- e.g. 0.0750 = 7.5%
    rate_type             TEXT NOT NULL DEFAULT 'ad_valorem'
                              CHECK (rate_type IN ('ad_valorem','specific','compound')),
    specific_amount_cents BIGINT,
    effective_from        DATE NOT NULL,
    effective_to          DATE,                     -- NULL = currently active
    source                TEXT DEFAULT 'WTO',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_tariff_lookup
    ON tariff_rates(hs_code, origin_country, dest_country, effective_from)
    WHERE effective_to IS NULL;
CREATE INDEX idx_tariff_hs    ON tariff_rates(hs_code);
CREATE INDEX idx_tariff_route ON tariff_rates(origin_country, dest_country);

-- Computed landed costs cache (7-day TTL)
CREATE TABLE tariff_cache (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key             TEXT NOT NULL UNIQUE,   -- SHA256(hs_code|origin|dest|value_cents)
    hs_code               TEXT NOT NULL,
    origin_country        CHAR(2) NOT NULL,
    dest_country          CHAR(2) NOT NULL,
    declared_value_cents  BIGINT NOT NULL,
    duty_cents            BIGINT NOT NULL,
    landed_cost_cents     BIGINT NOT NULL,
    computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at            TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_tariff_cache_key ON tariff_cache(cache_key);
CREATE INDEX idx_tariff_cache_exp ON tariff_cache(expires_at);
```

---

### Routing Rule Sets (Phase 2, pre-designed)

```sql
-- routing_rule_sets: named rule sets per tenant
CREATE TABLE routing_rule_sets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,                  -- e.g. "VIP Orders", "EU Geographic"
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    priority        SMALLINT NOT NULL DEFAULT 1,    -- lower = evaluated first
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_routing_rule_sets_tenant ON routing_rule_sets(tenant_id)
    WHERE is_active = TRUE;

-- routing_rules: individual rules within a set
CREATE TABLE routing_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_id         UUID NOT NULL REFERENCES routing_rule_sets(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES users(id),
    rule_type           TEXT NOT NULL
                            CHECK (rule_type IN (
                                'geographic',       -- route by customer country
                                'sku_prefix',       -- route by SKU prefix
                                'cost_optimize',    -- pick cheapest supplier with stock
                                'vip_tag',          -- order tag → fastest supplier
                                'back_order_split'  -- split order if partial stock
                            )),
    -- Condition fields (only relevant ones populated per rule_type)
    condition_country   CHAR(2),                    -- for geographic
    condition_sku_prefix TEXT,                      -- for sku_prefix
    condition_order_tag TEXT,                       -- for vip_tag
    -- Action fields
    target_supplier_id  UUID REFERENCES suppliers(id),
    fallback_action     TEXT DEFAULT 'next_rule'
                            CHECK (fallback_action IN ('next_rule','cancel','back_order')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_routing_rules_set    ON routing_rules(rule_set_id);
CREATE INDEX idx_routing_rules_tenant ON routing_rules(tenant_id);
```

---

### Pricing Rules (Phase 3, pre-designed)

```sql
-- pricing_rules: automated pricing logic per store/product
CREATE TABLE pricing_rules (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id                UUID REFERENCES stores(id) ON DELETE CASCADE, -- NULL = all stores
    product_id              UUID REFERENCES products(id) ON DELETE CASCADE, -- NULL = all products
    rule_type               TEXT NOT NULL
                                CHECK (rule_type IN (
                                    'tiered_markup',    -- cost-bracket multipliers
                                    'margin_floor',     -- auto-raise/unpublish below threshold
                                    'map_compliance',   -- enforce supplier MAP
                                    'psych_rounding'    -- .99/.95 endings
                                )),
    -- Tiered markup fields
    cost_threshold_cents    BIGINT,                 -- e.g. 1000 = under $10
    markup_multiplier       NUMERIC(6,3),           -- e.g. 3.000 = 3x
    -- Margin floor fields
    margin_floor_pct        NUMERIC(5,4),           -- e.g. 0.30 = 30%
    below_floor_action      TEXT DEFAULT 'raise_price'
                                CHECK (below_floor_action IN ('raise_price','unpublish','alert')),
    -- MAP fields
    map_price_cents         BIGINT,
    -- Psychological rounding fields
    rounding_target         NUMERIC(4,2),           -- e.g. 0.99 or 0.95
    rounding_price_ceiling_cents BIGINT,            -- apply only below this price
    -- Common
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    priority                SMALLINT NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pricing_rules_tenant  ON pricing_rules(tenant_id) WHERE is_active = TRUE;
CREATE INDEX idx_pricing_rules_store   ON pricing_rules(store_id) WHERE is_active = TRUE;
CREATE INDEX idx_pricing_rules_product ON pricing_rules(product_id) WHERE is_active = TRUE;
```

---

### Analytics Aggregates

```sql
-- Pre-aggregated nightly by background worker
CREATE TABLE daily_store_metrics (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL REFERENCES users(id),
    store_id                    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    metric_date                 DATE NOT NULL,
    orders_count                INTEGER NOT NULL DEFAULT 0,
    gross_revenue_cents         BIGINT NOT NULL DEFAULT 0,
    net_revenue_cents           BIGINT NOT NULL DEFAULT 0,
    total_cogs_cents            BIGINT NOT NULL DEFAULT 0,
    total_shipping_cents        BIGINT NOT NULL DEFAULT 0,
    total_platform_fees_cents   BIGINT NOT NULL DEFAULT 0,
    total_payment_fees_cents    BIGINT NOT NULL DEFAULT 0,
    total_import_duties_cents   BIGINT NOT NULL DEFAULT 0,
    total_refunds_cents         BIGINT NOT NULL DEFAULT 0,
    total_chargebacks_cents     BIGINT NOT NULL DEFAULT 0,
    total_fx_loss_cents         BIGINT NOT NULL DEFAULT 0,
    total_cost_cents            BIGINT NOT NULL DEFAULT 0,
    net_profit_cents            BIGINT NOT NULL DEFAULT 0,
    avg_order_value_cents       BIGINT NOT NULL DEFAULT 0,
    avg_profit_margin           NUMERIC(6,4),
    refund_rate                 NUMERIC(6,4),
    UNIQUE (store_id, metric_date)
);
CREATE INDEX idx_daily_metrics_tenant ON daily_store_metrics(tenant_id, metric_date DESC);
CREATE INDEX idx_daily_metrics_store  ON daily_store_metrics(store_id, metric_date DESC);
```

---

### Supporting Tables

```sql
-- Append-only audit ledger
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES users(id),
    actor_id        UUID REFERENCES users(id),      -- NULL = system/webhook
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL,                  -- 'create','update','delete'
    changed_fields  JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_tenant  ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity  ON audit_log(entity_type, entity_id);

-- Shopify webhook idempotency store
CREATE TABLE webhook_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    shopify_event_id  TEXT NOT NULL,               -- X-Shopify-Webhook-Id header
    topic             TEXT NOT NULL,               -- 'orders/create', etc.
    status            TEXT NOT NULL DEFAULT 'received'
                          CHECK (status IN ('received','processing','processed','failed','skipped')),
    payload           JSONB NOT NULL,
    error_message     TEXT,
    attempt_count     SMALLINT NOT NULL DEFAULT 0,
    processed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (store_id, shopify_event_id)
);
CREATE INDEX idx_webhook_store  ON webhook_events(store_id);
CREATE INDEX idx_webhook_status ON webhook_events(status, created_at)
    WHERE status IN ('received','failed');
```

---

## 2. Backend Folder Structure

```
backend/
├── app/
│   ├── main.py                        # FastAPI app factory, lifespan, CORS, routers
│   ├── config.py                      # Pydantic Settings (env vars)
│   ├── database.py                    # Async SQLAlchemy engine + session factory
│   │
│   ├── auth/
│   │   ├── router.py                  # POST /auth/register, /login, /refresh, /logout
│   │   ├── service.py                 # password hashing, JWT mint/verify
│   │   ├── schemas.py
│   │   ├── dependencies.py            # get_current_user(), require_plan()
│   │   └── models.py
│   │
│   ├── stores/
│   │   ├── router.py                  # CRUD + /connect (OAuth), /sync
│   │   ├── service.py                 # Shopify OAuth, store sync orchestration
│   │   ├── schemas.py
│   │   └── models.py
│   │
│   ├── orders/
│   │   ├── router.py
│   │   ├── service.py                 # profit calculation, cost layer assembly
│   │   ├── schemas.py
│   │   ├── models.py
│   │   └── cost_calculator.py        # pure functions: compute_net_profit(), etc.
│   │
│   ├── analytics/
│   │   ├── router.py                  # /summary, /trends, /breakdown, /compare
│   │   ├── service.py                 # query daily_store_metrics + live fallback
│   │   ├── schemas.py
│   │   └── aggregator.py             # nightly job: build daily_store_metrics
│   │
│   ├── products/
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── models.py
│   │
│   ├── suppliers/
│   │   ├── router.py                  # CRUD, /performance, /routing-rules
│   │   ├── service.py                 # failover logic, performance scoring
│   │   ├── schemas.py
│   │   └── models.py
│   │
│   ├── tariffs/
│   │   ├── router.py                  # GET /tariffs/calculate
│   │   ├── service.py                 # HS lookup, duty calc, cache management
│   │   ├── schemas.py
│   │   └── models.py
│   │
│   ├── webhooks/
│   │   ├── router.py                  # POST /webhooks/shopify/{store_id}
│   │   ├── handler.py                 # dispatch by topic
│   │   ├── verifier.py               # HMAC-SHA256 signature check
│   │   └── schemas.py
│   │
│   ├── workers/
│   │   ├── scheduler.py
│   │   ├── aggregate_metrics.py      # nightly: rebuild daily_store_metrics
│   │   ├── sync_inventory.py         # hourly: pull stock from supplier APIs
│   │   ├── score_suppliers.py        # daily: compute performance snapshots
│   │   └── expire_tariff_cache.py
│   │
│   ├── common/
│   │   ├── models.py                  # Base ORM (id, timestamps, tenant_id)
│   │   ├── pagination.py
│   │   ├── exceptions.py             # DropOSError, NotFoundError, ForbiddenError
│   │   ├── middleware.py             # TenantMiddleware, RequestLoggingMiddleware
│   │   └── security.py               # encrypt/decrypt API keys at rest
│   │
│   └── migrations/
│       └── versions/
│
├── tests/
│   ├── conftest.py
│   ├── auth/
│   ├── orders/
│   ├── analytics/
│   ├── tariffs/
│   └── webhooks/
│
├── alembic.ini
├── pyproject.toml
├── requirements.txt
└── .env.example
```

---

## 3. Frontend Folder Structure

```
frontend/
├── app/                               # Next.js 15 App Router
│   ├── layout.tsx                     # Root layout: providers, fonts
│   ├── page.tsx                       # Landing / marketing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   │
│   └── (dashboard)/                   # Authenticated shell
│       ├── layout.tsx                 # Sidebar + topbar + auth guard
│       ├── overview/page.tsx          # Multi-store profit summary
│       │
│       ├── analytics/
│       │   ├── page.tsx               # KPI cards + date range
│       │   ├── [storeId]/page.tsx     # Per-store deep-dive
│       │   ├── [storeId]/breakdown/page.tsx
│       │   ├── [storeId]/trends/page.tsx
│       │   └── compare/page.tsx       # Side-by-side store comparison
│       │
│       ├── orders/
│       │   ├── page.tsx               # Order table with all cost columns
│       │   └── [orderId]/page.tsx     # Order detail: 8 cost layers
│       │
│       ├── products/
│       │   ├── page.tsx
│       │   └── [productId]/page.tsx
│       │
│       ├── suppliers/
│       │   ├── page.tsx               # Supplier list + scores
│       │   ├── [supplierId]/page.tsx
│       │   └── routing/page.tsx       # Failover rules editor
│       │
│       ├── stores/
│       │   ├── page.tsx
│       │   ├── connect/page.tsx       # Shopify OAuth
│       │   └── [storeId]/page.tsx
│       │
│       └── settings/
│           ├── page.tsx
│           ├── plan/page.tsx
│           └── api-keys/page.tsx
│
├── components/
│   ├── ui/                            # Primitives (Button, Card, DataTable...)
│   ├── charts/
│   │   ├── ProfitTrendChart.tsx
│   │   ├── CostBreakdownPie.tsx
│   │   ├── StoreCompareBar.tsx
│   │   └── SparkLine.tsx
│   ├── analytics/
│   │   ├── KPICard.tsx
│   │   ├── CostLayerTable.tsx
│   │   └── ProfitSummaryPanel.tsx
│   ├── orders/
│   │   ├── OrderRow.tsx
│   │   └── OrderCostDetail.tsx
│   ├── suppliers/
│   │   ├── SupplierScoreCard.tsx
│   │   └── RoutingRuleEditor.tsx
│   ├── stores/
│   │   ├── StoreCard.tsx
│   │   └── ConnectShopifyButton.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── TopBar.tsx
│       └── PageHeader.tsx
│
├── hooks/
│   ├── useAnalytics.ts
│   ├── useOrders.ts
│   ├── useStores.ts
│   ├── useSuppliers.ts
│   ├── useDateRange.ts
│   ├── useAuth.ts
│   └── useTenantStore.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts                 # Fetch wrapper: auth headers, token refresh
│   │   ├── analytics.ts
│   │   ├── orders.ts
│   │   ├── stores.ts
│   │   ├── suppliers.ts
│   │   └── auth.ts
│   ├── formatters.ts                 # formatCents(), formatMargin(), formatDate()
│   ├── constants.ts                  # COST_LAYER_LABELS, STATUS_COLORS
│   └── utils.ts
│
├── store/
│   └── appStore.ts                   # Zustand: activeStoreId, dateRange, user
│
├── types/
│   ├── api.ts
│   ├── analytics.ts
│   ├── orders.ts
│   └── stores.ts
│
├── middleware.ts                      # JWT check → redirect to /login
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. API Endpoint Map — Phase 1 MVP

### Auth — `/api/v1/auth`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Return access + refresh tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Current user profile |
| PATCH | `/auth/me` | Update profile |

### Stores — `/api/v1/stores`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stores` | List tenant stores |
| POST | `/stores` | Register store |
| GET | `/stores/{store_id}` | Store detail |
| PATCH | `/stores/{store_id}` | Update settings |
| DELETE | `/stores/{store_id}` | Disconnect (soft delete) |
| POST | `/stores/{store_id}/sync` | Trigger re-sync |
| GET | `/stores/{store_id}/sync/status` | Poll sync progress |
| GET | `/stores/connect/shopify` | Begin Shopify OAuth |
| GET | `/stores/connect/shopify/callback` | OAuth callback |

### Orders — `/api/v1/orders`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/orders` | Paginated list with cost columns |
| GET | `/orders/{order_id}` | Full detail: all 8 cost layers |
| PATCH | `/orders/{order_id}/costs` | Manual cost override |
| GET | `/orders/{order_id}/line-items` | Per-unit costs |
| GET | `/orders/export` | CSV export |

Query params: `store_id`, `status`, `from_date`, `to_date`, `page`, `page_size`, `sort_by`, `sort_dir`

### Analytics — `/api/v1/analytics`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/analytics/summary` | KPI snapshot (revenue, cost, profit, margin) |
| GET | `/analytics/trends` | Day/week/month profit series |
| GET | `/analytics/breakdown` | Cost by layer (pie/bar data) |
| GET | `/analytics/stores/compare` | Side-by-side all stores |
| GET | `/analytics/top-products` | Products ranked by profit |
| GET | `/analytics/top-orders` | Most/least profitable orders |
| GET | `/analytics/refunds` | Refund rate + cost impact |

All accept: `store_id` (optional), `from_date`, `to_date`, `granularity` (`day|week|month`)

### Products — `/api/v1/products`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/products` | Product list with sourcing info |
| GET | `/products/{product_id}` | Detail with variants + supplier links |
| PATCH | `/products/{product_id}` | Update HS code, origin country, weight |
| GET | `/products/{product_id}/landed-cost` | Calculate landed cost for destination |

### Suppliers — `/api/v1/suppliers`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/suppliers` | List suppliers |
| POST | `/suppliers` | Create supplier |
| GET | `/suppliers/{supplier_id}` | Detail + performance scores |
| PATCH | `/suppliers/{supplier_id}` | Update |
| DELETE | `/suppliers/{supplier_id}` | Soft delete |
| GET | `/suppliers/{supplier_id}/performance` | Historical snapshots |
| POST | `/suppliers/{supplier_id}/products/{variant_id}` | Link variant |
| PATCH | `/suppliers/{supplier_id}/products/{variant_id}` | Update priority/COGS |
| DELETE | `/suppliers/{supplier_id}/products/{variant_id}` | Unlink |

### Tariffs — `/api/v1/tariffs`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/tariffs/calculate` | Landed cost: `hs_code`, `origin`, `destination`, `value_cents` |
| GET | `/tariffs/rates` | Raw tariff rate lookup |

### Webhooks — `/api/v1/webhooks`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/webhooks/shopify/{store_id}` | Receive Shopify events |

---

## 5. Key Architectural Decisions

### Multi-Tenancy (3 layers)

1. **Application layer**: Every service receives `tenant_id` from JWT. All queries include `WHERE tenant_id = :tenant_id`
2. **Database RLS**: PostgreSQL policies set `app.current_tenant_id` per connection — cross-tenant data leaks impossible even with query injection
3. **Webhook verification**: `store_id` in webhook URL validated against tenant — HMAC check before any business logic

### Money Storage

All amounts stored as `BIGINT` cents. Currency ISO code on parent table. `formatCents(amount, currency)` handles display. Zero floating-point rounding across all aggregations.

### Cost Layers as Columns (not JSONB)

8 normalized cost columns on `orders`. Enables: indexed `SUM()` aggregations, schema enforcement, readable SQL. Trade-off: new cost type = migration (acceptable — domain is stable).

### Analytics Performance

`daily_store_metrics` built nightly by background worker. Dashboard queries hit this table, not raw `orders`. Same-day data falls back to live `orders` query.

### Webhook Idempotency

```
1. HMAC verify → reject if invalid
2. INSERT webhook_events (shopify_event_id) ON CONFLICT DO NOTHING
   → 0 rows = already processed → return 200 immediately
3. Enqueue background task
4. Return 200 to Shopify within 5s
5. Worker processes async: dispatch by topic → update status
   → retry up to 3x with exponential backoff on failure
```

### Auth Token Design

- Access token: 15 min, stateless JWT with `jti`
- Refresh token: 30 days, hashed and stored in DB, rotated on use
- RLS context: `app.current_tenant_id` injected per DB session from JWT

### Supplier Failover (Phase 2, pre-designed)

`product_supplier_links.priority` already in schema. On order: iterate links ordered by priority, use first with `stock_quantity > 0`. Record `was_failover = TRUE` on order for analytics.

---

## Quick Reference

| Concern | Decision |
|---------|----------|
| Money | `BIGINT` cents + currency ISO |
| Multi-tenancy | JWT + app filter + DB RLS |
| Cost layers | Normalized columns on `orders` |
| Analytics perf | Nightly aggregate table + live fallback |
| Webhook dedup | `webhook_events` keyed on Shopify event ID |
| Tariff data | WTO import → `tariff_rates` + 7-day computed cache |
| Auth | 15-min access (stateless) + 30-day refresh (DB-tracked) |
| Supplier routing | Priority column, failover recorded on order |
| Secrets | Supplier API keys + Shopify tokens encrypted at app layer |
