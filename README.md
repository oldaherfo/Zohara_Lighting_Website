# Zohara Lighting — Google Sheets powered static site

The website is static (GitHub Pages). GitHub Actions reads the Google Sheet every four hours, generates `data/products.json`, and commits it to the repository. The browser never receives Google credentials.

## Workbook tabs and mapping

The sync script uses these worksheet tabs:

| Google Sheets tab | Used for | Columns read |
|---|---|---|
| `Web_Products` | Full Shop catalog and latest five on Home | `Lamp Name`, `Lamp Model`, `Lamp Description`, `Lamp Price USD`, `Discount Offer Perc.`, `Amazon URL` |
| `Top_5_Products` | Five featured products on Home | Same six columns as `Web_Products` |
| `Lamp_Support` | Support dropdown and model-specific resources | `Model`, `Assembling Instructions PDF URL`, `Assembling video URL` |
| `Lamp_Pics` (optional) | Product card image URLs | `Model`, `Pic 1 URL` |

`Lamp_Pics` is an optional supporting tab from the supplied workbook. If it exists, `Pic 1 URL` is joined to products by `Model`. If it is omitted or the image URL is blank, the product uses the site's fallback image.

### How the product sections work
- **Home — Top 5:** uses the rows in `Top_5_Products` in sheet order.
- **Home — Latest Products:** uses the last five non-empty rows of `Web_Products`, newest row first. The supplied workbook does not have a creation-date column, so row order is the definition of “latest”.
- **Shop:** shows all non-empty rows in `Web_Products`.
- **Support:** builds the model dropdown from `Lamp_Support`. Selecting a model shows its PDF and/or YouTube video.
- Product links open each row's `Amazon URL`. If a product URL is blank, its card links to Amazon.com.

The script treats each `Lamp Model` as the unique product key. Avoid duplicate model values in `Web_Products`.

## One-time Google setup

1. Convert/upload the Excel workbook to Google Sheets (or open it in Google Sheets and save it as a native Google Sheet).
2. In Google Cloud Console, create or select a project and enable **Google Sheets API**.
3. Create a **Service Account** and create a JSON key for it.
4. Copy the service-account email (it ends in `iam.gserviceaccount.com`).
5. Share the Google Sheet with that email as **Viewer**. The script only reads the sheet.
6. Copy the Google Sheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/THIS_IS_THE_SHEET_ID/edit`

## GitHub repository secrets

In GitHub, open the repository → **Settings → Secrets and variables → Actions → New repository secret** and create:

- `GOOGLE_SHEET_ID` — the ID from the Google Sheets URL.
- `GOOGLE_SERVICE_ACCOUNT_JSON` — the entire contents of the downloaded service-account JSON key file.

Never put the JSON key in the repository, in `index.html`, or in any public JavaScript file.

## GitHub Actions

Workflow: `.github/workflows/sync-products.yml`

- Scheduled with cron `0 */4 * * *` (UTC).
- Can also be run manually from **Actions → Sync Google Sheets Catalog → Run workflow**.
- Reads the four tabs, writes `data/products.json`, and commits only when the generated catalog changes.
- The first run requires the two repository secrets above.
- GitHub Actions schedules use UTC and can start a little later than the exact scheduled minute.

## Run locally (optional)

```bash
python -m pip install -r requirements.txt
export GOOGLE_SHEET_ID="your-sheet-id"
export GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account", ...}'
python scripts/sync_products.py
```

On Windows PowerShell, set the two environment variables with `$env:GOOGLE_SHEET_ID` and `$env:GOOGLE_SERVICE_ACCOUNT_JSON`.

## Important notes

- The current workbook's `Web_Products` and `Top_5_Products` tabs do not contain product image URLs. The optional `Lamp_Pics` tab supplies `Pic 1 URL`; keep it populated to show real product photos.
- `Discount Offer Perc.` is passed to the site as `discount_offer_percent`. The site displays the percentage as an offer label; it does not calculate a discounted price.
- PDFs must be public HTTPS links so visitors can download them. YouTube links can be standard watch, youtu.be, embed, or Shorts URLs.
- The workflow needs repository permission to push commits. If branch protection blocks GitHub Actions from pushing to the default branch, allow GitHub Actions to push or use a separate pull-request workflow.
