from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db, Venue

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

@router.post("/", response_model=VenueOut)
def create_venue(data: VenueIn, db: Session = Depends(get_db)):
    v = Venue(**data.model_dump())
    db.add(v); db.commit(); db.refresh(v)
    return v

@router.put("/{vid}", response_model=VenueOut)
def update_venue(vid: int, data: VenueIn, db: Session = Depends(get_db)):
    v = db.query(Venue).filter(Venue.id == vid).first()
    if not v: raise HTTPException(status_code=404, detail="Not found")
    for k, val in data.model_dump().items(): setattr(v, k, val)
    db.commit(); db.refresh(v)
    return v

@router.delete("/{vid}")
def delete_venue(vid: int, db: Session = Depends(get_db)):
    v = db.query(Venue).filter(Venue.id == vid).first()
    if not v: raise HTTPException(status_code=404, detail="Not found")
    db.delete(v); db.commit()
    return {"ok": True}
