from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import Optional
from datetime import date
from pydantic import BaseModel
from database import get_db, CalendarEvent

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

class CalendarEventCreate(BaseModel):
    event_date: date
    venue: Optional[str] = ""
    client: Optional[str] = ""
    headcount: Optional[int] = 0
    note: Optional[str] = ""
    is_confirmed: Optional[bool] = False
    phone: Optional[str] = ""
    manager: Optional[str] = ""
    meal: Optional[str] = ""
    vehicle: Optional[str] = ""

class CalendarEventOut(CalendarEventCreate):
    id: int
    class Config:
        from_attributes = True

@router.get("/")
def get_events(year: int, month: int, db: Session = Depends(get_db)):
    return db.query(CalendarEvent).filter(
        extract("year", CalendarEvent.event_date) == year,
        extract("month", CalendarEvent.event_date) == month
    ).order_by(CalendarEvent.event_date.asc()).all()

@router.post("/", response_model=CalendarEventOut)
def create_event(data: CalendarEventCreate, db: Session = Depends(get_db)):
    ev = CalendarEvent(**data.model_dump())
    db.add(ev); db.commit(); db.refresh(ev)
    return ev

@router.put("/{id}", response_model=CalendarEventOut)
def update_event(id: int, data: CalendarEventCreate, db: Session = Depends(get_db)):
    ev = db.query(CalendarEvent).filter(CalendarEvent.id == id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.model_dump().items():
        setattr(ev, k, v)
    db.commit(); db.refresh(ev)
    return ev

@router.delete("/{id}")
def delete_event(id: int, db: Session = Depends(get_db)):
    ev = db.query(CalendarEvent).filter(CalendarEvent.id == id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(ev); db.commit()
    return {"ok": True}

@router.get("/confirmed")
def get_confirmed(date: str, db: Session = Depends(get_db)):
    return db.query(CalendarEvent).filter(
        CalendarEvent.event_date == date,
        CalendarEvent.is_confirmed == True
    ).order_by(CalendarEvent.id.asc()).all()

@router.get("/venues")
def get_venues(db: Session = Depends(get_db)):
    rows = db.query(CalendarEvent.venue).distinct().all()
    return [r.venue for r in rows if r.venue]
