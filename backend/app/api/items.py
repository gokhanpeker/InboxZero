"""Item retry endpoint."""

from fastapi import APIRouter

from app.api.deps import CurrentUserId, DbSession
from app.schemas.items import ItemResponse
from app.services.job_service import retry_item as retry_item_service

router = APIRouter(tags=["items"])


@router.post("/items/{item_id}/retry", response_model=ItemResponse)
def retry_item(
    item_id: int,
    db: DbSession,
    user_id: CurrentUserId,
) -> ItemResponse:
    """Re-enqueue a failed or stuck item for background processing."""
    return ItemResponse(**retry_item_service(db, user_id, item_id))
