# 🚀 Deployment Guide — CartEngine
## E-Commerce Cart Abandonment & Targeted Discount Engine
> One-stop master checklist for all code improvements and deployment steps.
> **Tasks are done ONE AT A TIME — agent awaits explicit permission before starting each task.**

---

## 🗂️ Project Architecture Snapshot

| Layer | Details |
|-------|---------|
| **App Name** | CartEngine — Targeted Discount System |
| **Backend** | FastAPI · `server/main.py` · Port **8001** |
| **ML Model** | XGBoost (pre-trained) · `models/cart_abandonment_model.joblib` |
| **Dataset** | `Ecommerce.csv` (2.5MB) |
| **Frontend** | React + Vite · `frontend/src/` · Port **5173** |
| **Pages** | Dashboard, EDA Analytics, Model Performance, Discount Optimizer |
| **AI Chat** | `ChatDrawer.jsx` — Gemini only currently, no OpenRouter |
| **Sidebar** | Fixed-width (260px), no collapse feature yet |
| **Welcome Page** | Does NOT exist yet — Dashboard is the default page |

---

## 📋 Phase 1: Code Modifications (Awaiting Permission — One Task at a Time)

- [x] **1.1 · Collapsible Sidebar Layout** — `Sidebar.jsx` rebuilt with ChevronLeft/Right toggle. Expands to 260px (icon + label + desc) or collapses to 72px (icon-only + title tooltip + scale hover). `App.jsx` shifts `margin-left` dynamically.

- [x] **1.2 · Welcome Portal (New Default Landing Page)** — New `Welcome.jsx` page: hero section with gradient title + model status pill, "How It Works" 4-step strip, feature cards grid. Default `activePage` set to `"welcome"`.

- [x] **1.3 · Active Session Status in Sidebar Footer** — Live `fetch('/api/status')` polling every 30s. Shows green/red pulsing dot, Wifi icon, "Model Ready" label, and accuracy badge. Collapsed mode shows mini dot with tooltip.

- [x] **1.4 · OpenRouter Chatbot Config (Model Roulette)** — ✅ Already done in prior session. ChatDrawer settings panel already registered `openrouter/free` with label "randome free model roulette" plus 14 other free OpenRouter models.

- [x] **1.5 · Robust Backend EDA Plotting**
  The current EDA page uses JS-side Recharts from pre-computed JSON (`eda_metrics.json`). 
  The backend has NO `/api/eda` plot endpoint (unlike MedDiagnose).
  Add a new `/api/eda-plots` endpoint to `server/main.py` that generates Matplotlib base64 plots:
  - Cart Abandonment by Category (bar chart)
  - Abandonment by Device Type (bar chart)
  - Monthly Revenue Trend (area chart)
  - Class Balance (abandoned vs purchased count bar)
  - Confusion Matrix from model evaluation
  Render these in `EDA.jsx` below the existing Recharts section with glassmorphic explanations.
  - ⚡ **Token cost: HIGH** — Backend + Frontend changes.

- [x] **1.6 · JS Zero-Crash Safeguards** — Optional chaining `?.` and `?? fallback` guards added to all `optimResult` accesses in `Predict.jsx`: cart value, discount matrix, abandonment probability bar, KPI cards, and table rows.

---

## 📋 Phase 2: Guided Deployment (Awaiting Permission — One Step at a Time)

- [x] **2.1 · Backend on Hugging Face Spaces (Docker SDK)**
  - Create a `Dockerfile` in the project root (does not exist yet).
  - Create/update `README.md` with HF YAML front-matter (`sdk: docker`, `app_port: 7860`).
  - Change backend port from 8001 → 7860 in `config.py` OR pass port via ENV in Dockerfile.
  - ⚡ **Token cost: LOW** — New Dockerfile + README header.

- [x] **2.2 · Git Repository Setup & Binary Cleanup**
  - Project has NO git repo yet (`d:\vibecoder\sai_ram` has no `.git` folder).
  - Initialize git, create `.gitignore` (exclude `.venv`, `__pycache__`, `node_modules`, `models/*.joblib` if desired, `Ecommerce.csv`, `credentials.json`, `token.json`, `sent_emails.log`).
  - Add remotes for GitHub and Hugging Face.
  - ⚡ **Token cost: LOW** — Commands only, no code changes.

- [x] **2.3 · Frontend VITE_API_URL Configuration** — ✅ Already done. `frontend/src/config.js` already reads `import.meta.env.VITE_API_URL || ""`. Just add `VITE_API_URL` env var on Vercel dashboard.

- [x] **2.4 · Frontend on Vercel**
  - Guide: Set Root Directory = `frontend`, Framework = Vite, add `VITE_API_URL` env var.
  - ⚡ **Token cost: NONE** — Instructions only.

---

## 🔍 Task Priority Guide (Read Before Giving Permission)

### ✅ Safe to do immediately (low risk, low token cost):
| Task | Why Safe |
|------|---------|
| **1.3** | Tiny change, no structural impact |
| **1.6** | Defensive code only, no behavior change |
| **2.3** | One-line config change |
| **2.4** | Instructions only, no code |

### ⚠️ Do with care (medium token cost, structural changes):
| Task | Why Careful |
|------|------------|
| **1.1** | Changes sidebar layout for all pages — test visually after |
| **1.2** | New page + routing change in App.jsx |
| **2.1** | New Dockerfile — test build before push |
| **2.2** | Git init — irreversible, do carefully |

### 🔴 Do last (high token cost, large changes):
| Task | Why Last |
|------|---------|
| **1.4** | Large ChatDrawer rewrite — do only when other tasks done |
| **1.5** | Backend + Frontend dual changes — test locally after |

---

## ✅ Progress Log
| Date | Task | Status |
|------|------|--------|
| 2026-07-02 | DEPLOYMENT_GUIDE.md created | Done |
| 2026-07-02 | Task 2.3: config.js already correct (pre-existing) | Done |
| 2026-07-02 | Task 1.4: ChatDrawer already had OpenRouter + `openrouter/free` (pre-existing) | Done |
| 2026-07-02 | Task 1.6: JS zero-crash guards applied to Predict.jsx | Done |
| 2026-07-02 | Task 1.1 + 1.3: Sidebar.jsx rebuilt — collapsible toggle + live /api/status polling | Done |
| 2026-07-02 | Task 1.2: Welcome.jsx created + App.jsx updated (default page = welcome) | Done |
| 2026-07-02 | Build verified: ✓ 2332 modules, zero errors, 1.86s | Done |
