from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, async_session
from app.services.seed import seed_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[STARTUP] Initialisation de la base de données...")
    await init_db()
    async with async_session() as db:
        await seed_admin(db)
    print("[STARTUP] Application prête")
    yield
    # Shutdown
    print("[SHUTDOWN] Arrêt de l'application")


app = FastAPI(
    title="Solidata ERP",
    description="API de gestion Solidarité Textiles",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montage des routers
from app.routers import auth, admin, collect, equipe, mobile, pesee, materiel, reporting, planification, qrcode_router, users, legacy

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(collect.router)
app.include_router(equipe.router)
app.include_router(mobile.router)
app.include_router(pesee.router)
app.include_router(materiel.router)
app.include_router(reporting.router)
app.include_router(planification.router)
app.include_router(qrcode_router.router)
app.include_router(users.router)
app.include_router(legacy.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "app": "Solidata ERP"}
