from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class BankBase(BaseModel):
    name: str
    code: str
    color: str = "#534AB7"
    icon: str | None = None

class BankCreate(BankBase):
    pass

class BankUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None
    is_active: bool | None = None

class BankResponse(BankBase):
    id: UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}