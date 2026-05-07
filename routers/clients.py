from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db, Client

router = APIRouter(prefix="/api/clients", tags=["clients"])

class ClientIn(BaseModel):
    name: str
    type: Optional[str] = ""
    phone: Optional[str] = ""
    bank: Optional[str] = ""
    account_number: Optional[str] = ""
    account_holder: Optional[str] = ""
    manager: Optional[str] = ""
    memo: Optional[str] = ""

class ClientOut(ClientIn):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=list[ClientOut])
def get_clients(type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Client)
    if type: q = q.filter(Client.type == type)
    return q.order_by(Client.name).all()

def find_duplicate_client(db: Session, name: str, exclude_id: Optional[int] = None):
    q = db.query(Client).filter(func.lower(Client.name) == name.strip().lower())
    if exclude_id:
        q = q.filter(Client.id != exclude_id)
    return q.first()

@router.post("/", response_model=ClientOut)
def create_client(data: ClientIn, db: Session = Depends(get_db)):
    payload = data.model_dump()
    payload["name"] = payload["name"].strip()
    if find_duplicate_client(db, payload["name"]):
        raise HTTPException(status_code=409, detail=f"이미 등록된 고객입니다: {payload['name']}")
    c = Client(**payload)
    db.add(c); db.commit(); db.refresh(c)
    return c

@router.put("/{cid}", response_model=ClientOut)
def update_client(cid: int, data: ClientIn, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == cid).first()
    if not c: raise HTTPException(status_code=404, detail="Not found")
    payload = data.model_dump()
    payload["name"] = payload["name"].strip()
    if find_duplicate_client(db, payload["name"], exclude_id=cid):
        raise HTTPException(status_code=409, detail=f"이미 등록된 고객입니다: {payload['name']}")
    for k, val in payload.items(): setattr(c, k, val)
    db.commit(); db.refresh(c)
    return c

@router.delete("/{cid}")
def delete_client(cid: int, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == cid).first()
    if not c: raise HTTPException(status_code=404, detail="Not found")
    db.delete(c); db.commit()
    return {"ok": True}
