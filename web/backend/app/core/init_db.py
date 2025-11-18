from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.core.security import get_password_hash
from app.config import settings


def init_default_admin():
    """Создает администратора по умолчанию, если таблица users пуста"""
    db: Session = SessionLocal()
    try:
        user_repo = UserRepository()
        
        # Проверяем, есть ли хотя бы один пользователь
        admin = user_repo.get_by_username(db, settings.DEFAULT_ADMIN_USERNAME)
        
        if admin:
            # Админ уже существует
            return
        
        # Проверяем, есть ли вообще пользователи в БД
        user_count = db.query(User).count()
        
        if user_count == 0:
            # Создаем админа по умолчанию
            admin_user = User(
                username=settings.DEFAULT_ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                role=UserRole.ADMIN
            )
            db.add(admin_user)
            db.commit()
            print(f"✅ Default admin user created: {settings.DEFAULT_ADMIN_USERNAME}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating default admin: {e}")
    finally:
        db.close()

