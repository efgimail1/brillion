from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from datetime import date
from app.database import get_db
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.bank import Bank
from app.models.project import Project

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(
    month: int = Query(default=date.today().month),
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
):
    date_from = date(year, month, 1)
    # akhir bulan
    if month == 12:
        date_to = date(year + 1, 1, 1)
    else:
        date_to = date(year, month + 1, 1)

    # total income & expense bulan ini
    totals = (
        db.query(
            func.sum(Transaction.amount)
            .filter(Transaction.type == "income")
            .label("total_income"),
            func.sum(Transaction.amount)
            .filter(Transaction.type == "expense")
            .label("total_expense"),
        )
        .filter(
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date < date_to,
        )
        .first()
    )

    # total saldo semua rekening
    total_balance = (
        db.query(func.sum(Account.balance)).filter(Account.is_active).scalar() or 0
    )

    # summary per bank
    bank_summary = (
        db.query(
            Bank.name,
            Bank.color,
            func.sum(Account.balance).label("total_balance"),
            func.sum(Transaction.amount)
            .filter(Transaction.type == "income")
            .label("income"),
            func.sum(Transaction.amount)
            .filter(Transaction.type == "expense")
            .label("expense"),
        )
        .join(Account, Account.bank_id == Bank.id)
        .outerjoin(
            Transaction,
            and_(
                Transaction.account_id == Account.id,
                Transaction.transaction_date >= date_from,
                Transaction.transaction_date < date_to,
            ),
        )
        .filter(Account.is_active)
        .group_by(Bank.id, Bank.name, Bank.color)
        .all()
    )

    # summary per fund_type bulan ini
    fund_summary = (
        db.query(
            Transaction.fund_type,
            func.sum(Transaction.amount)
            .filter(Transaction.type == "income")
            .label("income"),
            func.sum(Transaction.amount)
            .filter(Transaction.type == "expense")
            .label("expense"),
        )
        .filter(
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date < date_to,
        )
        .group_by(Transaction.fund_type)
        .all()
    )

    return {
        "month": month,
        "year": year,
        "total_balance": float(total_balance),
        "total_income": float(totals.total_income or 0),
        "total_expense": float(totals.total_expense or 0),
        "bank_summary": [
            {
                "name": b.name,
                "color": b.color,
                "balance": float(b.total_balance or 0),
                "income": float(b.income or 0),
                "expense": float(b.expense or 0),
            }
            for b in bank_summary
        ],
        "fund_summary": [
            {
                "fund_type": f.fund_type,
                "income": float(f.income or 0),
                "expense": float(f.expense or 0),
            }
            for f in fund_summary
        ],
    }


@router.get("/by-project")
def get_summary_by_project(db: Session = Depends(get_db)):
    result = (
        db.query(
            Project.name,
            Project.code,
            Project.color,
            Project.status,
            func.sum(Transaction.amount)
            .filter(Transaction.type == "income")
            .label("total_income"),
            func.sum(Transaction.amount)
            .filter(Transaction.type == "expense")
            .label("total_expense"),
        )
        .outerjoin(Transaction, Transaction.project_id == Project.id)
        .group_by(Project.id, Project.name, Project.code, Project.color, Project.status)
        .all()
    )

    return [
        {
            "name": r.name,
            "code": r.code,
            "color": r.color,
            "status": r.status,
            "total_income": float(r.total_income or 0),
            "total_expense": float(r.total_expense or 0),
            "balance": float((r.total_income or 0) - (r.total_expense or 0)),
        }
        for r in result
    ]


@router.get("/monthly-report")
def get_monthly_report(
    month: int = Query(default=date.today().month),
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
):
    date_from = date(year, month, 1)
    if month == 12:
        date_to = date(year + 1, 1, 1)
    else:
        date_to = date(year, month + 1, 1)

    # transaksi bulan ini
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date < date_to,
        )
        .all()
    )

    total_income = sum(float(t.amount) for t in transactions if t.type == "income")
    total_expense = sum(float(t.amount) for t in transactions if t.type == "expense")

    # breakdown per kategori
    from collections import defaultdict

    category_breakdown = defaultdict(
        lambda: {"income": 0.0, "expense": 0.0, "color": "#888780"}
    )

    for t in transactions:
        cat_name = t.category.name if t.category else "Tanpa Kategori"
        cat_color = t.category.color if t.category else "#888780"
        category_breakdown[cat_name]["color"] = cat_color
        if t.type == "income":
            category_breakdown[cat_name]["income"] += float(t.amount)
        elif t.type == "expense":
            category_breakdown[cat_name]["expense"] += float(t.amount)

    # breakdown per fund_type (dana)
    fund_breakdown = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for t in transactions:
        if t.type == "income":
            fund_breakdown[t.fund_type]["income"] += float(t.amount)
        elif t.type == "expense":
            fund_breakdown[t.fund_type]["expense"] += float(t.amount)

    # tren harian (untuk chart)
    daily_breakdown = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for t in transactions:
        day = t.transaction_date.day
        if t.type == "income":
            daily_breakdown[day]["income"] += float(t.amount)
        elif t.type == "expense":
            daily_breakdown[day]["expense"] += float(t.amount)

    # saldo awal & akhir per rekening (snapshot saat ini — pendekatan sederhana)
    accounts = db.query(Account).filter(Account.is_active.is_(True)).all()
    account_balances = []
    for acc in accounts:
        # transaksi rekening ini SEBELUM bulan yang dipilih
        before = (
            db.query(
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == "income", Transaction.amount), else_=0
                        )
                    ),
                    0,
                )
                - func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == "expense", Transaction.amount), else_=0
                        )
                    ),
                    0,
                )
            )
            .filter(
                Transaction.account_id == acc.id,
                Transaction.transaction_date < date_from,
            )
            .scalar()
            or 0
        )

        opening_balance = float(acc.initial_balance) + float(before)

        # transaksi rekening ini SELAMA bulan yang dipilih
        during_income = sum(
            float(t.amount)
            for t in transactions
            if t.account_id == acc.id and t.type == "income"
        )
        during_expense = sum(
            float(t.amount)
            for t in transactions
            if t.account_id == acc.id and t.type == "expense"
        )

        closing_balance = opening_balance + during_income - during_expense

        account_balances.append(
            {
                "id": str(acc.id),
                "name": acc.name,
                "opening_balance": opening_balance,
                "closing_balance": closing_balance,
                "income": during_income,
                "expense": during_expense,
            }
        )

    return {
        "month": month,
        "year": year,
        "total_income": total_income,
        "total_expense": total_expense,
        "net": total_income - total_expense,
        "transaction_count": len(transactions),
        "category_breakdown": [
            {
                "name": k,
                "income": v["income"],
                "expense": v["expense"],
                "color": v["color"],
            }
            for k, v in sorted(
                category_breakdown.items(), key=lambda x: x[1]["expense"], reverse=True
            )
        ],
        "fund_breakdown": [
            {"fund_type": k, "income": v["income"], "expense": v["expense"]}
            for k, v in fund_breakdown.items()
        ],
        "daily_breakdown": [
            {"day": d, "income": v["income"], "expense": v["expense"]}
            for d, v in sorted(daily_breakdown.items())
        ],
        "account_balances": account_balances,
    }
