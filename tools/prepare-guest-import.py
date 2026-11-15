#!/usr/bin/env python3
"""Convert a local wedding guest XLSX into normalized CSV + audit JSON.
Never upload the XLSX or generated CSV to a public GitHub repository.
Usage: python tools/prepare-guest-import.py input.xlsx --out private-wedding-data/guests.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from datetime import datetime, date
from pathlib import Path

try:
    from openpyxl import load_workbook
except ImportError as e:
    raise SystemExit("Install local dependency first: python -m pip install openpyxl") from e

COLUMNS = [
    "first_name", "last_name", "display_name", "side", "relationship", "city",
    "email", "phone", "plus_one_allowed", "children_count", "source_sheet",
    "source_row", "review_notes"
]
ALIASES = {
    "first_name": {"имя", "firstname", "first name", "name", "имя гостя"},
    "last_name": {"фамилия", "lastname", "last name", "surname"},
    "display_name": {"фио", "полное имя", "гость", "имя и фамилия", "display name", "guest"},
    "side": {"сторона", "чья сторона", "side", "гости со стороны", "от кого"},
    "relationship": {"родство", "родственная связь", "кем приходится", "отношение", "relationship", "связь"},
    "city": {"город", "city", "откуда"},
    "email": {"email", "e mail", "электронная почта", "почта"},
    "phone": {"phone", "телефон", "номер телефона", "мобильный"},
    "plus_one_allowed": {"+1", "плюс один", "пара", "с парой", "с супругом", "с женой", "с мужем", "plus one"},
    "children_count": {"дети", "кол-во детей", "количество детей", "детей", "children"},
}
SIDE = {
    "жених": "groom", "никита": "groom", "groom": "groom",
    "невеста": "bride", "кристина": "bride", "bride": "bride",
    "общие": "both", "оба": "both", "both": "both",
}
TRUTHY = {"1", "да", "yes", "true", "есть", "+", "с парой", "вдвоем", "вдвоём"}


def norm(value: object) -> str:
    text = "" if value is None else str(value)
    return re.sub(r"\s+", " ", text.strip()).casefold()


def stringify(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def pick_header(rows: list[tuple]) -> tuple[int, dict[str, int]]:
    best_idx, best_map, score = -1, {}, 0
    for row_idx, row in enumerate(rows[:25]):
        detected = {}
        for col_idx, cell in enumerate(row):
            match = norm(cell)
            for field, aliases in ALIASES.items():
                if match in aliases and field not in detected:
                    detected[field] = col_idx
        value = len(detected)
        if "display_name" in detected or "first_name" in detected:
            value += 3
        if value > score:
            best_idx, best_map, score = row_idx, detected, value
    if score < 4:
        return -1, {}
    return best_idx, best_map


def clean_side(value: str) -> str:
    return SIDE.get(norm(value), "other")


def possible_ambiguous(name: str) -> bool:
    lowered = norm(name)
    return (
        " и " in lowered or " с детьми" in lowered
        or "семья " in lowered or " с женой" in lowered
        or " с мужем" in lowered or "+1" in lowered
    )


def convert(src: Path, out: Path) -> dict:
    if out.resolve() == src.resolve():
        raise ValueError("Source file must not be overwritten")
    wb = load_workbook(src, read_only=True, data_only=True)
    normalized, review, seen = [], [], set()
    summary = {"source": src.name, "sheets": [], "importable": 0, "skipped": 0,
               "duplicate_candidates": 0, "review_required": 0, "unconfirmed": True}
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        header_idx, index = pick_header(rows)
        sheet = {"name": ws.title, "detected_header_row": header_idx + 1,
                 "data_rows": 0, "importable": 0, "review_required": 0}
        summary["sheets"].append(sheet)
        if header_idx < 0:
            review.append({"sheet": ws.title, "row": None,
                           "reason": "No guest-name header detected"})
            continue
        for position, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
            raw = {field: stringify(row[i]) if i < len(row) else ""
                   for field, i in index.items()}
            if not any(v for v in raw.values()):
                continue
            sheet["data_rows"] += 1
            given, family = raw.get("first_name", ""), raw.get("last_name", "")
            name = raw.get("display_name", "").strip() or " ".join(
                x for x in (given, family) if x
            )
            if not given and name:
                pieces = name.split(maxsplit=1)
                given = pieces[0]
                family = pieces[1] if len(pieces) > 1 else ""
            if not name:
                summary["skipped"] += 1
                review.append({"sheet": ws.title, "row": position, "reason": "Empty name"})
                continue
            reasons = []
            if possible_ambiguous(name):
                reasons.append("POSSIBLE_GROUP_NOT_SPLIT")
            text_children = norm(raw.get("children_count", ""))
            children = 0
            if text_children:
                try:
                    children = int(float(text_children.replace(",", ".")))
                    if children < 0 or children > 15:
                        raise ValueError
                except ValueError:
                    reasons.append("CHILD_COUNT_UNKNOWN")
            key = (norm(name),clean_side(raw.get("side", "")))
            if key in seen:
                reasons.append("POSSIBLE_DUPLICATE")
                summary["duplicate_candidates"] += 1
            seen.add(key)
            pair = norm(raw.get("plus_one_allowed", ""))
            plus_one = "1" if pair in TRUTHY else "0"
            if pair and pair not in TRUTHY and pair not in {"0", "нет", "no", "false", "-"}:
                reasons.append("PLUS_ONE_UNCLEAR")
            item = {
                "first_name": given[:120], "last_name": family[:120],
                "display_name": name[:255], "side": clean_side(raw.get("side", "")),
                "relationship": raw.get("relationship", "")[:255],
                "city": raw.get("city", "")[:255],
                "email": raw.get("email", "")[:320],
                "phone": raw.get("phone", "")[:64],
                "plus_one_allowed": plus_one, "children_count": str(children),
                "source_sheet": ws.title, "source_row": str(position),
                "review_notes": ";".join(reasons),
            }
            if reasons:
                sheet["review_required"] += 1
                summary["review_required"] += 1
                review.append({"sheet": ws.title, "row": position, "name": name,
                               "reason": reasons})
            normalized.append(item)
            sheet["importable"] += 1
    if not normalized:
        raise ValueError("No guest records recognized in the workbook")
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(normalized)
    audit=out.with_suffix(".audit.json")
    with audit.open("w",encoding="utf-8") as f:
        json.dump({"summary":summary, "review":review},f,ensure_ascii=False,indent=2)
    summary["importable"]=len(normalized)
    return summary


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("file",type=Path)
    parser.add_argument("--out",type=Path,default=Path("private-wedding-data/guests.csv"))
    args=parser.parse_args()
    if not args.file.is_file():
        raise SystemExit(f"Input file does not exist: {args.file}")
    result=convert(args.file,args.out)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    print("Review the audit JSON before importing. All rows remain UNCONFIRMED.")
