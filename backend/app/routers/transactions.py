from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
 
from uuid import UUID
from datetime import date
from app.database import get_db
from app.models.transaction import Transaction
from app.models.account import Account
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter()

@router.get("/", response_model=list[TransactionResponse])
def get_transactions(
    account_id:   UUID | None = None,
    project_id:   UUID | None = None,
    fund_type:    str  | None = None,
    type:         str  | None = None,
    date_from:    date | None = None,
    date_to:      date | None = None,
    limit:        int         = Query(50, le=200),
    offset:       int         = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if project_id:
        query = query.filter(Transaction.project_id == project_id)
    if fund_type:
        query = query.filter(Transaction.fund_type == fund_type)
    if type:
        query = query.filter(Transaction.type == type)
    if date_from:
        query = query.filter(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(Transaction.transaction_date <= date_to)
    return query.order_by(Transaction.transaction_date.desc()).offset(offset).limit(limit).all()

@router.post("/", response_model=TransactionResponse, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == payload.account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Rekening tidak ditemukan")

    if payload.type == "income":
        acc.balance += payload.amount
    elif payload.type == "expense":
        acc.balance -= payload.amount
    elif payload.type == "transfer":
        if not payload.to_account_id:
            raise HTTPException(
                status_code=400,
                detail="Rekening tujuan transfer diperlukan"
            )
        if payload.to_account_id == payload.account_id:
            raise HTTPException(
                status_code=400,
                detail="Rekening tujuan transfer tidak boleh sama dengan rekening asal"
            )

        # kurangi saldo rekening asal
        acc.balance -= payload.amount
        # tambah saldo rekening tujuan
        acc_to = db.query(Account).filter(
            Account.id == payload.to_account_id
        ).first()
        if not acc_to:
            raise HTTPException(status_code=404, detail="Rekening tujuan tidak ditemukan")
        acc_to.balance += payload.amount

    tx = Transaction(**payload.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

@router.patch("/{tx_id}", response_model=TransactionResponse)
def update_transaction(tx_id: UUID, payload: TransactionUpdate, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

    acc = db.query(Account).filter(Account.id == tx.account_id).first()

    # rollback saldo lama
    if tx.type == "income":
        acc.balance -= tx.amount
    elif tx.type == "expense":
        acc.balance += tx.amount
    elif tx.type == "transfer":
        acc.balance += tx.amount
        if tx.to_account_id:
            acc_to = db.query(Account).filter(Account.id == tx.to_account_id).first()
            if acc_to:
                acc_to.balance -= tx.amount

    # apply perubahan
    for key, val in payload.model_dump(exclude_none=True).items():
        setattr(tx, key, val)

    if tx.type == "transfer":
        if not tx.to_account_id:
            raise HTTPException(
                status_code=400,
                detail="Rekening tujuan transfer diperlukan"
            )
        if tx.to_account_id == tx.account_id:
            raise HTTPException(
                status_code=400,
                detail="Rekening tujuan transfer tidak boleh sama dengan rekening asal"
            )

    if tx.type != "transfer":
        tx.to_account_id = None

    # apply saldo baru
    if tx.type == "income":
        acc.balance += tx.amount
    elif tx.type == "expense":
        acc.balance -= tx.amount
    elif tx.type == "transfer":
        acc.balance -= tx.amount
        acc_to = db.query(Account).filter(Account.id == tx.to_account_id).first()
        if not acc_to:
            raise HTTPException(status_code=404, detail="Rekening tujuan tidak ditemukan")
        acc_to.balance += tx.amount

    db.commit()
    db.refresh(tx)
    return tx

@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: UUID, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

    acc = db.query(Account).filter(Account.id == tx.account_id).first()
    if acc:
        if tx.type == "income":
            acc.balance -= tx.amount
        elif tx.type == "expense":
            acc.balance += tx.amount
        elif tx.type == "transfer":
            # kembalikan saldo rekening asal
            acc.balance += tx.amount
            # kurangi saldo rekening tujuan
            if tx.to_account_id:
                acc_to = db.query(Account).filter(
                    Account.id == tx.to_account_id
                ).first()
                if acc_to:
                    acc_to.balance -= tx.amount

    db.delete(tx)
    db.commit()