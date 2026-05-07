from pydantic import BaseModel
from datetime import date
from typing import Optional

class ReservationCreate(BaseModel):
    event_date: date
    group_name: str
    event_name: Optional[str] = ""
    vendor: Optional[str] = ""
    sale_price: Optional[float] = 0
    dc_sale_price: Optional[float] = 0
    headcount: Optional[int] = 0
    dc_amount: Optional[float] = 0
    deposit: Optional[float] = 0
    actual_sale: Optional[float] = 0
    phone: Optional[str] = ""
    bank: Optional[str] = ""
    account_number: Optional[str] = ""
    account_holder: Optional[str] = ""
    manager: Optional[str] = ""
    memo: Optional[str] = ""
    venue_id: Optional[int] = None
    client_id: Optional[int] = None

class ReservationUpdate(ReservationCreate):
    pass

class ReservationOut(ReservationCreate):
    id: int
    class Config:
        from_attributes = True
