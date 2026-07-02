# Running the Academic R Pipeline — No RStudio Required

A standalone R data analysis script implementing 5 advanced statistical and machine learning techniques on the **CartEngine E-Commerce Cart Abandonment** dataset (`Ecommerce.csv`). This script runs entirely from the command line and does **not** require RStudio, Jupyter, or any Python environment.

---

## What the Script Does

The `academic_pipeline.R` script performs the following operations in sequence:

1. **Data Loading & Inspection** — Reads `Ecommerce.csv`, prints row/column counts, column types, summary statistics, missing value report, and duplicate count.
2. **Data Cleaning** — Drops NA rows, removes duplicate records, and applies IQR-based outlier removal on `unit_price`, `time_on_site_sec`, `pages_viewed`, and `discount_percent`. Exports `cleaned_data.csv` to the project root.
3. **Advanced Technique #1 — Descriptive Statistics** — Computes Mean, Median, Variance, Standard Deviation, Skewness, and Excess Kurtosis for 7 key numeric columns using **custom raw moment formulae** (no external packages).
4. **Advanced Technique #2 — Chi-Square Test of Independence** — Tests whether `device_type` (Desktop/Mobile/Tablet) is statistically associated with `cart_abandoned` status in sessions where the customer added items to their cart.
5. **Advanced Technique #3 — Welch's Two-Sample t-test** — Compares mean `unit_price` between customers who purchased vs. those who abandoned their cart to test if item price is a significant differentiator.
6. **Advanced Technique #4 — One-Way ANOVA** — Bins `discount_percent` into Low/Medium/High groups and tests if average `time_on_site_sec` differs significantly across those discount bands.
7. **Advanced Technique #5 — Logistic Regression Classifier** — Fits a binary `glm()` logistic regression model to predict `cart_abandoned` using 14 pre-purchase session features. Reports confusion matrix, accuracy, precision, recall, and F1-score on an 80/20 train/test split.

---

## Prerequisites Check

Verify R is installed by opening a terminal and running:

```
R --version
```

**Expected output:**
```
R version 4.3.x (2024-xx-xx) -- "..."
Copyright (C) 2024 The R Foundation for Statistical Computing
Platform: x86_64-w64-mingw32/x64
```

### R is not found?

