from fastapi import APIRouter, Depends    # ← hapus Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse

router = APIRouter()

@router.get("/", response_model=list[CategoryResponse])
def get_categories(
    type:      str | None = None,
    fund_type: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Category)
    if type:
        query = query.filter(Category.type == type)
    if fund_type:
        query = query.filter(
            or_(Category.fund_type == fund_type, Category.fund_type.is_(None))  # ← is_(None)
        )
    return query.order_by(Category.fund_type, Category.name).all()

@router.post("/", response_model=CategoryResponse, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    cat = Category(**payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat