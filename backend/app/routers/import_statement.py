import re
import io
from datetime import date
from fastapi import APIRouter, UploadFile, File, HTTPException
import pdfplumber

router = APIRouter()

#------------------------------------ BCA ----------------------------------------------

DATE_PATTERN = re.compile(r"^(\d{2})/(\d{2})\s+(.*)$")
AMOUNT_PATTERN = re.compile(r"([\d,]+\.\d{2})\s*(DB|CR)?")
SALDO_AWAL_PATTERN = re.compile(r"SALDO AWAL")
SUMMARY_PATTERN = re.compile(r"^(SALDO AWAL|MUTASI CR|MUTASI DB|SALDO AKHIR)\s*:")

KEYWORD_RULES = [
    # (regex pattern di description, category_name, fund_type)
    (r"upah pekerja|upah tukang", "Bayar Subkon", "project"),
    (r"^BUNGA$|^BUNGA\b", "Bunga Bank", "investasi"),
    (r"PAJAK BUNGA", "Pajak Bunga Bank", "investasi"),
    (r"BIAYA ADM", "Biaya Operasional", "pribadi"),
    (r"Shopee|SUPERINDO|Alfamart|Indoma", "Belanja", "pribadi"),
    (r"KFC|REST AREA|PANGGANG", "Makan & Minum", "pribadi"),
    (r"SPBU|\btol\b", "Transport", "pribadi"),
    (r"netflix", "Hiburan", "pribadi"),
    (r"KR OTOMATIS", "Pendapatan TPP", "tpp"),
]

# pola baris yang harus DIBUANG dari memo (kode bank, bukan informasi berguna)
NOISE_PATTERNS = [
    r"^\d{4}/[A-Z]+/[A-Z0-9]+$",      # kode transfer: 0505/FTSCY/WS95271
    r"^[\d,]+\.\d{2}$",                # nominal mentah: 160000.00
    r"^TGL\s*:",                       # TGL: 02/05
    r"^QR[C\s]*\d+",                   # QR 014 / QRC014
    r"^MID\s*:",                       # MID : 885002558338
    r"^QR\s*:",                        # QR : 10000000.00
    r"^DDR\s*:",                       # DDR: 30000.00
    r"^TANGGAL\s*:",                   # TANGGAL :08/05
    r"^\d{2}\s+\w{3}\s+\d{4}$",        # tanggal: 30 Apr 2026
    r"^-+$",                            # baris hanya "-"
    r"^\d{15,}$",                       # nomor referensi panjang
]


def is_noise_line(line: str) -> bool:
    for pattern in NOISE_PATTERNS:
        if re.match(pattern, line.strip(), re.IGNORECASE):
            return True
    return False


def parse_amount(s: str) -> float:
    return float(s.replace(",", ""))


def suggest_category(description: str):
    desc_upper = description.upper()
    for pattern, cat_name, fund_type in KEYWORD_RULES:
        if re.search(pattern, desc_upper, re.IGNORECASE):
            return cat_name, fund_type
    return None, "pribadi"


@router.post("/preview")
async def preview_statement(
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File harus PDF")

    content = await file.read()
    all_lines: list[str] = []
    period_month = None
    period_year = None

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.split("\n"):
                stripped = line.strip()
                if not stripped:
                    continue
                # tangkap periode, contoh: "PERIODE : MEI 2026"
                period_match = re.search(
                    r"PERIODE\s*:\s*(\w+)\s+(\d{4})", stripped, re.IGNORECASE
                )
                if period_match:
                    month_name = period_match.group(1).upper()
                    period_year = int(period_match.group(2))
                    month_map = {
                        "JANUARI": 1,
                        "FEBRUARI": 2,
                        "MARET": 3,
                        "APRIL": 4,
                        "MEI": 5,
                        "JUNI": 6,
                        "JULI": 7,
                        "AGUSTUS": 8,
                        "SEPTEMBER": 9,
                        "OKTOBER": 10,
                        "NOVEMBER": 11,
                        "DESEMBER": 12,
                    }
                    period_month = month_map.get(month_name)
                all_lines.append(stripped)

    # cari indeks baris yang dimulai dengan pola TANGGAL (dd/mm)
    # lalu kumpulkan semua baris sampai sebelum tanggal berikutnya = 1 blok transaksi
    blocks: list[list[str]] = []
    current_block: list[str] = []

    for line in all_lines:
        # skip header berulang & catatan
        if re.match(r"^TANGGAL\s+KETERANGAN", line, re.IGNORECASE):
            continue
        if SUMMARY_PATTERN.match(line):
            continue
        if line.startswith("Bersambung") or "CATATAN" in line.upper():
            continue
        if re.match(r"^\d+\s*/\s*\d+$", line):  # nomor halaman "1 /6"
            continue

        date_match = DATE_PATTERN.match(line)
        if date_match:
            if current_block:
                blocks.append(current_block)
            current_block = [line]
        else:
            if current_block:
                current_block.append(line)

    if current_block:
        blocks.append(current_block)

    transactions = []

    for block in blocks:
        first_line = block[0]
        date_match = DATE_PATTERN.match(first_line)
        if not date_match:
            continue

        day, month, rest = date_match.groups()
        full_text = rest + " " + " ".join(block[1:])

        # skip baris SALDO AWAL (bukan transaksi)
        if SALDO_AWAL_PATTERN.search(full_text):
            continue

        # cari nominal + DB/CR — biasanya muncul lebih dari sekali
        # (sekali untuk mutasi, sekali untuk saldo) -> ambil yang PERTAMA punya DB/CR,
        # atau kalau tidak ada DB/CR (income tanpa tag), ambil angka pertama
        amount_matches = list(AMOUNT_PATTERN.finditer(full_text))
        if not amount_matches:
            continue

        amount = None
        tx_type = "income"  # default CR

        for m in amount_matches:
            amt_str, tag = m.groups()
            if tag == "DB":
                amount = parse_amount(amt_str)
                tx_type = "expense"
                break
            elif tag == "CR":
                amount = parse_amount(amt_str)
                tx_type = "income"
                break

        if amount is None:
            # tidak ada DB/CR explicit -> ambil angka pertama, anggap CR (income)
            amount = parse_amount(amount_matches[0].group(1))
            tx_type = "income"

        # description = baris pertama keterangan utama, dibersihkan dari nominal mentah
        main_desc = block[0][5:].strip()  # buang "dd/mm" di depan
        # baris kedua/ketiga biasanya nama orang / catatan
        extra_lines = [
            line_
            for line_ in block[1:]
            if not AMOUNT_PATTERN.fullmatch(line_.replace(",", "").strip())
        ]

        # nama pengirim/penerima -> biasanya baris terakhir yang isinya huruf kapital + spasi (nama orang)
        from_to = ""
        for line_ in reversed(extra_lines):
            if (
                re.match(r"^[A-Z][A-Za-z .]+$", line_)
                and len(line_) > 3
                and "QR" not in line_.upper()
            ):
                from_to = line_.strip()
                break

        # memo = baris-baris yang BUKAN noise (kode bank/referensi) dan BUKAN nama orang (from_to)
        memo_parts = [
            line_
            for line_ in extra_lines
            if line_ != from_to and not is_noise_line(line_)
        ]
        description = " ".join(memo_parts).strip()

        # fallback: kalau memo kosong, pakai jenis transaksi dari main_desc
        # (misal "BIAYA ADM", "BUNGA", "PAJAK BUNGA", "TRANSAKSI DEBIT")
        if not description:
            clean_main = re.sub(r"\b\d{4}/[A-Z]+/[A-Z0-9]+\b", "", main_desc)
            clean_main = re.sub(
                r"TGL\s*:\s*\d{2}/\d{2}", "", clean_main, flags=re.IGNORECASE
            )
            description = clean_main.strip()

        # tahun & bulan dari periode statement
        if period_year and period_month:
            try:
                tx_date = date(period_year, period_month, int(day)).isoformat()
            except ValueError:
                tx_date = None
        else:
            tx_date = None

        category_name, fund_type = suggest_category(description)

        transactions.append(
            {
                "date": tx_date,
                "day": int(day),
                "month": int(month),
                "description": description[:200],
                "from_to": from_to,
                "amount": amount,
                "type": tx_type,
                "suggested_category": category_name,
                "suggested_fund_type": fund_type,
            }
        )

    if not transactions:
        raise HTTPException(
            status_code=422, detail="Tidak ada transaksi terdeteksi dari PDF ini."
        )

    return {
        "period_month": period_month,
        "period_year": period_year,
        "count": len(transactions),
        "transactions": transactions,
    }

# ------------------------------------ Blu ----------------------------------------------

MONTH_MAP_EN = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

# baris pertama blok transaksi: "06 May 2026 Dana Masuk dari bluSpending"
DATE_TITLE_PATTERN = re.compile(r"^(\d{2})\s+(\w+)\s+(\d{4})\s+(.*)$")
# baris jam berdiri sendiri: "08:52"
TIME_ONLY_PATTERN = re.compile(r"^(\d{2}):(\d{2})$")
# baris nominal+saldo: "2.000.000,00 2.016.464,45" atau "- 300.000,00 2.716.464,45"
AMOUNT_BALANCE_PATTERN = re.compile(r"^(-)?\s*([\d.]+,\d{2})\s+([\d.]+,\d{2})$")
# baris nomor referensi panjang (skip dari detail)
REFERENCE_ONLY_PATTERN = re.compile(r"^\d{10,}$")

BLU_KEYWORD_RULES = [
    (r"Pembayaran QRIS",        None,                "pribadi"),
    (r"^Bunga$",                "Bunga Bank",        "investasi"),
    (r"^Pajak Bunga$",          "Pajak Bunga Bank",  "investasi"),
    (r"Pencairan blu",          None,                "investasi"),
    (r"Penempatan blu",         "Deposito",          "investasi"),
    (r"Dana Masuk dari blu",    None,                "pribadi"),
    (r"Transfer ke",            None,                "pribadi"),
]

BLU_SKIP_PATTERNS = [
    r"^Nama\s*/\s*Name", r"^Rekening\s*/\s*Account", r"^Periode\s*/\s*Period",
    r"^Mata Uang", r"^Total Pemasukan", r"^Total Pengeluaran",
    r"^Saldo Awal", r"^Saldo Akhir", r"^Rp$", r"^IDR",
    r"^Frizka Charista$", r"^bluAccount$", r"^Halaman", r"^Page",
    r"^Tanggal\s*&\s*Jam", r"^Date\s*&\s*Time", r"^Keterangan", r"^Detail Transaksi",
    r"^BCA Digital", r"^blubybcadigital", r"Lembaga Penjamin",
    r"^Disclaimer", r"^\d\.\s", r"^This report", r"^\d{4}\s*\d{4}\s*\d{4}\s*\d{4}$",
    r"^bluAccount\s*-\s*\d", r"^haloblu",
]


def parse_indo_amount(s: str) -> float:
    # format Indonesia: 2.000.000,00 -> 2000000.00
    return float(s.replace(".", "").replace(",", "."))


def should_skip_blu(line: str) -> bool:
    return any(re.search(p, line, re.IGNORECASE) for p in BLU_SKIP_PATTERNS)


def suggest_category_blu(title: str, detail: str):
    combined = f"{title} {detail}"
    for pattern, cat_name, fund_type in BLU_KEYWORD_RULES:
        if re.search(pattern, combined, re.IGNORECASE):
            return cat_name, fund_type
    return None, "pribadi"


@router.post("/preview-blu")
async def preview_blu_statement(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File harus PDF")

    content = await file.read()
    all_lines: list[str] = []
    period_month = None
    period_year = None

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.split("\n"):
                stripped = line.strip()
                if stripped:
                    all_lines.append(stripped)

    # tangkap periode dari baris "Frizka Charista May 2026 Rp102.240.385,51 Rp16.464,45"
    for line in all_lines:
        period_match = re.search(
            r"\b(" + "|".join(MONTH_MAP_EN.keys()) + r")\s+(\d{4})\b",
            line,
            re.IGNORECASE,
        )
        if period_match:
            period_month = MONTH_MAP_EN[period_match.group(1).lower()]
            period_year = int(period_match.group(2))
            break
        
    # tangkap nama rekening: baris "Rekening / Account" diikuti baris nama rekening
    detected_account_name = None
    for idx, line in enumerate(all_lines):
        if re.match(r"^Rekening\s*/\s*Account", line, re.IGNORECASE):
            if idx + 1 < len(all_lines):
                candidate = all_lines[idx + 1].strip()
                # skip kalau baris berikutnya ternyata bukan nama rekening (mis. label lain)
                if candidate and not re.match(r"^(Periode|Mata Uang)", candidate, re.IGNORECASE):
                    detected_account_name = candidate
            break

    filtered_lines = [line for line in all_lines if not should_skip_blu(line)]

    transactions = []
    i = 0

    while i < len(filtered_lines):
        line = filtered_lines[i]

        date_title_match = DATE_TITLE_PATTERN.match(line)
        if not date_title_match:
            i += 1
            continue

        day_str, month_name, year_str, title = date_title_match.groups()
        day = int(day_str)
        year_num = int(year_str)
        month_num = MONTH_MAP_EN.get(month_name.lower(), period_month)

        # baris berikutnya HARUS nominal+saldo
        j = i + 1
        amount = None
        tx_type = "income"

        if j < len(filtered_lines):
            amt_match = AMOUNT_BALANCE_PATTERN.match(filtered_lines[j])
            if amt_match:
                sign, amt_str, _balance_str = amt_match.groups()
                amount = parse_indo_amount(amt_str)
                tx_type = "expense" if sign == "-" else "income"
                j += 1

        if amount is None:
            # format tak terduga, skip blok ini
            i += 1
            continue

        # baris berikutnya: jam (opsional)
        if j < len(filtered_lines) and TIME_ONLY_PATTERN.match(filtered_lines[j]):
            j += 1

        # baris-baris berikutnya: detail/sumber, sampai blok baru (date_title) ditemukan
        detail_lines = []
        while j < len(filtered_lines):
            next_line = filtered_lines[j]
            if DATE_TITLE_PATTERN.match(next_line):
                break
            if REFERENCE_ONLY_PATTERN.match(next_line):
                j += 1
                continue
            detail_lines.append(next_line)
            j += 1

        detail = " ".join(detail_lines).strip()

        try:
            tx_date = date(year_num, month_num, day).isoformat() if month_num else None
        except ValueError:
            tx_date = None

        # ekstrak from_to dari title: "Dana Masuk dari X" / "Transfer ke X"
        from_to = ""
        title_match = re.search(r"(?:dari|ke)\s+(.+)$", title, re.IGNORECASE)
        if title_match:
            from_to = title_match.group(1).strip()

        # deteksi pocket internal dari detail, contoh:
        # "bluSaving Dana Darurat - Kado imamat 25th pastur Abi"
        # -> internal_pocket_hint = "Dana Darurat"
        # -> clean_memo = "Kado imamat 25th pastur Abi"
        internal_pocket_hint = None
        clean_memo = detail

        pocket_match = re.match(
            r"^(bluSaving|bluSpending)\s+(.+?)\s*-\s*(.*)$",
            detail,
            re.IGNORECASE,
        )
        if pocket_match:
            internal_pocket_hint = pocket_match.group(2).strip()
            clean_memo = pocket_match.group(3).strip()
        else:
            # kasus tanpa nama pocket eksplisit, contoh "bluSpending - Uang makan Mei 2026"
            simple_match = re.match(
                r"^(bluSaving|bluSpending)\s*-\s*(.*)$",
                detail,
                re.IGNORECASE,
            )
            if simple_match:
                clean_memo = simple_match.group(2).strip()

        is_likely_internal = bool(
            re.search(r"Dana Masuk dari blu|Transfer ke", title, re.IGNORECASE)
        ) and internal_pocket_hint is not None

        category_name, fund_type = suggest_category_blu(title, detail)

        transactions.append({
            "date": tx_date,
            "day": day,
            "month": month_num,
            "title": title.strip(),
            "description": clean_memo[:200] if clean_memo else detail[:200],
            "from_to": from_to,
            "amount": amount,
            "type": tx_type,
            "suggested_category": category_name,
            "suggested_fund_type": fund_type,
            "internal_pocket_hint": internal_pocket_hint,
            "is_likely_internal_transfer": is_likely_internal,
        })

        i = j

    if not transactions:
        raise HTTPException(
            status_code=422,
            detail="Tidak ada transaksi terdeteksi dari PDF Blu ini."
        )

    return {
        "period_month": period_month,
        "period_year": period_year,
        "detected_account_name": detected_account_name,
        "count": len(transactions),
        "transactions": transactions,
    }


@router.post("/debug-raw-text")
async def debug_raw_text(file: UploadFile = File(...)):
    content = await file.read()
    pages_text = []

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            lines = [line.strip() for line in text.split("\n") if line.strip()]
            pages_text.append({
                "page": page_num + 1,
                "lines": lines,
            })

    return {"pages": pages_text}


# ------------------------------------ Jago ----------------------------------------------

MONTH_MAP_EN_JAGO = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

# Baris utama: "28 Dec 2025 Giovanni Chynthia Outgoing Transfer -18.580 13.306.892"
# atau:        "28 Jan 2026 Interest Interest +19.153 18.895.585"
JAGO_MAIN_LINE = re.compile(
    r"^(\d{2})\s+(\w+)\s+(\d{4})\s+"   # tanggal: DD Mon YYYY
    r"(.+?)\s+"                           # source + type + notes (greedy tapi ambil sebelum amount)
    r"([+-][\d.,]+(?:\.\d{3})*(?:,\d{2})?|\+[\d.]+(?:,\d{2})?|-[\d.]+(?:,\d{2})?)\s+"  # amount
    r"([\d.,]+(?:\.\d{3})*(?:,\d{2})?)$"  # balance
)

# Baris sekunder: "20:26 Chandra ID# 2868197938" atau "05:19 MAIN_ACCOUNT ID# 260128-DQZT-BQHHJJ"
JAGO_SECONDARY_LINE = re.compile(r"^(\d{2}):(\d{2})\s+(.*?)(?:\s+ID#\s*\S+)?$")

JAGO_SKIP_JAGO = [
    r"^PT Bank Jago",
    r"^also a member",
    r"^www\.jago\.com",
    r"^Pockets Transactions History",
    r"^FRIZKA CHARISTA$",
    r"^Main Pocket\s",
    r"^Showing IDR",
    r"^Latest Balance",
    r"^Date\s*&\s*Time\s+Source",
    r"^Disclaimer",
    r"^This document",
    r"IDR\s+\d",        # "IDR 8.277.232"
]

JAGO_TRANSACTION_TYPES = [
    "Incoming Transfer", "Outgoing Transfer",
    "Interest", "Tax on Interest",
    "QRIS Payment", "Cashback", "Referral Bonus",
    "Principal Placement",
    "Mature Term Deposit Principal", "Mature Term Deposit Interest",
    "Pocket Money In", "Pocket Money Out",
    "Top Up Wallet",
]

JAGO_KEYWORD_RULES_V2 = [
    (r"^Interest$",                   "Bunga Bank",        "investasi"),
    (r"^Tax on Interest$",            "Pajak Bunga Bank",  "investasi"),
    (r"Mature Term Deposit Interest", "Bunga Bank",        "investasi"),
    (r"Principal Placement",          "Deposito",          "investasi"),
    (r"Mature Term Deposit Principal","Deposito",          "investasi"),
    (r"QRIS Payment",                 None,                "pribadi"),
    (r"Cashback|Referral Bonus",      None,                "pribadi"),
    (r"Pocket Money",                 None,                "pribadi"),
    (r"rompi\d+|kka tng",             "Bayar Subkon",      "project"),
    (r"Tokopedia",                    "Bayar Subkon",      "project"),
]


def parse_jago_num(s: str) -> float:
    """Konversi format Jago: '18.580' -> 18580, '630.000' -> 630000, '19.153' -> 19153"""
    # Hapus tanda + / -
    s = s.lstrip("+-").strip()
    # Format Jago: titik sebagai pemisah ribuan, koma sebagai desimal
    # Contoh: "510.000,00" -> 510000.00 ; "18.580" -> 18580 ; "1.205" -> 1205
    if "," in s:
        # ada koma desimal
        return float(s.replace(".", "").replace(",", "."))
    else:
        # tidak ada koma — titik adalah pemisah ribuan
        return float(s.replace(".", ""))


def should_skip_jago_v2(line: str) -> bool:
    return any(re.search(p, line, re.IGNORECASE) for p in JAGO_SKIP_JAGO)


def suggest_category_jago_v2(tx_type: str, source: str, notes: str):
    combined = f"{tx_type} {source} {notes}"
    for pattern, cat_name, fund_type in JAGO_KEYWORD_RULES_V2:
        if re.search(pattern, combined, re.IGNORECASE):
            return cat_name, fund_type
    return None, "pribadi"


def extract_jago_fields(middle: str):
    """
    Pisahkan bagian tengah baris utama menjadi:
    source, transaction_type, notes
    
    Contoh input: "Giovanni Chynthia Outgoing Transfer"
    Contoh input: "Interest Interest"
    Contoh input: "FRIZKA CHARISTA Outgoing Transfer cake eskrim pap mam aniv"
    """
    for tx_type in sorted(JAGO_TRANSACTION_TYPES, key=len, reverse=True):
        idx = middle.find(tx_type)
        if idx != -1:
            source = middle[:idx].strip()
            after = middle[idx + len(tx_type):].strip()
            return source, tx_type, after  # after = notes
    # fallback: tidak ketemu known type
    return "", middle, ""


@router.post("/preview-jago")
async def preview_jago_statement(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File harus PDF")

    content = await file.read()
    all_lines: list[str] = []

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.split("\n"):
                stripped = line.strip()
                if stripped:
                    all_lines.append(stripped)

    filtered = [line for line in all_lines if not should_skip_jago_v2(line)]

    transactions = []
    i = 0

    while i < len(filtered):
        line = filtered[i]

        main_match = JAGO_MAIN_LINE.match(line)
        if not main_match:
            i += 1
            continue

        day_str, month_name, year_str, middle, amount_str, _balance_str = main_match.groups()

        month_num = MONTH_MAP_EN_JAGO.get(month_name.lower())
        if not month_num:
            i += 1
            continue

        day = int(day_str)
        year_num = int(year_str)

        sign = "+" if amount_str.startswith("+") else "-"
        tx_type_sign = "income" if sign == "+" else "expense"
        amount = parse_jago_num(amount_str)

        source, tx_type, notes = extract_jago_fields(middle)

        # baris berikutnya: "HH:MM [destination/bank] [ID# ref]"
        # sering berisi bank tujuan atau nomor rekening — ambil sebagai tambahan from_to
        extra_source = ""
        j = i + 1
        if j < len(filtered):
            sec_match = JAGO_SECONDARY_LINE.match(filtered[j])
            if sec_match:
                _, _, sec_content = sec_match.groups()
                # buang ID# ref
                sec_clean = re.sub(r"\s*ID#\s*\S+.*$", "", sec_content, flags=re.IGNORECASE).strip()
                extra_source = sec_clean
                j += 1

        # baris ketiga: kadang berisi nama bank lanjutan (mis. "Jago 102619539023")
        if j < len(filtered) and not JAGO_MAIN_LINE.match(filtered[j]):
            third = filtered[j]
            if re.match(r"^(Jago|BCA|BRI|Mandiri|BNI|GoPay|Dana|OVO)\s*\d*", third, re.IGNORECASE):
                extra_source += f" {third}".strip()
                j += 1

        # gabungkan from_to
        from_to_parts = [p for p in [source, extra_source] if p]
        from_to = " | ".join(from_to_parts)[:200]

        try:
            tx_date = date(year_num, month_num, day).isoformat()
        except ValueError:
            tx_date = None

        # notes: isi kolom "Notes" dari PDF (italic) — sudah ter-extract di middle
        # description: prioritaskan notes, fallback ke tx_type
        description = notes if notes else tx_type

        is_pocket_movement = bool(
            re.search(r"Pocket Money", tx_type, re.IGNORECASE)
        )

        category_name, fund_type = suggest_category_jago_v2(tx_type, source, notes)

        transactions.append({
            "date": tx_date,
            "day": day,
            "month": month_num,
            "title": tx_type,
            "description": description[:200],
            "from_to": from_to[:200],
            "amount": amount,
            "type": tx_type_sign,
            "suggested_category": category_name,
            "suggested_fund_type": fund_type,
            "internal_pocket_hint": source if is_pocket_movement else None,
            "is_likely_internal_transfer": is_pocket_movement,
        })

        i = j

    if not transactions:
        raise HTTPException(
            status_code=422,
            detail="Tidak ada transaksi terdeteksi dari PDF Jago ini."
        )

    return {
        "period_month": None,
        "period_year": None,
        "detected_account_name": "Main Pocket",
        "count": len(transactions),
        "transactions": transactions,
    }