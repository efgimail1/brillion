import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.database import Base

class Bank(Base):
    __tablename__ = "banks"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(String(100), nullable=False)        # "BCA", "Blu", "Jago"
    code          = Column(String(20), unique=True, nullable=False)  # "BCA", "BLU", "JAGO"
    color         = Column(String(7), default="#534AB7")       # hex warna untuk UI
    icon          = Column(String(50), nullable=True)          # nama icon
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    accounts      = relationship("Account", back_populates="bank")