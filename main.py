from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from routers import reservations
from routers import venues, clients

app = FastAPI(title="YY 예약 관리")
init_db()
app.include_router(reservations.router)
app.include_router(venues.router)
app.include_router(clients.router)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return FileResponse("templates/index.html")
