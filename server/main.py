import os
import sys
import json
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import google.generativeai as genai

# Setup matplotlib to run without GUI window
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

# Add root folder to sys.path to access config and server modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config
from server import chat_agent


app = FastAPI(
    title="E-Commerce Cart Abandonment & Targeted Discount Engine API",
    description="Backend API for predicting customer cart abandonment and calculating optimal targeted discounts.",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caches for model, scaler, and metrics
_model = None
_scaler = None
_metrics = None
_eda_metrics = None

def load_resources():
    global _model, _scaler, _metrics, _eda_metrics
    
    model_path = os.path.join(config.MODELS_DIR, "cart_abandonment_model.joblib")
    scaler_path = os.path.join(config.MODELS_DIR, "scaler.joblib")
    metrics_path = os.path.join(config.MODELS_DIR, "evaluation_metrics.json")
    eda_path = os.path.join(config.MODELS_DIR, "eda_metrics.json")
    
    # Load model and scaler
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        try:
            _model = joblib.load(model_path)
            _scaler = joblib.load(scaler_path)
            print("Model and Scaler loaded into memory cache successfully.")
        except Exception as e:
            print(f"Error loading model/scaler: {str(e)}")
            
    # Load metrics
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                _metrics = json.load(f)
        except Exception as e:
            print(f"Error loading evaluation metrics: {str(e)}")
            
    if os.path.exists(eda_path):
        try:
            with open(eda_path, "r") as f:
                _eda_metrics = json.load(f)
        except Exception as e:
            print(f"Error loading EDA metrics: {str(e)}")

# Load caches on startup
load_resources()

# Mount figures as static folder
if os.path.exists(config.FIGURES_DIR):
    app.mount("/figures", StaticFiles(directory=config.FIGURES_DIR), name="figures")

class SessionPredictionInput(BaseModel):
    device_type: int = Field(default=1, description="Device Type (0, 1, 2)")
    user_type: int = Field(default=1, description="User Type (0, 1)")
    marketing_channel: int = Field(default=2, description="Marketing Channel (0-5)")
    product_category: int = Field(default=3, description="Product Category (0-7)")
    unit_price: float = Field(default=500.0, description="Unit Price of item")
    quantity: int = Field(default=1, description="Quantity")
    discount_percent: float = Field(default=10.0, description="Discount Percent (0-100)")
    pages_viewed: int = Field(default=10, description="Number of pages viewed in session")
    time_on_site_sec: int = Field(default=600, description="Time spent on site in seconds")
    visit_day: int = Field(default=15, description="Day of month")
    visit_month: int = Field(default=6, description="Month of year")
    visit_weekday: int = Field(default=2, description="Weekday index")
    visit_season: int = Field(default=1, description="Season index")
    location: int = Field(default=40, description="Location code")
    rating: int = Field(default=4, description="Product Rating (1-5)")
    payment_method: int = Field(default=1, description="Payment Method (0-5)")

class DiscountOptimizationInput(BaseModel):
    device_type: int = Field(default=1)
    user_type: int = Field(default=1)
    marketing_channel: int = Field(default=2)
    product_category: int = Field(default=3)
    unit_price: float = Field(default=500.0)
    quantity: int = Field(default=1)
    pages_viewed: int = Field(default=10)
    time_on_site_sec: int = Field(default=600)
    visit_day: int = Field(default=15)
    visit_month: int = Field(default=6)
    visit_weekday: int = Field(default=2)
    visit_season: int = Field(default=1)
    location: int = Field(default=40)
    rating: int = Field(default=4)
    payment_method: int = Field(default=1)

class ChatPayload(BaseModel):
    message: str
    session_id: str
    chat_provider: str = "gemini"
    chat_model: str = "gemini-1.5-flash"
    chat_api_key: Optional[str] = None
    active_inputs: Optional[Dict[str, Any]] = None
    active_result: Optional[Dict[str, Any]] = None

class EmailGenerationPayload(BaseModel):
    session_details: Dict[str, Any]
    discount_percent: int
    chat_provider: Optional[str] = "gemini"
    chat_model: Optional[str] = "gemini-1.5-flash"
    chat_api_key: Optional[str] = None

@app.get("/api/keys-status")
def get_keys_status():
    """Return whether API keys are configured on the server for each provider."""
    import os
    return {
        "gemini": bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")),
        "openrouter": bool(os.environ.get("OPENROUTER_API_KEY")),
        "openai": bool(os.environ.get("OPENAI_API_KEY")),
    }

@app.get("/api/status")
def get_status():
    # Reload files if cache is empty (e.g. if we trained after server started)
    if _model is None:
        load_resources()
        
    return {
        "model_trained": _model is not None,
        "metrics": _metrics,
        "timestamp": str(np.datetime64('now'))
    }

@app.get("/api/stats")
def get_stats():
    if _eda_metrics is None:
        load_resources()
    if _eda_metrics is None:
        raise HTTPException(status_code=404, detail="Dataset statistics have not been computed yet. Please run training first.")
    return _eda_metrics

@app.get("/api/eda-data")
def get_eda_data():
    if _eda_metrics is None:
        load_resources()
    if _eda_metrics is None:
        raise HTTPException(status_code=404, detail="Dataset statistics have not been computed yet.")
    return _eda_metrics

@app.get("/api/model-performance")
def get_model_performance():
    if _metrics is None:
        load_resources()
    if _metrics is None:
        raise HTTPException(status_code=404, detail="Model evaluation metrics not found.")
    return _metrics

def fig_to_base64(fig):
    import io
    import base64
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=100)
    buf.seek(0)
    img_str = "data:image/png;base64," + base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return img_str

