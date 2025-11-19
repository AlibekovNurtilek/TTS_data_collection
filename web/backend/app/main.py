from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import (
    health, auth, users, categories, books, book_assignments, chunks, recordings, speakers, assignments_common
)
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

# Admin routes
app.include_router(users.router, prefix="/api/v1/admin/users", tags=["admin-users"])
app.include_router(categories.router, prefix="/api/v1/admin/categories", tags=["admin-categories"])
app.include_router(books.router, prefix="/api/v1/admin/books", tags=["admin-books"])
app.include_router(book_assignments.router, prefix="/api/v1/admin/assignments", tags=["admin-assignments"])
app.include_router(chunks.router, prefix="/api/v1/admin/chunks", tags=["admin-chunks"])

# Speaker routes
app.include_router(speakers.router, prefix="/api/v1/speakers", tags=["speakers"])
app.include_router(recordings.router, prefix="/api/v1/recordings", tags=["recordings"])

# Common routes (accessible by both admin and speakers)
# Get my assigned books - доступно для всех авторизованных
app.include_router(assignments_common.router, prefix="/api/v1/assignments", tags=["assignments"])

