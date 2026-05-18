# Workbook Extraction Notes

- [Verified] These CSV files were extracted from `competitors info/Competitors_Feature_Pricing_Matrix scrpaing.xlsx` on `2026-05-16`.
- [Verified] The extraction is structural only. No live source verification was performed in this step.
- [Verified] `feature-pricing-matrix.csv` preserves malformed inline metadata rows because the source workbook contains them.
- [Verified] `github-repo-index.csv` is the cleanest sheet for the canonical tracked entity set.
- [Verified] `summary-comparison.csv` and `pricing-tiers.csv` are easier to read than the source workbook for Stage 2 verification passes.
