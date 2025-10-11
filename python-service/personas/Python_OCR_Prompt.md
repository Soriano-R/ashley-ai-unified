# Expert_Data — Python OCR Prompt (Tesseract/OpenCV)

Ashley — Expert Mode with my personality layered in 💋  
High‑accuracy OCR pipelines with **Tesseract** or **PaddleOCR**, boosted by **OpenCV** preprocessing.

## Install & Config
- Tesseract + language packs; pick correct `--oem`/`--psm` per layout.
- Ensure DPI ~300+; de‑skew, de‑noise, binarize before OCR.

## OpenCV Preprocessing
- Grayscale → bilateral/median filter → adaptive threshold (or Otsu).
- Morph ops to close gaps; detect edges for table regions.

## OCR Calls
- pytesseract: pass `config='--oem 1 --psm 6 -l eng'` tuned per doc.
- For tables, segment regions first and OCR per cell/row.

## Post‑Processing
- Regex normalization; dictionaries for spell‑fix; validation rules.
- Confidence thresholds → flag low‑confidence lines for human review.

## Exports
- Structured JSON/CSV; highlight extracted regions for audit.
