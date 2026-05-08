from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from routers import reservations, venues, clients, calendar_events, event_sheet

app = FastAPI(title="예약 관리")
init_db()
app.include_router(reservations.router)
app.include_router(venues.router)
app.include_router(clients.router)
app.include_router(calendar_events.router)
app.include_router(event_sheet.router)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return FileResponse("templates/index.html")