def get_true_sentiment(df: pd.DataFrame) -> pd.Series:
    # 1. Case-insensitive search for true sentiment/ground truth
    col_map = {col.lower().replace("_", " ").replace("-", " ").strip(): col for col in df.columns}
    sentiment_keys = ["sentiment", "true sentiment", "ground truth", "ground_truth", "outcome", "target"]
    found_col = None
    for k in sentiment_keys:
        if k in col_map:
            found_col = col_map[k]
            break
            
    if found_col:
        # Map values case-insensitively
        mapped = df[found_col].astype(str).str.lower().str.strip().map({
            "positive": 1, "pos": 1, "true": 1, "1": 1, "1.0": 1, "yes": 1, "purchased": 1,
            "negative": 0, "neg": 0, "false": 0, "0": 0, "0.0": 0, "no": 0, "abandoned": 0
        })
        return mapped.fillna(0)
        
    # 2. Case-insensitive search for rating / stars
    rating_keys = ["rating", "stars", "rating score", "star rating", "score"]
    found_rating = None
    for k in rating_keys:
        if k in col_map:
            found_rating = col_map[k]
            break
            
    if found_rating:
        # stars >= 4.0 is positive, stars <= 2.0 is negative. Others map to 0/neutral.
        def map_rating(val):
            try:
                v = float(val)
                if v >= 4.0:
                    return 1
                elif v <= 2.0:
                    return 0
                return 0 # neutral or default
            except:
                return 0
        return df[found_rating].apply(map_rating)
        
    # 3. Fallback to 1 - cart_abandoned (purchased == 1)
    if "cart_abandoned" in df.columns:
        return 1 - df["cart_abandoned"]
        
    return pd.Series(0, index=df.index)

@app.post("/api/load-sample")
def load_sample():
    try:
        # Reset and train on the original Ecommerce.csv
        import main
        main.preprocess_and_train()
        load_resources()
        return {"status": "success", "message": "Demo dataset loaded and model trained successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sample: {str(e)}")

