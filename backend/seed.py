from app.database import SessionLocal
from app.models.bank import Bank
from app.models.category import Category

NEW_CATEGORIES = [
    # Pribadi - income
    {"name": "Gaji",               "type": "income",  "color": "#3B6D11"},
    {"name": "Bonus",              "type": "income",  "color": "#3B6D11"},
    # Project - income
    {"name": "DP Project",         "type": "income",  "color": "#854F0B"},
    {"name": "Pelunasan Project",  "type": "income",  "color": "#854F0B"},
    {"name": "Uang Muka",          "type": "income",  "color": "#854F0B"},
    # TPP - income
    {"name": "Pendapatan TPP",     "type": "income",  "color": "#0F6E56"},
    {"name": "Penjualan",          "type": "income",  "color": "#0F6E56"},
    # Professional Fee - income
    {"name": "Fee Arsitek",        "type": "income",  "color": "#534AB7"},
    {"name": "Fee Konsultan",      "type": "income",  "color": "#534AB7"},
    {"name": "Profit Kontraktor",  "type": "income",  "color": "#534AB7"},
    # Expense - Pribadi
    {"name": "Makan & Minum",      "type": "expense", "color": "#D85A30"},
    {"name": "Transport",          "type": "expense", "color": "#185FA5"},
    {"name": "Belanja",            "type": "expense", "color": "#D4537E"},
    {"name": "Tagihan",            "type": "expense", "color": "#A32D2D"},
    {"name": "Hiburan",            "type": "expense", "color": "#854F0B"},
    {"name": "Kesehatan",          "type": "expense", "color": "#1D9E75"},
    # Expense - Project & TPP
    {"name": "Biaya Operasional",  "type": "expense", "color": "#534AB7"},
    {"name": "Beli Material",      "type": "expense", "color": "#534AB7"},
    {"name": "Bayar Subkon",       "type": "expense", "color": "#534AB7"},
    {"name": "Inventori",          "type": "expense", "color": "#0F6E56"},
    # Investasi
    {"name": "Deposito",           "type": "expense", "color": "#1D9E75"},
    {"name": "Tabungan",           "type": "expense", "color": "#1D9E75"},
]

NEW_BANKS = [
    {"name": "BCA",     "code": "BCA",     "color": "#005BAC"},
    {"name": "Blu BCA", "code": "BLU",     "color": "#0099FF"},
    {"name": "Jago",    "code": "JAGO",    "color": "#FF6B35"},
    {"name": "SeaBank", "code": "SEABANK", "color": "#FF4B4B"},
    {"name": "Permata", "code": "PERMATA", "color": "#7B2D8B"},
    {"name": "TMRW",    "code": "TMRW",    "color": "#FF0033"},
]

def seed():
    db = SessionLocal()

    # --- Banks: tambah kalau belum ada berdasarkan code ---
    existing_codes = {b.code for b in db.query(Bank.code).all()}
    added_banks = 0
    for b in NEW_BANKS:
        if b["code"] not in existing_codes:
            db.add(Bank(**b))
            added_banks += 1

    # --- Categories: tambah kalau belum ada berdasarkan name + type ---
    existing_cats = {
        (c.name, c.type)
        for c in db.query(Category.name, Category.type).all()
    }
    added_cats = 0
    for c in NEW_CATEGORIES:
        if (c["name"], c["type"]) not in existing_cats:
            db.add(Category(**c))
            added_cats += 1

    db.commit()
    db.close()

    print(f"Banks ditambahkan  : {added_banks}")
    print(f"Kategori ditambahkan: {added_cats}")
    if added_banks == 0 and added_cats == 0:
        print("Semua data sudah up to date, tidak ada yang ditambahkan.")
    else:
        print("Seed selesai!")

if __name__ == "__main__":
    seed()