"""Item retry endpoint."""

from fastapi import APIRouter

from app.api.deps import CurrentUserId, DbSession
from app.schemas.items import ItemResponse
from app.services.job_service import retry_failed_item

router = APIRouter(tags=["items"])


@router.post("/items/{item_id}/retry", response_model=ItemResponse)
def retry_item(
    item_id: int,
    db: DbSession,
    user_id: CurrentUserId,
) -> ItemResponse:
    """Re-enqueue a failed item for background processing."""
    return ItemResponse(**retry_failed_item(db, user_id, item_id))
