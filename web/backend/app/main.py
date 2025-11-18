from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import health, auth, users, categories, books, book_assignments, chunks, recordings
from app.config import settings
from app.core.init_db import init_default_admin

app = FastAPI(
    title="TTS Data Collection API",
    version="1.0.0",
)


@app.on_event("startup")
async def startup_event():
    """Инициализация при старте приложения"""
    init_default_admin()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(books.router, prefix="/api/v1/books", tags=["books"])
app.include_router(book_assignments.router, prefix="/api/v1/assignments", tags=["assignments"])
app.include_router(chunks.router, prefix="/api/v1/chunks", tags=["chunks"])
app.include_router(recordings.router, prefix="/api/v1/recordings", tags=["recordings"])

