from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal

class TransactionBase(BaseModel):
    account_id: UUID
    category_id: UUID | None = None
    project_id: UUID | None = None
    to_account_id: UUID | None = None
    type: str                       # "income", "expense", "transfer"
    amount: Decimal
    description: str | None = None
    notes: str | None = None
    from_to: str | None = None      # dari siapa / ke siapa
    purpose: str | None = None      # untuk apa
    fund_type: str = "personal"     # "personal", "project", "jajan"
    transaction_date: date

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    category_id: UUID | None = None
    project_id: UUID | None = None
    to_account_id: UUID | None = None
    description: str | None = None
    notes: str | None = None
    from_to: str | None = None
    purpose: str | None = None
    fund_type: str | None = None
    amount: Decimal | None = None
    transaction_date: date | None = None

class TransactionResponse(TransactionBase):
    id: UUID
    created_at: datetime
    model_config = {"from_attributes": True}