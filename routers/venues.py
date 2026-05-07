from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db, Venue, Reservation

router = APIRouter(prefix="/api/venues", tags=["venues"])

class VenueIn(BaseModel):
    name: str
    memo: Optional[str] = ""

class VenueOut(VenueIn):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=list[VenueOut])
def get_venues(db: Session = Depends(get_db)):
    return db.query(Venue).order_by(Venue.name).all()

def find_duplicate_venue(db: Session, name: str, exclude_id: Optional[int] = None):
    q = db.query(Venue).filter(func.lower(Venue.name) == name.strip().lower())
    if exclude_id:
        q = q.filter(Venue.id != exclude_id)
    return q.first()

@router.post("/", response_model=VenueOut)
def create_venue(data: VenueIn, db: Session = Depends(get_db)):
    payload = data.model_dump()
    payload["name"] = payload["name"].strip()
    if not payload["name"]:
        raise HTTPException(status_code=400, detail="행사장명을 입력해 주세요.")
    if find_duplicate_venue(db, payload["name"]):
        raise HTTPException(status_code=409, detail=f"이미 등록된 행사장입니다: {payload['name']}")
    v = Venue(**payload)
    db.add(v); db.commit(); db.refresh(v)
    return v

@router.put("/{vid}", response_model=VenueOut)
def update_venue(vid: int, data: VenueIn, db: Session = Depends(get_db)):
    v = db.query(Venue).filter(Venue.id == vid).first()
    if not v: raise HTTPException(status_code=404, detail="Not found")
    payload = data.model_dump()
    payload["name"] = payload["name"].strip()
    if not payload["name"]:
        raise HTTPException(status_code=400, detail="행사장명을 입력해 주세요.")
    if find_duplicate_venue(db, payload["name"], exclude_id=vid):
        raise HTTPException(status_code=409, detail=f"이미 등록된 행사장입니다: {payload['name']}")
    for k, val in payload.items(): setattr(v, k, val)
    db.commit(); db.refresh(v)
    return v

@router.delete("/{vid}")
def delete_venue(vid: int, db: Session = Depends(get_db)):
    v = db.query(Venue).filter(Venue.id == vid).first()
    if not v: raise HTTPException(status_code=404, detail="Not found")
    in_use = db.query(Reservation.id).filter(Reservation.venue_id == vid).first()
    if in_use:
        raise HTTPException(status_code=409, detail="예약에 사용 중인 행사장은 삭제할 수 없습니다.")
    db.delete(v); db.commit()
    return {"ok": True}
