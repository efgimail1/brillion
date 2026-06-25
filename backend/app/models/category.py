import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.database import Base

class Category(Base):
    __tablename__ = "categories"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String(100), nullable=False)
    type       = Column(String(10),  nullable=False)   # "income" / "expense"
    fund_type  = Column(String(30),  nullable=True)    # "pribadi", "project", "tpp", dll — null = semua dana
    icon       = Column(String(50),  nullable=True)
    color      = Column(String(7),   default="#888780")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    transactions = relationship("Transaction", back_populates="category")