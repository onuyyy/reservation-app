from sqlalchemy import create_engine, Column, Integer, String, Date, Float, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DB_PATH = os.environ.get("DB_PATH", "./yy.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Venue(Base):
    __tablename__ = "venues"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    memo = Column(Text)

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    type = Column(String(50))
    phone = Column(String(30))
    bank = Column(String(20))
    account_number = Column(String(50))
    account_holder = Column(String(30))
    manager = Column(String(30))
    memo = Column(Text)

class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(Integer, primary_key=True, index=True)
    event_date = Column(Date, nullable=False)
    group_name = Column(String(100), nullable=False)
    event_name = Column(String(100))
    vendor = Column(String(50))
    sale_price = Column(Float, default=0)
    dc_sale_price = Column(Float, default=0)
    headcount = Column(Integer, default=0)
    dc_amount = Column(Float, default=0)
    deposit = Column(Float, default=0)
    actual_sale = Column(Float, default=0)
    phone = Column(String(30))
    bank = Column(String(20))
    account_number = Column(String(50))
    account_holder = Column(String(30))
    manager = Column(String(30))
    memo = Column(Text)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