**Windows:** Install R from [https://cran.r-project.org/bin/windows/base/](https://cran.r-project.org/bin/windows/base/)

After installation, add R to your PATH. The default install location is:
```
C:\Program Files\R\R-4.x.x\bin
```

Add this to your system `PATH` via:
> Control Panel → System → Advanced System Settings → Environment Variables → Edit Path

---

## Option 1: Run from Windows Terminal or PowerShell (Recommended)

### Step 1 — Navigate to the R pipeline folder:
```powershell
cd "d:\vibecoder\sai_ram\R pipeline"
```

### Step 2 — Install required packages (first time only):
```powershell
Rscript -e "install.packages('dplyr', repos='https://cloud.r-project.org')"
Rscript -e "install.packages('tidyr', repos='https://cloud.r-project.org')"
```

### Step 3 — Run the script:
```powershell
Rscript academic_pipeline.R
```

---

## Option 2: Run from VS Code Terminal

1. Open VS Code and use **File → Open Folder** to open `d:\vibecoder\sai_ram`.
2. Open the integrated terminal: **Terminal → New Terminal** (`` Ctrl+` ``).
3. Navigate to the R folder:
   ```bash
   cd "R pipeline"
   ```
4. Install packages (first time only):
   ```bash
   Rscript -e "install.packages(c('dplyr','tidyr'), repos='https://cloud.r-project.org')"
   ```
5. Run the pipeline:
   ```bash
   Rscript academic_pipeline.R
   ```

> **Tip:** Install the [R Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=REditorSupport.r) by `REditorSupport` for syntax highlighting and one-click line execution via `Ctrl+Enter`.

---

## Option 3: Run from Windows Command Prompt (CMD)

```cmd
cd /d "d:\vibecoder\sai_ram\R pipeline"
Rscript -e "install.packages(c('dplyr','tidyr'), repos='https://cloud.r-project.org')"
Rscript academic_pipeline.R
```

---

## Expected Terminal Output

When the script runs successfully, your terminal will display output similar to:

```
=============================================================
  CartEngine Academic R Pipeline — Starting Execution
  Dataset: Ecommerce.csv | Target: cart_abandoned
=============================================================

--- [1/5] DATA LOADING & INSPECTION ---
Loaded dataset from: ../Ecommerce.csv
Initial dataset dimensions : 25000 rows x 29 columns
...

--- [2/5] DATA CLEANING ---
Rows after NA removal    : 25000
Rows after dedup         : 24998
  IQR outlier removal [unit_price           ]: removed XX rows
  ...
Exported cleaned data to   : ../cleaned_data.csv

--- [3/5] DESCRIPTIVE STATISTICS (Advanced Technique #1) ---
Feature                  Mean      Median     Variance      Std Dev   Skewness  Ex.Kurtosis
--------------------------------------------------------------------------------------------
unit_price             XX.XXXX   XX.XXXX    XXXX.XXXX    XX.XXXX    X.XXXX      X.XXXX
...

--- [4/5] HYPOTHESIS TESTING ---
== Hypothesis Test #2: Chi-Square Test of Independence ==
Chi-Square Statistic : XX.XXXX
p-value              : X.XXXXXX
Decision: REJECT H0 — ...

== Hypothesis Test #3: Welch's Two-Sample t-test ==
Welch's t-statistic  : XX.XXXX
p-value              : X.XXXXXX
Decision: ...

== Hypothesis Test #4: One-Way ANOVA ==
...

--- [5/5] LOGISTIC REGRESSION CLASSIFIER (Advanced Technique #5) ---
Accuracy   : X.XXXX  (XX.XX%)
Precision  : X.XXXX  (XX.XX%)
Recall     : X.XXXX  (XX.XX%)
F1-Score   : X.XXXX  (XX.XX%)

=============================================================
  ACADEMIC R PIPELINE — COMPLETE
=============================================================
```

---

## Output Files Generated

| File | Location | Description |
|:---|:---|:---|
| `cleaned_data.csv` | `d:\vibecoder\sai_ram\cleaned_data.csv` | IQR-cleaned version of `Ecommerce.csv` with outliers removed from `unit_price`, `time_on_site_sec`, `pages_viewed`, and `discount_percent`. Used by further analysis steps. |

---

## Troubleshooting

### `'Rscript' is not recognized as an internal or external command`
R is installed but not on your system PATH.

**Fix (Windows):**
1. Find your R install directory, typically: `C:\Program Files\R\R-4.x.x\bin`
2. Open: Start → Search "Environment Variables" → Edit the system Path variable
3. Add the path above and click OK.
4. Restart your terminal and retry.

---

### `there is no package called 'dplyr'`
Package not installed yet.

**Fix:**
```r
Rscript -e "install.packages(c('dplyr', 'tidyr'), repos='https://cloud.r-project.org')"
```

---

### `cannot open file '../Ecommerce.csv': No such file or directory`
You are running the script from the wrong directory.

**Fix:** Always `cd` into the `R pipeline` folder before running:
```powershell
cd "d:\vibecoder\sai_ram\R pipeline"
Rscript academic_pipeline.R
```

The script looks for `Ecommerce.csv` one level up (`../Ecommerce.csv`). The project root is `d:\vibecoder\sai_ram\` which is exactly where the dataset lives.

---

### `WARNING: Rtools is required to build R packages`
This warning appears if Rtools is not installed. It does **not** affect this script because we only use pre-built CRAN packages (`dplyr`, `tidyr`, `stats`).

**Safe to ignore.** The script will run successfully without Rtools.
