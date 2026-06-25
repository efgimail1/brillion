import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(String(150), nullable=False)    # "Website PT Maju Jaya"
    code         = Column(String(30), unique=True, nullable=False)  # "PRJ-2025-001"
    color        = Column(String(7), default="#EF9F27")
    status       = Column(String(20), default="active")   # "active", "completed", "on_hold"
    budget       = Column(Numeric(18, 2), nullable=True)  # budget project kalau ada
    start_date   = Column(Date, nullable=True)
    end_date     = Column(Date, nullable=True)
    description  = Column(String(500), nullable=True)
    created_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    transactions = relationship("Transaction", back_populates="project")