from pydantic import BaseModel
from uuid import UUID

class CategoryBase(BaseModel):
    name:      str
    type:      str
    fund_type: str | None = None   # ← tambah
    icon:      str | None = None
    color:     str = "#888780"

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: UUID
    model_config = {"from_attributes": True}