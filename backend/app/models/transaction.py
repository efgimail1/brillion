import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id       = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    category_id      = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    project_id       = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)  # null = bukan uang project
    to_account_id    = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)

    type             = Column(String(10), nullable=False)   # "income", "expense", "transfer"
    amount           = Column(Numeric(18, 2), nullable=False)
    description      = Column(String(255), nullable=True)   # keterangan singkat
    notes            = Column(Text, nullable=True)          # catatan panjang
    from_to          = Column(String(150), nullable=True)   # dari siapa / ke siapa
    purpose          = Column(String(255), nullable=True)   # untuk keperluan apa
    fund_type        = Column(String(20), default="personal")  # "personal", "project", "jajan"
    transaction_date = Column(Date, nullable=False)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))

    account          = relationship("Account",back_populates="transactions",foreign_keys="[Transaction.account_id]")
    category         = relationship("Category", back_populates="transactions")
    project          = relationship("Project", back_populates="transactions")