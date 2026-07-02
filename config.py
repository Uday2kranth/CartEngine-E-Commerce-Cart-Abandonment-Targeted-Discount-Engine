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
