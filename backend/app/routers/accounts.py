from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter()

@router.get("/", response_model=list[AccountResponse])
def get_accounts(bank_id: UUID | None = None, db: Session = Depends(get_db)):
    query = db.query(Account).filter(Account.is_active)
    if bank_id:
        query = query.filter(Account.bank_id == bank_id)
    return query.all()

@router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: UUID, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Rekening tidak ditemukan")
    return acc

@router.post("/", response_model=AccountResponse, status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    acc = Account(**payload.model_dump())
    acc.balance = payload.initial_balance
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc

@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(account_id: UUID, payload: AccountUpdate, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Rekening tidak ditemukan")
    for key, val in payload.model_dump(exclude_none=True).items():
        setattr(acc, key, val)
    db.commit()
    db.refresh(acc)
    return acc