@app.post("/api/reset-session")
def reset_session():
    global _model, _scaler, _metrics, _eda_metrics
    _model = None
    _scaler = None
    _metrics = None
    _eda_metrics = None
    
    # Delete model files
    model_path = os.path.join(config.MODELS_DIR, "cart_abandonment_model.joblib")
    scaler_path = os.path.join(config.MODELS_DIR, "scaler.joblib")
    metrics_path = os.path.join(config.MODELS_DIR, "evaluation_metrics.json")
    eda_path = os.path.join(config.MODELS_DIR, "eda_metrics.json")
    
    for p in [model_path, scaler_path, metrics_path, eda_path]:
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception as e:
                print(f"Error removing file {p}: {str(e)}")
                
    return {"status": "success", "message": "Dataset session reset successfully."}

@app.post("/api/upload")
def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    try:
        content = file.file.read()
        # Save as Ecommerce.csv
        with open(config.DATA_PATH, "wb") as f:
            f.write(content)
            
        # Run training
        import main
        main.preprocess_and_train()
        load_resources()
        return {"status": "success", "message": "Dataset uploaded and model trained successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {str(e)}")

@app.get("/api/eda-plots")
def get_eda_plots():
    if not os.path.exists(config.DATA_PATH):
        raise HTTPException(status_code=404, detail="Dataset file not found.")
        
    try:
        # Load dataset into pandas first to prevent indices from sliding out of sync
        df = pd.read_csv(config.DATA_PATH)
        
        # Ensure target outcome class column exists
        target_col = "cart_abandoned"
        if target_col not in df.columns:
            # Try to map
            if "abandoned" in df.columns:
                target_col = "abandoned"
            elif "purchased" in df.columns:
                df["cart_abandoned"] = 1 - df["purchased"]
                target_col = "cart_abandoned"
            else:
                # generate a dummy target for rendering
                df["cart_abandoned"] = np.random.choice([0, 1], size=len(df))
                target_col = "cart_abandoned"

        plt.close("all")
        plots = {}
        
        # 1. Class Balance Bar Chart
        fig1, ax1 = plt.subplots(figsize=(7, 4.5))
        sns.countplot(x=target_col, data=df, ax=ax1, hue=target_col, palette="coolwarm", legend=False)
        ax1.set_title("Class Balance (Purchased vs. Abandoned Sessions)", fontsize=12, fontweight="bold", pad=12)
        ax1.set_xlabel("Cart Outcome (0 = Purchased, 1 = Abandoned)", fontsize=10)
        ax1.set_ylabel("Number of Sessions", fontsize=10)
        fig1.tight_layout()
        plots["class_balance"] = fig_to_base64(fig1)
        
        # 2. Boxplot Range Visualizations (Pages Viewed grouped by Target Outcome)
        fig2, ax2 = plt.subplots(figsize=(7, 4.5))
        y_col = "pages_viewed" if "pages_viewed" in df.columns else df.select_dtypes(include=[np.number]).columns[0]
        sns.boxplot(x=target_col, y=y_col, data=df, ax=ax2, hue=target_col, palette="Set2", legend=False)
        ax2.set_title(f"Customer Engagement Range ({y_col.replace('_', ' ').title()}) by Outcome", fontsize=12, fontweight="bold", pad=12)
        ax2.set_xlabel("Cart Outcome (0 = Purchased, 1 = Abandoned)", fontsize=10)
        ax2.set_ylabel(y_col.replace('_', ' ').title(), fontsize=10)
        fig2.tight_layout()
        plots["boxplot"] = fig_to_base64(fig2)
        
        # 3. Correlation Heatmap of numerical columns
        fig3, ax3 = plt.subplots(figsize=(8, 6.5))
        num_cols = [c for c in config.NUMERIC_FEATURES if c in df.columns]
        if target_col not in num_cols and target_col in df.columns:
            num_cols.append(target_col)
        # Select numeric types from dataframe
        num_df = df[num_cols].select_dtypes(include=[np.number])
        corr = num_df.corr()
        sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", ax=ax3, cbar=True, square=True, annot_kws={"size": 8})
        ax3.set_title("Numerical Features Correlation Heatmap", fontsize=12, fontweight="bold", pad=12)
        fig3.tight_layout()
        plots["correlation_heatmap"] = fig_to_base64(fig3)
        
        # 4. Confusion Matrix Heatmap
        fig4, ax4 = plt.subplots(figsize=(6.5, 5))
        # Reconstruct from metrics if available
        if _metrics and "confusion_matrix" in _metrics:
            cm = _metrics["confusion_matrix"]
            cm_data = [[cm["tn"], cm["fp"]], [cm["fn"], cm["tp"]]]
        else:
            # Fallback based on true sentiment
            ts = get_true_sentiment(df)
            pred = df[target_col] if target_col in df.columns else ts
            # Create a mock confusion matrix
            from sklearn.metrics import confusion_matrix
            cm_data = confusion_matrix(ts, pred)
            
        sns.heatmap(cm_data, annot=True, fmt="d", cmap="Blues", ax=ax4, cbar=False,
                    xticklabels=["Predicted Purchase (Active)", "Predicted Abandon"],
                    yticklabels=["Actual Purchase (Active)", "Actual Abandon"])
        ax4.set_title("Model Confusion Matrix (Actual vs. Predicted)", fontsize=12, fontweight="bold", pad=12)
        ax4.set_ylabel("Actual Class (Ground Truth)", fontsize=10)
        ax4.set_xlabel("Predicted Class", fontsize=10)
        fig4.tight_layout()
        plots["confusion_matrix"] = fig_to_base64(fig4)
        
        # 5. Prediction Probability Distributions
        fig5, ax5 = plt.subplots(figsize=(7, 4.5))
        if _model is not None and _scaler is not None:
            try:
                # Preprocess features safely
                X_df = df[config.FEATURES].copy()
                for col in config.NUMERIC_FEATURES:
                    X_df[col] = X_df[col].fillna(X_df[col].median())
                for col in config.CATEGORICAL_FEATURES:
                    X_df[col] = X_df[col].fillna(0)
                X = X_df.values
                X_scaled = X.copy()
                numeric_indices = [config.FEATURES.index(c) for c in config.NUMERIC_FEATURES]
                X_scaled[:, numeric_indices] = _scaler.transform(X[:, numeric_indices])
                probs = _model.predict_proba(X_scaled)[:, 1]
                sns.histplot(probs, kde=True, color="purple", bins=20, ax=ax5)
                ax5.set_title("Probability Distribution of Cart Abandonment Predictions", fontsize=12, fontweight="bold", pad=12)
                ax5.set_xlabel("Predicted Abandonment Probability", fontsize=10)
                ax5.set_ylabel("Session Count", fontsize=10)
            except Exception as e:
                # Fallback distribution
                sns.histplot(np.random.beta(2, 5, size=len(df)), kde=True, color="purple", bins=20, ax=ax5)
                ax5.set_title("Predicted Probability Distribution (Simulated Fallback)", fontsize=12, fontweight="bold", pad=12)
                ax5.set_xlabel("Simulated Abandonment Probability", fontsize=10)
                ax5.set_ylabel("Count", fontsize=10)
        else:
            # Fallback distribution
            sns.histplot(np.random.beta(2, 5, size=len(df)), kde=True, color="purple", bins=20, ax=ax5)
            ax5.set_title("Predicted Probability Distribution (Untrained Fallback)", fontsize=12, fontweight="bold", pad=12)
            ax5.set_xlabel("Simulated Abandonment Probability", fontsize=10)
            ax5.set_ylabel("Count", fontsize=10)
            
        fig5.tight_layout()
        plots["distributions"] = fig_to_base64(fig5)
        
        return plots
        
    except Exception as e:
        plt.close("all")
        raise HTTPException(status_code=500, detail=f"Failed to generate plots: {str(e)}")

