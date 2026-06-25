from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class AccountBase(BaseModel):
    bank_id: UUID
    name: str
    account_type: str          # "checking", "pocket", "deposit"
    initial_balance: Decimal = Decimal("0")
    is_pocket: bool = False
    is_deposit: bool = False
    parent_account_id: UUID | None = None

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None

class AccountResponse(AccountBase):
    id: UUID
    balance: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}