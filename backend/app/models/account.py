import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_id           = Column(UUID(as_uuid=True), ForeignKey("banks.id"), nullable=False)
    name              = Column(String(100), nullable=False)    # "Tabungan Utama", "Kantong Makan", dll
    account_type      = Column(String(20), nullable=False)     # "checking", "pocket", "deposit"
    balance           = Column(Numeric(18, 2), default=0)      # saldo saat ini
    initial_balance   = Column(Numeric(18, 2), default=0)      # saldo awal saat dibuat
    is_pocket         = Column(Boolean, default=False)         # kantong Blu/Jago
    is_deposit        = Column(Boolean, default=False)         # deposito
    parent_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    bank              = relationship("Bank", back_populates="accounts")
    parent            = relationship("Account", remote_side="Account.id", backref="pockets")
    transactions      = relationship("Transaction", back_populates="account")
    monthly_balances  = relationship("MonthlyBalance", back_populates="account")