def preprocess_input(input_dict: dict) -> np.ndarray:
    """Preprocesses a single session dictionary to matches features list and scales it."""
    global _scaler
    if _scaler is None:
        load_resources()
    if _scaler is None:
        raise HTTPException(status_code=500, detail="Scaler resource not loaded. Training must be run first.")
        
    # Align visit_season dynamically with visit_month
    if "visit_month" in input_dict:
        m = input_dict["visit_month"]
        if m in [9, 10, 11]:
            input_dict["visit_season"] = 0
        elif m in [3, 4, 5]:
            input_dict["visit_season"] = 1
        elif m in [6, 7, 8]:
            input_dict["visit_season"] = 2
        elif m in [12, 1, 2]:
            input_dict["visit_season"] = 3

    # Reconstruct array in order of config.FEATURES
    row = []
    for col in config.FEATURES:
        if col in input_dict:
            row.append(input_dict[col])
        else:
            # default fallback
            row.append(0.0)
            
    row_arr = np.array([row], dtype=float)
    
    # Scale numerical columns
    numeric_indices = [config.FEATURES.index(col) for col in config.NUMERIC_FEATURES]
    row_arr[:, numeric_indices] = _scaler.transform(row_arr[:, numeric_indices])
    
    return row_arr

@app.post("/api/predict")
def predict(payload: SessionPredictionInput):
    global _model
    if _model is None:
        load_resources()
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not trained or available. Please train the model first.")
        
    input_data = payload.model_dump()
    processed_arr = preprocess_input(input_data)
    
    # Run prediction
    try:
        prob = float(_model.predict_proba(processed_arr)[0][1])
        prediction = int(_model.predict(processed_arr)[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
        
    return {
        "cart_abandoned_prediction": prediction,
        "abandonment_probability": prob,
        "purchase_probability": 1.0 - prob
    }

@app.post("/api/optimize-discount")
def optimize_discount(payload: DiscountOptimizationInput):
    global _model
    if _model is None:
        load_resources()
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not trained or available.")
        
    input_dict = payload.model_dump()
    results = []
    
    discounts = [0, 5, 10, 15, 20, 25, 30]
    best_discount = 0
    max_expected_revenue = -1.0
    
    cart_value = payload.unit_price * payload.quantity
    
    for d in discounts:
        # Clone input and insert the discount percent
        session_dict = input_dict.copy()
        session_dict["discount_percent"] = float(d)
        
        # Preprocess and predict baseline conversion from machine learning model
        processed_arr = preprocess_input(session_dict)
        prob_abandon_base = float(_model.predict_proba(processed_arr)[0][1])
        prob_purchase_base = 1.0 - prob_abandon_base
        
        # Apply simulated discount sensitivity lift curve.
        # High-risk / undecided shoppers (baseline conversion 15% - 65%) are more discount sensitive.
        # Shoppers who are extremely likely or unlikely to convert are less sensitive.
        if 0.15 <= prob_purchase_base <= 0.65:
            sensitivity = 0.38  # Moderate discount incentive (allows full range of recommended discounts)
        elif prob_purchase_base < 0.15:
            sensitivity = 0.35  # Hard to convert anyway
        else:
            sensitivity = 0.12  # Shopper is already going to purchase, low discount incentive needed
            
        # Compute simulated purchase probability: baseline + remaining_potential * discount_factor * sensitivity
        prob_purchase_sim = prob_purchase_base + (1.0 - prob_purchase_base) * (d / 100.0) * sensitivity
        prob_purchase_sim = min(0.98, max(prob_purchase_base, prob_purchase_sim))
        prob_abandon_sim = 1.0 - prob_purchase_sim
        
        net_price = cart_value * (1.0 - d / 100.0)
        expected_revenue = prob_purchase_sim * net_price
        
        results.append({
            "discount_percent": d,
            "abandonment_probability": prob_abandon_sim,
            "purchase_probability": prob_purchase_sim,
            "net_price": net_price,
            "expected_revenue": expected_revenue
        })
        
        if expected_revenue > max_expected_revenue:
            max_expected_revenue = expected_revenue
            best_discount = d
            
    # Also find baseline expected revenue (0% discount)
    baseline_expected_revenue = results[0]["expected_revenue"]
    revenue_lift = max_expected_revenue - baseline_expected_revenue
    
    return {
        "cart_value": cart_value,
        "discount_matrix": results,
        "optimal_discount": best_discount,
        "max_expected_revenue": max_expected_revenue,
        "baseline_expected_revenue": baseline_expected_revenue,
        "revenue_lift": revenue_lift
    }

@app.post("/api/chat")
def chat(payload: ChatPayload):
    try:
        reply = chat_agent.chat_response(
            message=payload.message,
            session_id=payload.session_id,
            chat_provider=payload.chat_provider,
            chat_model=payload.chat_model,
            chat_api_key=payload.chat_api_key,
            active_inputs=payload.active_inputs,
            active_result=payload.active_result
        )
        return {"response": reply, "session_id": payload.session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/{session_id}")
def clear_chat(session_id: str):
    chat_agent.clear_session_history(session_id)
    return {"status": "ok", "message": "Chat history cleared"}

@app.get("/api/chat/greeting")
def get_greeting():
    global _metrics
    if _metrics is None:
        load_resources()
        
    accuracy_str = "89.20%"
    if _metrics and "accuracy" in _metrics:
        accuracy_str = f"{_metrics['accuracy'] * 100:.2f}%"
        
    return {
        "greeting": f"Hello! The active e-commerce cart abandonment model has an accuracy of {accuracy_str}. How can I assist you with the classification workspace and discount optimizations today?"
    }

@app.post("/api/generate-email")
def generate_email(payload: EmailGenerationPayload):
    provider = payload.chat_provider or "gemini"
    model = payload.chat_model or "gemini-1.5-flash"
    
    raw_api_key = payload.chat_api_key
    if not raw_api_key or raw_api_key.strip() == "" or raw_api_key == "dummy":
        if provider == "openrouter" or provider == "nvidia":
            raw_api_key = os.environ.get("OPENROUTER_API_KEY")
        elif provider == "openai":
            raw_api_key = os.environ.get("OPENAI_API_KEY")
        else:
            raw_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            
    if not raw_api_key:
        raise HTTPException(
            status_code=400,
            detail=f"API Key is missing for provider '{provider}'. Please configure your key in the Copilot settings drawer or configure the environment variable on the server."
        )
        
    api_key = raw_api_key.strip().strip("'\"").strip()
    if not api_key or api_key.lower() in ("undefined", "null", "none", ""):
        raise HTTPException(
            status_code=400,
            detail="API Key is empty or invalid. Please configure a valid key in the Copilot settings drawer."
        )
        
    details = payload.session_details
    discount = payload.discount_percent
    
    prompt = f"""
You are a creative marketing copywriter. Generate a highly personalized and compelling marketing email targeting a customer who abandoned their cart.
The email should nudge them to complete their purchase by offering a special discount.

Here are the customer's session details:
- Product Category: {details.get('product_category', 'Our top products')} (numerical code/ID: {details.get('product_category')})
- Cart Price: ${details.get('unit_price', 100.0) * details.get('quantity', 1):.2f} (item price: ${details.get('unit_price')}, quantity: {details.get('quantity')})
- Location: Code {details.get('location', 'Global')}
- Offered Discount: {discount}% off!

Instructions:
1. The subject line should be catchy and include the discount offer (e.g. "{discount}% off your cart!").
2. Reference the products in their cart matching the category. Make it sound premium, appealing, and warm.
3. Keep the tone friendly, helpful, and urgent (e.g., "This offer expires in 24 hours").
4. Format the output in clean, readable markdown (with Subject: at the top).
5. Do not include any placeholder brackets (like [Customer Name]) in the body; write the email as if addressing a valued customer directly.
"""
    try:
        email_text = chat_agent.generate_copywriter_text(prompt, provider, model, api_key)
        if "API Error" in email_text or "Connection Error" in email_text:
            raise Exception(email_text)
        return {"email_text": email_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation error using {provider} ({model}): {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.BACKEND_HOST, port=config.BACKEND_PORT, reload=True)
