import os

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "Ecommerce.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
FIGURES_DIR = os.path.join(BASE_DIR, "figures")

# Ensure directories exist
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(FIGURES_DIR, exist_ok=True)

# Port settings
BACKEND_PORT = 8001
FRONTEND_PORT = 5173
BACKEND_HOST = "127.0.0.1"

# Feature configuration
# Target variables
TARGET_ABANDONED = "cart_abandoned"
TARGET_PURCHASED = "purchased"

# Feature lists
CATEGORICAL_FEATURES = [
    "device_type",
    "user_type",
    "marketing_channel",
    "product_category",
    "payment_method",
    "visit_season",
    "location"
]

NUMERIC_FEATURES = [
    "unit_price",
    "quantity",
    "discount_percent",
    "pages_viewed",
    "time_on_site_sec",
    "visit_day",
    "visit_month",
    "visit_weekday",
    "rating"
]

FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES

# ============================================================
# GOOGLE MODELS
# ============================================================
# Standard recommended model for agentic loops, speed, and tool calling
GEMINI_2_0_FLASH = "gemini-2.0-flash"

# Advanced model optimized for complex reasoning or code generation tasks
GEMINI_2_5_FLASH = "gemini-2.5-flash"

# Reliable legacy version
GEMINI_1_5_FLASH = "gemini-1.5-flash"

# High-intelligence model with a massive 2-million token context window
GEMINI_1_5_PRO = "gemini-1.5-pro"

# Production version-pinned identifiers
GEMINI_2_0_FLASH_STABLE = "gemini-2.0-flash-001"
GEMINI_1_5_FLASH_STABLE = "gemini-1.5-flash-002"
GEMINI_1_5_PRO_STABLE   = "gemini-1.5-pro-002"
