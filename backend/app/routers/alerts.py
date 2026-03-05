from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.schemas.schemas import AlertCreate, AlertResponse, MessageResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/", response_model=list[AlertResponse])
async def get_alerts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).where(Alert.user_id == current_user.id))
    return result.scalars().all()

@router.post("/", response_model=AlertResponse)
async def create_alert(
    payload: AlertCreate, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    new_alert = Alert(
        user_id=current_user.id,
        coin_name=payload.coin_name,
        symbol=payload.symbol.lower(),
        target_price=payload.target_price,
        direction=payload.direction
    )
    db.add(new_alert)
    await db.flush()
    await db.refresh(new_alert)
    return new_alert

@router.delete("/{alert_id}", response_model=MessageResponse)
async def delete_alert(
    alert_id: int, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.flush()
    return MessageResponse(message="Alert deleted")
