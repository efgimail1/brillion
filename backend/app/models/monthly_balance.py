import uuid
from sqlalchemy import Column, Integer, DateTime, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.database import Base

class MonthlyBalance(Base):
    __tablename__ = "monthly_balances"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id      = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    month           = Column(Integer, nullable=False)   # 1-12
    year            = Column(Integer, nullable=False)
    opening_balance = Column(Numeric(18, 2), default=0) # saldo awal bulan
    closing_balance = Column(Numeric(18, 2), default=0) # saldo akhir bulan
    total_income    = Column(Numeric(18, 2), default=0)
    total_expense   = Column(Numeric(18, 2), default=0)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # satu rekening hanya boleh punya satu record per bulan per tahun
    __table_args__ = (
        UniqueConstraint("account_id", "month", "year", name="uq_account_month_year"),
    )

    account = relationship("Account", back_populates="monthly_balances")