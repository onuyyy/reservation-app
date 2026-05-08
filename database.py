from sqlalchemy import create_engine, Column, Integer, String, Date, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import os

DB_PATH = os.environ.get("DB_PATH", "./yy.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

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
    calendar_event_id = Column(Integer, ForeignKey("calendar_events.id"), nullable=True, index=True)

class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    id = Column(Integer, primary_key=True, index=True)
    event_date = Column(Date, nullable=False, index=True)
    venue = Column(String(100))
    client = Column(String(100))
    headcount = Column(Integer, default=0)
    note = Column(Text)
    is_confirmed = Column(Boolean, default=False)
    phone = Column(String(30))
    manager = Column(String(30))
    meal = Column(String(50))
    vehicle = Column(String(50))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    ensure_columns()

def ensure_columns():
    if not DATABASE_URL.startswith("sqlite:///"):
        return
    with engine.begin() as conn:
        rows = conn.exec_driver_sql("PRAGMA table_info(calendar_events)").fetchall()
        existing = {row[1] for row in rows}
        if "manager" not in existing:
            conn.exec_driver_sql("ALTER TABLE calendar_events ADD COLUMN manager VARCHAR(30)")

        rows = conn.exec_driver_sql("PRAGMA table_info(reservations)").fetchall()
        existing = {row[1] for row in rows}
        if "calendar_event_id" not in existing:
            conn.exec_driver_sql("ALTER TABLE reservations ADD COLUMN calendar_event_id INTEGER")
            conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_reservations_calendar_event_id ON reservations(calendar_event_id)")
