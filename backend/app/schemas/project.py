from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal

class ProjectBase(BaseModel):
    name: str
    code: str
    color: str = "#EF9F27"
    status: str = "active"
    budget: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    budget: Decimal | None = None
    end_date: date | None = None
    description: str | None = None

class ProjectResponse(ProjectBase):
    id: UUID
    created_at: datetime
    model_config = {"from_attributes": True}