from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models.bank import Bank
from app.schemas.bank import BankCreate, BankUpdate, BankResponse

router = APIRouter()

@router.get("/", response_model=list[BankResponse])
def get_banks(db: Session = Depends(get_db)):
    return db.query(Bank).filter(Bank.is_active).all()

@router.get("/{bank_id}", response_model=BankResponse)
def get_bank(bank_id: UUID, db: Session = Depends(get_db)):
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank tidak ditemukan")
    return bank

@router.post("/", response_model=BankResponse, status_code=201)
def create_bank(payload: BankCreate, db: Session = Depends(get_db)):
    existing = db.query(Bank).filter(Bank.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Kode bank sudah ada")
    bank = Bank(**payload.model_dump())
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank

@router.patch("/{bank_id}", response_model=BankResponse)
def update_bank(bank_id: UUID, payload: BankUpdate, db: Session = Depends(get_db)):
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank tidak ditemukan")
    for key, val in payload.model_dump(exclude_none=True).items():
        setattr(bank, key, val)
    db.commit()
    db.refresh(bank)
    return bank