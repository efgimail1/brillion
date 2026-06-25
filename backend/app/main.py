from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    banks,
    accounts,
    categories,
    projects,
    transactions,
    summary,import_statement
)



app = FastAPI(
    title="Dompet API",
    description="Personal Finance Tracker",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(banks.router, prefix="/api/banks", tags=["Banks"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(
    transactions.router, prefix="/api/transactions", tags=["Transactions"]
)
app.include_router(summary.router, prefix="/api/summary", tags=["Summary"])
app.include_router(import_statement.router, prefix="/api/import", tags=["Import"])


@app.get("/")
def root():
    resp = {
        "message": "Dompet API is running",
        "docs": "/docs",
    }
    return resp

# End of file