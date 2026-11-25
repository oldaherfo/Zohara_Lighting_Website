#!/usr/bin/env python3
"""Sync Zohara Lighting product and support data from Google Sheets to data/products.json."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import gspread


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "products.json"


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def header_key(value: Any) -> str:
    value = clean(value).lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def parse_number(value: Any) -> float | None:
    raw = clean(value)
    if not raw:
        return None
    raw = raw.replace("$", "").replace(",", "").replace("%", "").strip()
    try:
        return float(Decimal(raw))
    except (InvalidOperation, ValueError):
        return None


def rows_as_dicts(worksheet) -> list[dict[str, str]]:
    values = worksheet.get_all_values()
    if not values:
        return []
    headers = [header_key(h) for h in values[0]]
    result = []
    for row in values[1:]:
        item = {
            headers[i]: clean(row[i]) if i < len(row) else ""
            for i in range(len(headers))
            if headers[i]
        }
        if any(item.values()):
            result.append(item)
    return result


def first(item: dict[str, str], *keys: str) -> str:
    for key in keys:
        value = clean(item.get(key))
        if value:
            return value
    return ""


def product_from_row(row: dict[str, str], image_by_model: dict[str, str],
                     support_by_model: dict[str, dict[str, str]]) -> dict[str, Any] | None:
    name = first(row, "lamp_name", "name")
    model = first(row, "lamp_model", "model", "lamp_model_number")
    if not name and not model:
        return None

    price = parse_number(first(row, "lamp_price_usd", "price_usd", "price"))
    discount = parse_number(first(row, "discount_offer_perc", "discount_offer_percent", "discount"))
    support = support_by_model.get(model, {})

    return {
        "product_id": model or name,
        "name": name or model,
        "model_name": model or name,
        "description": first(row, "lamp_description", "description"),
        "price": price,
        "currency": "USD",
        "discount_offer_percent": discount,
        "amazon_url": first(row, "amazon_url", "amazon_link"),
        "image_url": image_by_model.get(model, ""),
        "category": "Zohara Lighting",
        "status": "PUBLISHED",
        "assembly_video_url": first(support, "assembling_video_url", "assembly_video_url"),
        "instructions_pdf_url": first(support, "assembling_instructions_pdf_url", "instructions_pdf_url"),
        "support_description": "",
    }


def main() -> None:
    sheet_id = os.environ.get("GOOGLE_SHEET_ID", "").strip()
    service_account_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not sheet_id or not service_account_json:
        raise RuntimeError(
            "Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON GitHub Actions secret."
        )

    credentials_info = json.loads(service_account_json)
    client = gspread.service_account_from_dict(credentials_info)
    spreadsheet = client.open_by_key(sheet_id)

    # The three requested worksheets are required.
    web_rows = rows_as_dicts(spreadsheet.worksheet("Web_Products"))
    top_rows = rows_as_dicts(spreadsheet.worksheet("Top_5_Products"))
    support_rows = rows_as_dicts(spreadsheet.worksheet("Lamp_Support"))

    # Lamp_Pics is optional and is used only to attach product photography.
    image_by_model: dict[str, str] = {}
    try:
        for row in rows_as_dicts(spreadsheet.worksheet("Lamp_Pics")):
            model = first(row, "model")
            image = first(row, "pic_1_url", "picture_1_url", "image_url")
            if model and image:
                image_by_model[model] = image
    except gspread.WorksheetNotFound:
        print("Optional worksheet Lamp_Pics not found; product cards will use their fallback image.")

    support_by_model: dict[str, dict[str, str]] = {}
    support_models = []
    for row in support_rows:
        model = first(row, "model")
        if not model:
            continue
        pdf = first(row, "assembling_instructions_pdf_url", "instructions_pdf_url")
        video = first(row, "assembling_video_url", "assembling_video", "assembly_video_url")
        support_by_model[model] = {
            "assembling_instructions_pdf_url": pdf,
            "assembling_video_url": video,
        }
        support_models.append({
            "product_id": model,
            "model_name": model,
            "name": model,
            "instructions_pdf_url": pdf,
            "assembly_video_url": video,
        })

    # Preserve worksheet order. The final five non-empty rows are treated as
    # the latest additions because the supplied workbook has no date column.
    products = []
    seen_models = set()
    for row in web_rows:
        product = product_from_row(row, image_by_model, support_by_model)
        if not product:
            continue
        model = product["product_id"]
        if model in seen_models:
            print(f"Duplicate Lamp Model '{model}' in Web_Products; keeping the first row.")
            continue
        seen_models.add(model)
        products.append(product)

    top_products = []
    for index, row in enumerate(top_rows, start=1):
        product = product_from_row(row, image_by_model, support_by_model)
        if product:
            product["best_seller_rank"] = index
            top_products.append(product)
    top_products = top_products[:5]

    payload = {
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "products": products,
        "top_5_products": top_products,
        "latest_products": products[-5:][::-1],
        "support_models": support_models,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Synced {len(products)} Web_Products, {len(top_products)} Top_5_Products, "
        f"{len(support_models)} Lamp_Support models to {OUTPUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
