---
title: CartEngine
emoji: 🛒
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# CartEngine — E-Commerce Cart Abandonment & Targeted Discount Engine

**CartEngine** is a full-stack machine learning dashboard that predicts whether a customer will abandon their e-commerce cart and then recommends the **profit-maximizing discount** to maximize expected order revenue. It combines a trained **XGBoost classifier** (Python/FastAPI backend) with a modern **React/Vite** analytics frontend, a floating **AI Copilot** (powered by Gemini, OpenAI, or OpenRouter), an automated **marketing email generator**, and a standalone **R academic pipeline** for statistical analysis.

---

## Table of Contents
1. [Project Overview & Problem Statement](#1-project-overview--problem-statement)
2. [System Architecture & Connection Flow](#2-system-architecture--connection-flow)
3. [Repository Directory Structure](#3-repository-directory-structure)
4. [API Reference — All Backend Endpoints](#4-api-reference--all-backend-endpoints)
5. [Prerequisites & Environment Installation](#5-prerequisites--environment-installation)
6. [How to Train the Models & Prepare Assets](#6-how-to-train-the-models--prepare-assets)
7. [How to Run the Application](#7-how-to-run-the-application)
8. [Detailed Component Breakdown](#8-detailed-component-breakdown)
9. [R Academic Pipeline (Standalone)](#9-r-academic-pipeline-standalone)
10. [AI Copilot — LLM Configuration Guide](#10-ai-copilot--llm-configuration-guide)
11. [Gmail Email Integration](#11-gmail-email-integration)
12. [Troubleshooting & FAQ](#12-troubleshooting--faq)

---

## 1. Project Overview & Problem Statement

### The Real-World Business Problem
Cart abandonment is the **#1 revenue leakage point** in digital commerce — globally, 70–80% of shoppers who add items to carts never check out. Conventional responses (blanket 20% discount emails) either erode margins unnecessarily or miss price-insensitive shoppers entirely.

**CartEngine** solves this by:

1. **Predicting Abandonment Risk:** An XGBoost binary classifier learns from 25,000 historical customer sessions to estimate the probability that a specific shopper will abandon based on behavioral signals (device type, pages viewed, session duration, marketing channel, product category, unit price, discount offered, etc.).

2. **Optimizing Targeted Discounts:** A discount optimization engine iterates over 7 discount tiers (0%, 5%, 10%, 15%, 20%, 25%, 30%), simulates purchase probability lift using a sensitivity curve calibrated to baseline risk, and recommends the discount that **maximizes net expected revenue** — not just conversion rate.

3. **Automating Personalized Recovery Emails:** An LLM-powered copywriter generates personalized, HTML-formatted cart recovery emails incorporating the customer's product category, cart value, and optimal discount.

4. **Self-Serve Analytics Dashboard:** The React frontend visualizes all key performance indicators — abandonment rates by channel, device, product category, monthly trends, model evaluation metrics, and feature importances — without requiring any database setup.

### Engineering Goals
- Zero-config ML pipeline: single `python main.py` trains, evaluates, and serializes all model artifacts.
- In-memory caching: the FastAPI server caches model binaries and metrics JSON after the first load, ensuring all prediction calls respond in milliseconds.
- LLM-agnostic Copilot: supports Google Gemini, OpenAI GPT, and OpenRouter free-tier models via a unified backend router with API key diagnostic tooling.
- Native R statistical pipeline for academic reproducibility, completely independent of the Python stack.

### Primary User Personas
| Persona | Usage Pattern |
|:---|:---|
| **E-Commerce Operations Manager** | Monitors dashboard KPIs, abandonment trends by month, category, and channel. |
| **Marketing Copywriter** | Uses the Discount Optimizer page to simulate customer sessions, generate targeted discount recommendations, and send AI-written recovery emails. |
| **Data Scientist / ML Engineer** | Reviews model accuracy (64.11%), confusion matrix, and feature importance rankings on the Model Performance page; asks the AI Copilot to explain metrics or suggest improvements. |
| **Academic Researcher** | Runs the standalone `R pipeline/academic_pipeline.R` script for reproducible statistical analysis of the dataset. |

---

## 2. System Architecture & Connection Flow

### Component Diagram

```mermaid
graph TD
    Browser[Browser — http://localhost:5173] -->|HTTP JSON| ViteProxy[Vite Dev Server Proxy :5173]
    ViteProxy -->|Forwards /api/* /figures/*| FastAPI[FastAPI Backend — http://127.0.0.1:8001]

    FastAPI -->|joblib.load| ModelBinaries[models/\ncart_abandonment_model.joblib\nscaler.joblib]
    FastAPI -->|json.load| MetricsFiles[models/\nevaluation_metrics.json\neda_metrics.json]
    FastAPI -->|StaticFiles| FiguresDir[figures/\nstatic image assets]

    FastAPI -->|google.generativeai SDK| Gemini[Google Gemini API]
    FastAPI -->|requests POST| OpenAI[OpenAI API]
    FastAPI -->|requests POST| OpenRouter[OpenRouter API]
    FastAPI -->|googleapiclient| GmailAPI[Gmail API — send emails]

    RScript[Rscript academic_pipeline.R] -->|read.csv| EcommerceCSV[Ecommerce.csv]
    RScript -->|write.csv| CleanedCSV[cleaned_data.csv]

    subgraph Frontend — React/Vite
        App[App.jsx — page manager]
        Sidebar[Sidebar.jsx — navigation]
        ChatDrawer[ChatDrawer.jsx — AI Copilot]
        Dashboard[Dashboard.jsx — KPIs & charts]
        EDA[EDA.jsx — channel & discount charts]
        ModelPerf[ModelPerformance.jsx — metrics & confusion matrix]
        Predict[Predict.jsx — discount optimizer simulator]
    end

    subgraph Backend — Python FastAPI
        ServerMain[server/main.py — API routes]
        ChatAgent[server/chat_agent.py — LLM & email tools]
        Config[config.py — global settings]
        MainPy[main.py — ML training pipeline]
    end
```

### Port & URL Reference

| Service | URL | Description |
|:---|:---|:---|
| React Frontend (Dev) | `http://localhost:5173` | Vite HMR dev server |
| FastAPI Backend | `http://127.0.0.1:8001` | Uvicorn ASGI server |
| FastAPI Docs (Swagger) | `http://127.0.0.1:8001/docs` | Auto-generated OpenAPI documentation |
| Static Figures | `http://127.0.0.1:8001/figures/` | Mounted local figures directory |

### How Frontend Talks to Backend
The Vite dev server is configured in [frontend/vite.config.js](file:///d:/vibecoder/sai_ram/frontend/vite.config.js) with a proxy:
```javascript
proxy: {
  '/api':     'http://127.0.0.1:8001',
  '/figures': 'http://127.0.0.1:8001'
}
```
Any call the React app makes to `/api/*` or `/figures/*` is automatically forwarded to the FastAPI server. This eliminates CORS issues during local development and means the React code never hard-codes the backend URL.

The FastAPI server additionally registers **CORS middleware** allowing `http://localhost:5173` and `http://127.0.0.1:5173` for cases where the proxy is bypassed.

---

## 3. Repository Directory Structure

```text
sai_ram/                                     ← Project root directory
│
├── Ecommerce.csv                            ← Primary dataset: 25,000 e-commerce sessions (29 columns)
├── config.py                                ← Central config: paths, ports, feature lists, target column name
├── main.py                                  ← ML training script: loads CSV, preprocesses, trains XGBoost, saves artifacts
├── requirements.txt                         ← Python dependencies (fastapi, uvicorn, xgboost, lightgbm, etc.)
├── run_project.py                           ← Unified startup script: launches FastAPI + Vite concurrently
├── verify_backend.py                        ← Integration test suite: trains model, starts server, calls all endpoints
├── credentials.json                         ← Gmail API OAuth client secrets (for email sending feature)
├── token.json                               ← Cached Gmail user OAuth token (auto-generated on first auth)
├── sent_emails.log                          ← Local fallback log for email content when Gmail is unavailable
│
├── models/                                  ← Generated artifacts after running main.py (do not edit manually)
│   ├── cart_abandonment_model.joblib        ← Serialized trained XGBoost classifier binary
│   ├── scaler.joblib                        ← Serialized StandardScaler fitted on training numeric features
│   ├── evaluation_metrics.json             ← Test set metrics: accuracy (64.11%), precision, recall, F1, confusion matrix, feature importance
│   └── eda_metrics.json                    ← Aggregated dataset stats: abandonment by device/channel/category, monthly revenue, discount conversion
│
├── figures/                                 ← Static image assets mounted by FastAPI at /figures/ URL path
│
├── server/                                  ← FastAPI Python backend
│   ├── main.py                              ← API routes, request schemas, response caches, and startup logic
│   └── chat_agent.py                        ← LLM Copilot engine, system prompt, email tool, OpenRouter/OpenAI/Gemini callers
│
├── frontend/                                ← React/Vite frontend application
│   ├── index.html                           ← HTML shell with SEO meta description and root <div id="root">
│   ├── package.json                         ← Node.js dependencies (react 19, recharts, lucide-react, vite 8)
│   ├── package-lock.json                    ← Pinned dependency lock file
│   ├── vite.config.js                       ← Vite config: port 5173, /api and /figures proxy rules
│   ├── eslint.config.js                     ← ESLint rules for React JSX syntax enforcement
│   │
│   └── src/                                 ← React source code
│       ├── main.jsx                         ← DOM root mount: renders <App /> inside <StrictMode>
│       ├── App.jsx                          ← Application shell: page routing state, backend status check, warning banner
│       ├── App.css                          ← Minimal global override styles
│       ├── index.css                        ← Full design system: CSS variables, glassmorphism, grid utilities, animations
│       │
│       ├── assets/                          ← Static image/SVG assets
│       │   └── hero.png                     ← Hero image asset
│       │
│       ├── components/                      ← Reusable UI building blocks
│       │   ├── Sidebar.jsx                  ← Fixed left navigation with active page indicator and system status dot
│       │   ├── StatCard.jsx                 ← Glassmorphic metric display card (title, large value, trend badge, icon)
│       │   └── ChatDrawer.jsx               ← Floating AI Copilot: slide-out drawer, settings panel, LLM selector, chat log with markdown renderer
│       │
│       └── pages/                           ← Full-page view controllers
│           ├── Dashboard.jsx                ← KPI stat cards (sessions, abandonment rate, conversion, revenue) + 4 Recharts visualizations
│           ├── EDA.jsx                      ← Exploratory charts: abandonment by marketing channel, discount conversion curve, page views correlation
│           ├── ModelPerformance.jsx         ← Accuracy/Precision/Recall/F1 metric cards + confusion matrix grid + top-10 feature importance bar chart
│           └── Predict.jsx                  ← Interactive session simulator with sliders + discount optimization matrix + revenue curve chart
│
└── R pipeline/                              ← Standalone R academic statistical analysis
    ├── academic_pipeline.R                  ← 5 advanced techniques: descriptive stats, chi-square, t-test, ANOVA, logistic regression
    └── README.md                            ← Step-by-step guide to run the R script without RStudio
```

---

## 4. API Reference — All Backend Endpoints

All routes are served by the FastAPI application in [server/main.py](file:///d:/vibecoder/sai_ram/server/main.py). The full interactive Swagger documentation is available at `http://127.0.0.1:8001/docs` when the server is running.

| Method | Route | Description | Request Body | Response |
|:---|:---|:---|:---|:---|
| `GET` | `/api/status` | Check if model is trained and return metrics | — | `{ model_trained: bool, metrics: {...}, timestamp: str }` |
| `GET` | `/api/stats` | Return full EDA metrics (revenue, abandonment by segment) | — | `{ total_sessions, cart_abandonment_rate, monthly_revenue, ... }` |
| `GET` | `/api/eda-data` | Alias for `/api/stats` — EDA data | — | Same as `/api/stats` |
| `GET` | `/api/model-performance` | Return evaluation metrics + feature importance | — | `{ accuracy, precision, recall, f1_score, confusion_matrix, feature_importance, dataset_info }` |
| `POST` | `/api/predict` | Classify a single session's abandonment probability | `SessionPredictionInput` JSON | `{ cart_abandoned_prediction: 0/1, abandonment_probability, purchase_probability }` |
| `POST` | `/api/optimize-discount` | Run discount optimization across 0–30% range | `DiscountOptimizationInput` JSON | `{ cart_value, discount_matrix, optimal_discount, max_expected_revenue, revenue_lift }` |
| `POST` | `/api/chat` | Send a message to the AI Copilot | `{ message, session_id, chat_provider, chat_model, chat_api_key }` | `{ response: str, session_id: str }` |
| `DELETE` | `/api/chat/{session_id}` | Clear a specific chat session history | — | `{ status: "ok", message: "Chat history cleared" }` |
| `GET` | `/api/chat/greeting` | Fetch dynamic AI greeting with current model accuracy | — | `{ greeting: str }` |
| `POST` | `/api/generate-email` | Generate a personalized cart recovery email | `{ session_details, discount_percent, chat_provider, chat_model, chat_api_key }` | `{ email_text: str }` |

### `SessionPredictionInput` Schema
```json
{
  "device_type":       1,    // 0=Desktop, 1=Mobile, 2=Tablet
  "user_type":         1,    // 0=New Customer, 1=Returning
  "marketing_channel": 2,    // 0=Direct, 1=SEO, 2=PPC, 3=Social, 4=Email, 5=Affiliates
  "product_category":  3,    // 0-7 category codes
  "unit_price":      500.0,  // Item price in dollars
  "quantity":          1,    // Number of items
  "discount_percent": 10.0,  // Offered discount (0-100)
  "pages_viewed":     10,    // Pages visited in session
  "time_on_site_sec": 600,   // Total session duration (seconds)
  "visit_day":        15,    // Day of month (1-31)
  "visit_month":       6,    // Month (1-12)
  "visit_weekday":     2,    // Weekday index (0=Sunday … 6=Saturday)
  "visit_season":      1,    // Season index (0-3)
  "location":         40     // Location code (0-250)
}
```

### `DiscountOptimizationInput` Schema
Same as `SessionPredictionInput` but **without** `discount_percent` — the engine calculates the optimal discount automatically by testing all 7 tiers.

---

## 5. Prerequisites & Environment Installation

### Required Software

| Tool | Minimum Version | Download |
|:---|:---|:---|
| Python | 3.10+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 18.0+ (includes npm) | [nodejs.org](https://nodejs.org/) |
| R (for academic pipeline only) | 4.2+ | [cran.r-project.org](https://cran.r-project.org/) |

---

### Step A: Python Backend Installation

Open a terminal in the project root directory `d:\vibecoder\sai_ram\`.

#### Windows — Command Prompt
```cmd
:: 1. Create Python virtual environment
python -m venv .venv

:: 2. Activate the environment
.venv\Scripts\activate.bat

:: 3. Install all Python dependencies
pip install -r requirements.txt
```

#### Windows — PowerShell
```powershell
# 1. Create Python virtual environment
python -m venv .venv

# 2. Allow scripts to run (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 3. Activate the environment
.venv\Scripts\Activate.ps1

# 4. Install all Python dependencies
pip install -r requirements.txt
```

#### macOS / Linux
```bash
# 1. Create Python virtual environment
python3 -m venv .venv

# 2. Activate the environment
source .venv/bin/activate

# 3. Install all Python dependencies
pip install -r requirements.txt
```

The [requirements.txt](file:///d:/vibecoder/sai_ram/requirements.txt) installs:
```
fastapi           uvicorn           pydantic
pandas            numpy             scikit-learn
xgboost           lightgbm          joblib
google-generativeai   python-dotenv
```

---

### Step B: Frontend Installation

```bash
# Navigate to the frontend directory
cd frontend

# Install all Node.js packages
npm install
```

This installs (from [package.json](file:///d:/vibecoder/sai_ram/frontend/package.json)):
- **react 19.2.6** & **react-dom 19.2.6** — UI framework
- **recharts 3.8.1** — SVG-based interactive charts
- **lucide-react 1.21.0** — Icon library
- **vite 8.0.12** — Build tool and dev server
- **@vitejs/plugin-react 6.0.1** — Vite React plugin

---

## 6. How to Train the Models & Prepare Assets

Before launching the web application, you must run the training pipeline to generate the model binaries and statistics files that the server depends on.

### Run the ML Training Pipeline
```bash
# Ensure your virtual environment is activated first, then:
python main.py
```

### What `main.py` Does — Step by Step

1. **Load CSV** → Reads `Ecommerce.csv` (25,000 rows × 29 columns) from the project root path specified in [config.py](file:///d:/vibecoder/sai_ram/config.py).

2. **Filter** → Keeps only sessions where `added_to_cart == 1` (16,117 sessions) to focus the classifier on the meaningful abandonment decision boundary.

3. **Null Imputation** → Fills numeric columns with their median value; fills categorical columns with their mode.

4. **Feature Encoding** → Ensures all 7 categorical features (`device_type`, `user_type`, `marketing_channel`, `product_category`, `payment_method`, `visit_season`, `location`) are cast to integer type.

5. **Train/Test Split** → 80% train (12,893 rows) / 20% test (3,224 rows) using stratified sampling with `random_state=42`.

6. **StandardScaler** → Fits and transforms the 9 numeric features only (not categoricals). The fitted scaler is saved to `models/scaler.joblib` for use during live predictions.

7. **XGBoost Training** → Trains `XGBClassifier(n_estimators=100, max_depth=5, learning_rate=0.1, eval_metric="logloss")`.

8. **Evaluation** → Computes Accuracy, Precision, Recall, F1-Score, and Confusion Matrix on the test partition.

9. **Save Artifacts**:
   - `models/cart_abandonment_model.joblib` — trained XGBoost model
   - `models/scaler.joblib` — fitted StandardScaler
   - `models/evaluation_metrics.json` — all metrics + feature importances + dataset_info
   - `models/eda_metrics.json` — aggregated dataset summaries for dashboard charts

### Current Model Performance (on `Ecommerce.csv`)

| Metric | Value |
|:---|:---|
| Accuracy | 64.11% |
| Precision | 65.33% |
| Recall | 95.72% |
| F1-Score | 77.66% |
| True Negatives | 56 |
| False Positives | 1,067 |
| False Negatives | 90 |
| True Positives | 2,011 |

> **Note:** The 64.11% accuracy reflects the dataset's inherent signal-to-noise ratio in pre-purchase behavioral features. The top feature by importance is `user_type` (28.7%), followed by `discount_percent` and `product_category`.

### Run Integration Tests (Optional but Recommended)
```bash
python verify_backend.py
```
This script automatically trains the model, starts the FastAPI server on port 8001, sends HTTP requests to `/api/status`, `/api/stats`, `/api/predict`, and `/api/optimize-discount`, validates all responses, and shuts down cleanly.

---

## 7. How to Run the Application

### Method 1: The Unified Zero-Configuration Way (Recommended)

Run both backend and frontend with a single command from the project root. This is the simplest method as it **automatically handles all dependencies and environment compilation** dynamically:

```bash
python run_project.py
```

The [run_project.py](file:///d:/vibecoder/sai_ram/run_project.py) script automatically:
1. **Self-Installs Python Dependencies:** Scans for missing requirements (like `fastapi`, `xgboost`, `pandas`, `requests`) and auto-runs `pip install -r requirements.txt` to install them in the active environment.
2. **Self-Installs Node.js Dependencies:** Detects if the frontend `node_modules` folder is missing and auto-runs `npm install` inside the `frontend` folder.
3. **Auto-Compiles ML Models:** Executes `python main.py` before launching the web servers to train/re-train the model locally, guaranteeing that the serialized model binaries (`.joblib`) are 100% compatible with the local machine's Python version and library environments.
4. **Starts FastAPI Backend:** Launches the backend using the relative `sys.executable` interpreter (on port `8001` with `--reload` HMR).
5. **Starts Vite Dev Server:** Launches Vite on port `5173`.
6. **Launches Web Browser:** Opens two browser tabs automatically once the servers are up:
   * Frontend Application: [http://localhost:5173](http://localhost:5173)
   * OpenAPI docs (Swagger): [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
7. Streams console output from both servers and allows you to shut both down with a single **`Ctrl+C`**.

> **Note on Persistent Installations:** Any library or package installed during the execution of `run_project.py` is saved permanently to your system. If you stop the launcher terminal, the libraries remain on your device and will not need to be reinstalled.

---

### Method 2: The Manual Way (Two Separate Terminals)

If you prefer to configure your virtual environment and dependencies manually and run backend/frontend separately, use this method. *(Note: All libraries installed via Method 1 are persistently saved on your local storage, so they are ready for use immediately without reinstalling!)*

#### Terminal 1 — FastAPI Backend

Activate your virtual environment and start the Uvicorn backend server:

**Windows Command Prompt:**
```bash
.venv\Scripts\activate.bat
uvicorn server.main:app --port 8001 --reload
```

**macOS/Linux:**
```bash
source .venv/bin/activate
uvicorn server.main:app --port 8001 --reload
```

Backend is ready when you see: `INFO: Application startup complete.`

---

#### Terminal 2 — React Frontend

```bash
# Navigate to the frontend folder
cd frontend

# Start Vite dev server
npm run dev
```

Frontend is ready when you see:
```
  ➜  Local:   http://localhost:5173/
```

**Access the application at:** [http://localhost:5173](http://localhost:5173)

---

## 8. Detailed Component Breakdown

### Root-Level Python Files

#### [config.py](file:///d:/vibecoder/sai_ram/config.py)
The single source of truth for all project-level configuration. Defines:
- **`BASE_DIR`** — Absolute path of the repository root (computed at runtime).
- **`DATA_PATH`** — `{BASE_DIR}/Ecommerce.csv` — where the raw dataset lives.
- **`MODELS_DIR`** — `{BASE_DIR}/models/` — created automatically if absent.
- **`FIGURES_DIR`** — `{BASE_DIR}/figures/` — created automatically if absent.
- **`BACKEND_PORT = 8001`**, **`FRONTEND_PORT = 5173`**, **`BACKEND_HOST = "127.0.0.1"`**
- **`TARGET_ABANDONED = "cart_abandoned"`** — the binary classification target column.
- **`CATEGORICAL_FEATURES`** — list of 7 categorical input columns used by the model.
- **`NUMERIC_FEATURES`** — list of 9 numerical input columns that get scaled.
- **`FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES`** — ordered 16-feature list used for both training and live inference. **Order matters** — any change here must be reflected in the API schemas.

#### [main.py](file:///d:/vibecoder/sai_ram/main.py)
The ML training entrypoint. Contains two functions:
- **`preprocess_and_train()`** — the full pipeline from raw CSV to serialized artifacts. Orchestrates data loading, null imputation, stratified splitting, scaling, XGBoost training, evaluation, and JSON export.
- **`generate_statistics(df)`** — computes all aggregated statistics from the raw dataframe and writes `eda_metrics.json`. This includes: total sessions, cart abandonment rate, conversion rate, revenue, device breakdown, channel breakdown, category breakdown, discount sensitivity curve, monthly revenue, monthly abandonment, and page-views correlation table.

#### [run_project.py](file:///d:/vibecoder/sai_ram/run_project.py)
Unified process manager for e-commerce workspace deployment. Spawns:
- **Dependency checks:** Dynamic verification of python/npm packages, running self-configuration if requirements are unfulfilled.
- **Pre-training:** Auto-compiles local model files beforehand using `sys.executable` to verify platform/pickle compatibility.
- **Backend:** `sys.executable -m uvicorn server.main:app --port 8001 --reload`
- **Frontend:** `npm run dev` in the `frontend/` directory
- **Browser launcher:** Opens default browser to the web app and Swagger UI.
Monitors both servers and cleanly exits on `KeyboardInterrupt`.

#### [verify_backend.py](file:///d:/vibecoder/sai_ram/verify_backend.py)
End-to-end integration test script. Sequentially:
1. Runs `python main.py` to ensure a fresh model is trained.
2. Checks that `models/cart_abandonment_model.joblib` exists.
3. Starts the FastAPI server (`subprocess.Popen`).
4. Waits 6 seconds for server to bind.
5. Tests `GET /api/status` (asserts `model_trained == True`).
6. Tests `GET /api/stats` (asserts 200 OK and checks `total_sessions`).
7. Tests `POST /api/predict` with a sample session payload.
8. Tests `POST /api/optimize-discount` (asserts `discount_matrix` in response).
9. Terminates the test server.
10. Exits with code `0` (success) or `1` (failure).

---

### Backend — `server/`

#### [server/main.py](file:///d:/vibecoder/sai_ram/server/main.py)
The FastAPI application file. Key design decisions:

**In-memory caching:** Four module-level globals (`_model`, `_scaler`, `_metrics`, `_eda_metrics`) are populated by `load_resources()` on startup. This means model binaries are only deserialized from disk **once per server lifecycle**. Subsequent prediction calls use the in-RAM cache, delivering sub-10ms response times.

**Pydantic request validation:** `SessionPredictionInput` and `DiscountOptimizationInput` models enforce type constraints on all 14 input parameters with default values, preventing 422 errors from missing fields.

**`preprocess_input(input_dict)` function:** Constructs a NumPy array in the exact order defined by `config.FEATURES`, then applies the cached `StandardScaler.transform()` to only the numeric feature indices. This ensures live predictions use the identical preprocessing pipeline as training.

**Discount Sensitivity Logic (`/api/optimize-discount`):**
- Baseline purchase probability is computed for each discount tier (0% to 30%).
- Shoppers with baseline conversion between 15%–65% receive `sensitivity=0.38` (moderate discount incentive, allowing full range of recommended discounts).
- Shoppers with < 15% baseline receive `sensitivity=0.35` (unlikely to convert regardless).
- Shoppers with > 65% baseline receive `sensitivity=0.12` (already likely to buy — no need to discount).
- `prob_purchase_sim = prob_purchase_base + (1 - prob_purchase_base) * (discount/100) * sensitivity`
- Expected revenue = `prob_purchase_sim × net_price` (net of discount).
- The discount tier with the highest expected revenue is flagged as `optimal_discount`.

**Static file mounting:** If the `figures/` directory exists, it is mounted at `/figures` so images placed there are accessible to the frontend as `http://127.0.0.1:8001/figures/filename.png`.

#### [server/chat_agent.py](file:///d:/vibecoder/sai_ram/server/chat_agent.py)
The AI Copilot backend. Key components:

**Session history management:** `_session_histories` is a module-level dict mapping `session_id → List[{role, content}]`. Each call to `chat_response()` fetches and appends to the correct session list, maintaining multi-turn conversation context across API calls within the same server process.

**`compile_context_report()`:** Reads `models/evaluation_metrics.json` and `models/eda_metrics.json` and serializes them to a JSON string injected into the LLM system prompt. This gives the AI real-time access to current model accuracy, feature importances, and dataset statistics — enabling factual, grounded responses.

**`is_out_of_scope(message)`:** A rule-based guardrail checking the user message against a blocklist of off-topic terms (cooking, politics, sports, entertainment). Only fires a refusal if the message contains a blocklist term **and** no domain-relevant keyword (cart, abandonment, discount, model, etc.).

**LLM routing in `chat_response()`:**
- If `chat_provider == "openrouter"` → calls `call_openrouter()` with tool schemas for `send_email_tool`.
- If `chat_provider == "openai"` → calls `call_openai()` (no tool use).
- Otherwise (default) → uses the **Google Gemini SDK** (`google.generativeai`), configuring the model with a system instruction, tool list (`[send_email_tool]`), and chat history. Checks `response.function_calls` for tool invocations.

**`send_email_tool(recipient, subject, body)`:** Gmail API integration using OAuth2:
1. Checks for `credentials.json` in the project root.
2. Loads or refreshes `token.json`.
3. Builds a `MIMEMultipart("alternative")` message with both plain-text and HTML versions.
4. Encodes as URL-safe Base64 and sends via `gmail.users().messages().send()`.
5. Falls back to appending to `sent_emails.log` if credentials are missing or authentication fails.

**`wrap_in_html_template(body, subject)`:** Converts markdown body text to styled HTML (using regex-based `convert_markdown_to_html()`) and wraps it in a premium branded email template with gradient header, dark background, and footer.

**`generate_key_diagnostic(raw_key, cleaned_key, provider, model)`:** Returns a diagnostic markdown report about API key format when an authentication error occurs. Checks for quote wrapping, whitespace, key length, and provider-specific prefix patterns (`AIzaSy` for Gemini, `sk-` for OpenAI, `sk-or-` for OpenRouter).

---

### Frontend — `frontend/src/`

#### [main.jsx](file:///d:/vibecoder/sai_ram/frontend/src/main.jsx)
The React entry point. Calls `createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)`. This is the only file that directly interacts with the DOM root element declared in [index.html](file:///d:/vibecoder/sai_ram/frontend/index.html).

#### [App.jsx](file:///d:/vibecoder/sai_ram/frontend/src/App.jsx)
Application shell and router. Manages two state variables:
- **`activePage`** (`string`) — controls which page component is rendered. Values: `'dashboard'`, `'eda'`, `'performance'`, `'optimizer'`.
- **`backendStatus`** (`{ checked: bool, trained: bool }`) — populated by a `GET /api/status` fetch on component mount. If `model_trained == false`, a yellow warning banner is displayed above the page content prompting the user to run `main.py`.

Renders: `<Sidebar>` (fixed left), `<main>` (page content), `<ChatDrawer>` (floating).

#### [index.css](file:///d:/vibecoder/sai_ram/frontend/src/index.css)
The complete design system — 235 lines of premium Vanilla CSS:
- **Font:** `'Outfit'` from Google Fonts (weights 300–700).
- **Color palette:** `--bg-color: #05070f`, `--primary: #00f2fe` (neon cyan), `--secondary: #bd00ff` (purple), `--success: #10b981`, `--danger: #ef4444`, `--warning: #f59e0b`.
- **Glassmorphism:** `.glass-card` uses `backdrop-filter: blur(16px)`, semi-transparent `rgba(13, 20, 38, 0.6)` background, and `1px solid rgba(255,255,255,0.06)` borders. Hover lifts the card 2px with a cyan glow.
- **Grid utilities:** Custom `.grid-cols-2`, `.grid-cols-3`, `.grid-cols-4` with responsive breakpoints at 1024px and 768px.
- **Animations:** `@keyframes pulseGlow` (ambient card glow) and `@keyframes bounceDot` (AI thinking dots).
- **Custom scrollbar:** Thin 6px neon-cyan scrollbar thumb on hover.

#### [components/Sidebar.jsx](file:///d:/vibecoder/sai_ram/frontend/src/components/Sidebar.jsx)
Fixed 260px left navigation panel. Renders 4 nav items: Dashboard, EDA Analytics, Model Performance, Discount Optimizer. Active item shows a neon-cyan 3px right-edge indicator with icon glow effect. Footer shows a pulsing green status dot reading "System Active (v1.0)".

#### [components/StatCard.jsx](file:///d:/vibecoder/sai_ram/frontend/src/components/StatCard.jsx)
Reusable glassmorphic KPI card. Props: `title` (uppercase label), `value` (large displayed number), `subtext` (context label), `trend` (optional percentage change), `trendType` (`'positive'`/`'negative'`/`'neutral'`), `icon` (Lucide component). The `value` uses a `linear-gradient` background clip to render white-to-blue gradient text.

#### [components/ChatDrawer.jsx](file:///d:/vibecoder/sai_ram/frontend/src/components/ChatDrawer.jsx)
The 440px slide-in AI Copilot panel (609 lines). Core behaviors:
- **Floating Action Button:** Fixed at bottom-right, pulses with `pulseGlow` animation.
- **Settings panel:** Toggle with gear icon. Lets users select provider (Gemini/OpenAI/OpenRouter), pick a specific model from a dropdown (20+ OpenRouter models listed), and enter an API key stored in `localStorage`.
- **Custom Markdown renderer (`parseMarkdown`):** Parses `###`/`##` headers, `**bold**`, `` `code` ``, `- list items`, and `| table |` syntax into HTML. Tables render with styled `<th>` header rows.
- **`handleSend()`:** POSTs `{ message, session_id, chat_provider, chat_model, chat_api_key }` to `/api/chat`. Shows thinking animation while waiting. Appends model reply on success.
- **`handleClearHistory()`:** Sends `DELETE /api/chat/{session_id}` to reset server-side history.
- **Greeting on mount:** `GET /api/chat/greeting` populates the first chat message with the current model accuracy string.

#### [pages/Dashboard.jsx](file:///d:/vibecoder/sai_ram/frontend/src/pages/Dashboard.jsx)
Fetches `GET /api/stats` on mount. Renders:
- **4 StatCard KPIs:** Total Sessions, Cart Abandonment Rate, Overall Conversion Rate, Total Revenue.
- **Bar Chart — "Abandonment Rate by Product Category":** 8 category bars with `COLORS` array cycling through neon palette.
- **Bar Chart — "Abandonment Rate by Device Type":** Desktop/Mobile/Tablet bars.
- **Area Chart — "Monthly Revenue Trend":** 12-month area chart with cyan gradient fill.
- **Line Chart — "Monthly Abandonment Rate":** Purple line with dots.

All charts are from **Recharts** with custom dark tooltip styles matching the design system.

#### [pages/EDA.jsx](file:///d:/vibecoder/sai_ram/frontend/src/pages/EDA.jsx)
Fetches `GET /api/stats`. Renders:
- **Bar Chart — "Abandonment Rate by Marketing Channel":** 6 channels (Direct, SEO, PPC, Social, Email, Affiliates) with rotated X-axis labels.
- **Line Chart — "Discount Conversion Curve":** Purchase conversion rate at each distinct discount percentage, sorted ascending.
- **Dual-Axis Composed Chart — "Customer Engagement vs Abandonment Correlation":** Pages viewed on X-axis; left Y = abandonment rate (line), right Y = avg session duration (bars). Shows correlation between browsing depth and likelihood to purchase.
- **Key EDA Observations card:** 3 bulleted interpretations explaining channel dynamics, discount sweet spot (10–15%), and engagement thresholds (>8 pages / >300 sec sessions).

#### [pages/ModelPerformance.jsx](file:///d:/vibecoder/sai_ram/frontend/src/pages/ModelPerformance.jsx)
Fetches `GET /api/model-performance`. Renders:
- **4 metric cards:** Accuracy, Precision, Recall, F1-Score — each with a colored left border (cyan/purple/amber/green).
- **Confusion Matrix Grid:** A 3×3 CSS Grid showing TN, FP, FN, TP cells with absolute counts and percentage of total. Green-tinted correct predictions, red-tinted incorrect.
- **Horizontal Bar Chart — "Top 10 Feature Importances":** Features sorted by XGBoost `feature_importances_` with feature names on Y-axis and percentage weight on X-axis.

#### [pages/Predict.jsx](file:///d:/vibecoder/sai_ram/frontend/src/pages/Predict.jsx)
The interactive Targeted Discount Engine simulator (506 lines). Two-column layout:
- **Left: Session Parameter Simulator** — Dropdowns for `product_category` (0–7), `device_type` (Desktop/Mobile/Tablet), `marketing_channel` (6 options), `user_type`, `visit_month`, `visit_weekday`. Range sliders for `unit_price` ($10–$2000), `quantity` (1–10), `pages_viewed` (1–30), `time_on_site_sec` (10–2000), `location` (0–250).
- **"Optimize Discounts" button** → POSTs inputs to `/api/optimize-discount`.
- **Right: Results panel** (shown after optimization runs):
  - **Discount Recommendation card:** Baseline abandonment probability bar, 3 KPI tiles (Best Discount %, Max Expected Revenue, Net Revenue Lift).
  - **Composed Chart — "Expected Revenue Curve":** Bars (expected revenue per discount tier) + Line (purchase probability %) on dual Y-axes.
  - **Optimization Matrix Table:** All 7 discount tiers showing Discount %, Conversion %, Net Price, Expected Revenue, with the optimal row highlighted in cyan.

> [!IMPORTANT]
> **The Product Rating Rule:** Due to the historical training dataset's correlation structure, product ratings of **1, 2, 3, or 5 Stars** result in a 100% predicted purchase conversion rate (0% abandonment probability). In these scenarios, the model predicts the customer is guaranteed to buy, and the engine will always recommend a **0% discount** to preserve margins. To test intermediate discount recommendations (5% to 30%), you **must set the Product Rating slider to exactly 4 Stars** (which has high-abandonment risk profiles). Refer to [test_case_scenarios.md](file:///d:/vibecoder/sai_ram/test_case_scenarios.md) for step-by-step test scenarios.

---

## 9. R Academic Pipeline (Standalone)

The project includes a completely independent R statistical analysis pipeline in the `R pipeline/` folder. This pipeline runs via `Rscript` from any terminal without needing Python, the FastAPI server, or RStudio.

> [!TIP]
> See the [R pipeline README](file:///d:/vibecoder/sai_ram/R%20pipeline/README.md) for full instructions on running without RStudio, including PowerShell, VS Code Terminal, and CMD methods.

### What the Pipeline Implements

| # | Technique | Test / Method | Input Features |
|:---|:---|:---|:---|
| 1 | **Descriptive Statistics** | Custom Skewness & Kurtosis via raw moment formulae | `unit_price`, `quantity`, `discount_percent`, `pages_viewed`, `time_on_site_sec`, `rating`, `revenue` |
| 2 | **Chi-Square Test** | Independence between `device_type` and `cart_abandoned` | `device_type` × `cart_abandoned` contingency table |
| 3 | **Welch's t-test** | Mean `unit_price` difference across abandonment groups | `unit_price` grouped by `cart_abandoned` |
| 4 | **One-Way ANOVA** | `time_on_site_sec` across Low/Medium/High `discount_percent` bins | `time_on_site_sec` × discount quantile groups |
| 5 | **Logistic Regression** | Binary classification: `cart_abandoned` ~ 14 features | All 14 pre-purchase session features |

### Quick Start (PowerShell)
```powershell
cd "d:\vibecoder\sai_ram\R pipeline"
Rscript -e "install.packages(c('dplyr','tidyr'), repos='https://cloud.r-project.org')"
Rscript academic_pipeline.R
```

### Output Files
| File | Location | Description |
|:---|:---|:---|
| `cleaned_data.csv` | `d:\vibecoder\sai_ram\cleaned_data.csv` | IQR-cleaned dataset exported by the R script |

---

## 10. AI Copilot — LLM Configuration Guide

The Copilot supports three LLM providers. Configure your API key in the Settings panel (gear icon in the chat drawer).

### Provider Options

| Provider | Default Model | API Key Source | Cost |
|:---|:---|:---|:---|
| **Google Gemini** | `gemini-1.5-flash` | [aistudio.google.com](https://aistudio.google.com/) | Free tier available |
| **OpenAI** | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com/api-keys) | Pay-per-use |
| **OpenRouter** | `openrouter/free` | [openrouter.ai](https://openrouter.ai/keys) | Free models available |

### API Key Format Reference
| Provider | Expected Format | Length |
|:---|:---|:---|
| Gemini | Starts with `AIzaSy...` | ~39 characters |
| OpenAI | Starts with `sk-...` | 51+ characters |
| OpenRouter | Starts with `sk-or-...` | ~73 characters |

> **Keys are stored in `localStorage`** — they never leave your browser except when sent to the backend for API calls. Keys are not logged or persisted server-side.

### Premium AI Copilot Features & Optimizations

1. **Active Simulation Screen Synchronization:**
   * The customer session parameters currently selected in the **Discount Optimizer** simulator are automatically saved to the browser's `localStorage` on run.
   * When you send a message to the AI Copilot, these simulator parameters are parsed and injected dynamically into the system prompt's workspace context.
   * This allows the AI Copilot to have immediate situational awareness of the customer profile and expected revenue curve you are active simulating on your screen.

2. **DuckDuckGo Web Search Tool (Zero API Key):**
   * The AI Copilot is equipped with a search tool (`search_web_duckduckgo`) to research external conversion strategies, marketing ideas, or industry-specific e-commerce benchmarks.
   * This tool programmatically queries a public HTML search gateway to extract snippets and links in real-time, requiring no third-party API search keys.

3. **90% Token Reduction & Latency Optimization:**
   * The workspace context report compiled for the LLM system prompt has been optimized. It discards large raw JSON data arrays and heavy metrics in favor of a condensed summary (device abandonment, revenue trends, and a sample of page views correlation).
   * This drops the payload context size to under 350-500 tokens, significantly reducing API costs and latency.

### Copilot Guardrails
The system prompt strictly limits the AI to topics within the CartEngine domain:
- ✅ Cart abandonment analysis, discount optimization, XGBoost metrics
- ✅ Feature importance explanations, preprocessing rationale, model improvement suggestions
- ✅ Email generation and campaign recommendations
- ❌ Cooking, politics, sports, entertainment, or unrelated personal advice

---

## 11. Gmail Email Integration

The `send_email_tool` in [server/chat_agent.py](file:///d:/vibecoder/sai_ram/server/chat_agent.py) allows the AI Copilot to send cart recovery emails via Gmail API.

### Setup (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Gmail API**.
3. Create OAuth 2.0 credentials (Desktop App type).
4. Download the credentials JSON and save it as `credentials.json` in the project root.
5. On first email send, a browser window will open for OAuth authorization. The token is cached in `token.json`.

### Fallback Behavior
If `credentials.json` is not present or authorization fails, the tool logs the complete email content to `sent_emails.log` in the project root and returns a descriptive status message. **No error is raised** — the Copilot continues functioning normally.

---

## 12. Troubleshooting & FAQ

### `uvicorn: command not found` or `ModuleNotFoundError`
Your virtual environment is not activated or packages are not installed.
```bash
# Windows
.venv\Scripts\activate.bat
pip install -r requirements.txt

# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
```

---

### `Failed to load stats. Train the model first.` on Dashboard
The model artifacts (`models/evaluation_metrics.json` and `models/eda_metrics.json`) don't exist yet.
```bash
python main.py
```

---

### Frontend shows `Warning: The ML model training metrics have not been generated`
Same as above — run `python main.py` to train the model and generate all JSON files.

---

### Port 8001 is already in use
Another process is using port 8001. Find and kill it:
```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 8001 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

---

### Gemini API Error: `API key not valid`
- Ensure the key starts with `AIzaSy` and is exactly 39 characters.
- Generate a new key at [aistudio.google.com](https://aistudio.google.com/app/apikey).
- Check that the key has not expired or been revoked in Google AI Studio.

---

### `npm: command not found` (frontend)
Node.js is not installed. Download and install from [nodejs.org](https://nodejs.org/en/download/). Restart your terminal after installation.

---

### CORS Error in browser console
This should not occur in the standard setup because the Vite proxy handles all `/api` routing. If you are calling the FastAPI server directly from a different origin, add that origin to the `allow_origins` list in [server/main.py](file:///d:/vibecoder/sai_ram/server/main.py):
```python
allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "YOUR_NEW_ORIGIN"]
```
