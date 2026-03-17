from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from app.auth.dependencies import CurrentUser
from app.config import settings
from app.database import AsyncSession, get_db
from app.stores.schemas import (
    CreateStoreRequest,
    OAuthStartResponse,
    StoreResponse,
    SyncStatusResponse,
    UpdateStoreRequest,
)
from app.stores.service import StoreService
from app.stores.shopify_oauth import (
    build_oauth_url,
    exchange_code_for_token,
    generate_state,
    get_shop_info,
    verify_hmac,
)

router = APIRouter(prefix="/stores", tags=["Stores"])

DbDep = Annotated[AsyncSession, Depends(get_db)]

# In-memory nonce store (dev only — use Redis in production)
_pending_states: dict[str, str] = {}  # state → user_id


@router.get(
    "/oauth/start",
    response_model=OAuthStartResponse,
    summary="Generate Shopify OAuth URL",
)
async def oauth_start(
    current_user: CurrentUser,
    shop: str = Query(..., description="myshopify.com domain e.g. mystore.myshopify.com"),
) -> OAuthStartResponse:
    """Returns the Shopify OAuth authorization URL for the given shop."""
    if not shop.endswith(".myshopify.com"):
        raise HTTPException(status_code=400, detail="Invalid shop domain.")
    state = generate_state()
    _pending_states[state] = str(current_user.id)
    oauth_url = build_oauth_url(shop, state)
    return OAuthStartResponse(oauth_url=oauth_url)


@router.get(
    "/oauth/callback",
    summary="Shopify OAuth callback — exchanges code for access token",
)
async def oauth_callback(
    request: Request,
    db: DbDep,
    shop: str = Query(...),
    code: str = Query(...),
    state: str = Query(...),
    hmac: str = Query(...),
) -> RedirectResponse:
    """Handle the redirect from Shopify after the merchant approves the app."""
    # 1. Verify HMAC
    raw_params = dict(request.query_params)
    if not verify_hmac(raw_params):
        raise HTTPException(status_code=400, detail="HMAC verification failed.")

    # 2. Validate state (CSRF check)
    tenant_id = _pending_states.pop(state, None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")

    # 3. Exchange code → access token
    access_token = await exchange_code_for_token(shop, code)

    # 4. Fetch shop metadata
    shop_info = await get_shop_info(shop, access_token)
    store_name = shop_info.get("name", shop)
    currency = shop_info.get("currency", "USD")

    # 5. Persist store
    svc = StoreService(db)
    await svc.upsert_oauth_store(
        tenant_id=uuid.UUID(tenant_id),
        shopify_domain=shop,
        name=store_name,
        currency=currency,
        access_token=access_token,
    )

    # 6. Redirect to frontend success page
    return RedirectResponse(
        url=f"http://localhost:3000/stores?connected={shop}",
        status_code=302,
    )


@router.get("", response_model=list[StoreResponse], summary="List all stores for the current tenant")
async def list_stores(current_user: CurrentUser, db: DbDep) -> list[StoreResponse]:
    return await StoreService(db).list_stores(current_user.id)


@router.post(
    "",
    response_model=StoreResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Connect a new Shopify store",
)
async def create_store(
    body: CreateStoreRequest, current_user: CurrentUser, db: DbDep
) -> StoreResponse:
    return await StoreService(db).create_store(current_user.id, body)


@router.get("/{store_id}", response_model=StoreResponse, summary="Get a single store")
async def get_store(
    store_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> StoreResponse:
    return await StoreService(db).get_store(store_id, current_user.id)


@router.patch("/{store_id}", response_model=StoreResponse, summary="Update store metadata")
async def update_store(
    store_id: uuid.UUID,
    body: UpdateStoreRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> StoreResponse:
    return await StoreService(db).update_store(store_id, current_user.id, body)


@router.delete(
    "/{store_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a store",
)
async def delete_store(
    store_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> Response:
    await StoreService(db).delete_store(store_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{store_id}/sync",
    response_model=SyncStatusResponse,
    summary="Trigger an incremental sync from Shopify",
)
async def trigger_sync(
    store_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbDep,
    full: bool = Query(default=False, description="Set true to re-sync all orders from scratch"),
) -> SyncStatusResponse:
    return await StoreService(db).trigger_sync(store_id, current_user.id, full_sync=full)


@router.get(
    "/{store_id}/sync/status",
    response_model=SyncStatusResponse,
    summary="Get sync status for a store",
)
async def sync_status(
    store_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> SyncStatusResponse:
    return await StoreService(db).get_sync_status(store_id, current_user.id)
