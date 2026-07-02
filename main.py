import pandas as pd
import numpy as np
import os
import json
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

import config

def load_data():
    print(f"Loading dataset from {config.DATA_PATH}...")
    if not os.path.exists(config.DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {config.DATA_PATH}")
    df = pd.read_csv(config.DATA_PATH)
    return df

def preprocess_and_train():
    df = load_data()
    
    # Filter for sessions that added items to cart (cart abandonment is only possible if added_to_cart == 1)
    # This avoids trivial rules and makes the classifier learn the decision boundary between buying vs abandoning.
    print(f"Original dataset shape: {df.shape}")
    df_filtered = df[df["added_to_cart"] == 1].copy()
    print(f"Filtered dataset shape (added_to_cart == 1): {df_filtered.shape}")
    
    # Target variable
    y = df_filtered[config.TARGET_ABANDONED].values
    
    # Feature columns
    X_df = df_filtered[config.FEATURES].copy()
    
    # Fill missing values
    for col in config.NUMERIC_FEATURES:
        if col in X_df.columns:
            median_val = X_df[col].median()
            X_df[col] = X_df[col].fillna(median_val)
            
    for col in config.CATEGORICAL_FEATURES:
        if col in X_df.columns:
            mode_val = X_df[col].mode()[0] if not X_df[col].mode().empty else 0
            X_df[col] = X_df[col].fillna(mode_val)

    # We can encode categorical features using basic numeric mapping (they are already integers in our dataset, as checked in preview!)
    # But just in case, let's keep them as integers.
    for col in config.CATEGORICAL_FEATURES:
        X_df[col] = X_df[col].astype(int)
        
    print(f"Features list: {config.FEATURES}")
    X = X_df.values
    
    # Split train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Scale numerical features (we'll save the scaler to preprocess user inputs during live prediction)
    scaler = StandardScaler()
    
    # We only scale numeric features. To do this cleanly, let's find indices of numeric features in config.FEATURES.
    numeric_indices = [config.FEATURES.index(col) for col in config.NUMERIC_FEATURES]
    
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[:, numeric_indices] = scaler.fit_transform(X_train[:, numeric_indices])
    X_test_scaled[:, numeric_indices] = scaler.transform(X_test[:, numeric_indices])
    
    # Train Model
    print("Training XGBoost Classifier...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        use_label_encoder=False,
        eval_metric="logloss"
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    print("\n--- Model Evaluation ---")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print("Confusion Matrix:")
    print(cm)
    
    # Feature Importance
    importances = model.feature_importances_
    feature_importance_list = []
    for idx, feature_name in enumerate(config.FEATURES):
        feature_importance_list.append({
            "feature": feature_name,
            "importance": float(importances[idx])
        })
    feature_importance_list = sorted(feature_importance_list, key=lambda x: x["importance"], reverse=True)
    
    # Save artifacts
    model_path = os.path.join(config.MODELS_DIR, "cart_abandonment_model.joblib")
    scaler_path = os.path.join(config.MODELS_DIR, "scaler.joblib")
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"\nSaved model to {model_path}")
    print(f"Saved scaler to {scaler_path}")
    
    # Save metrics JSON
    metrics_data = {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "confusion_matrix": {
            "tn": int(cm[0][0]),
            "fp": int(cm[0][1]),
            "fn": int(cm[1][0]),
            "tp": int(cm[1][1])
        },
        "feature_importance": feature_importance_list,
        "dataset_info": {
            "original_sessions": int(df.shape[0]),
            "filtered_sessions": int(df_filtered.shape[0]),
            "abandoned_count": int(np.sum(y)),
            "purchased_count": int(df_filtered.shape[0] - np.sum(y))
        }
    }
    
    metrics_path = os.path.join(config.MODELS_DIR, "evaluation_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_data, f, indent=4)
    print(f"Saved metrics JSON to {metrics_path}")
    
    # Generate some simple static figures/tables for statistics
    generate_statistics(df)

def generate_statistics(df):
    stats = {}
    
    # Overall summary stats
    total_sessions = len(df)
    added_to_cart_sessions = df[df["added_to_cart"] == 1]
    total_carts = len(added_to_cart_sessions)
    abandoned_carts = df[df["cart_abandoned"] == 1]
    total_abandoned = len(abandoned_carts)
    total_purchases = df[df["purchased"] == 1]
    
    stats["total_sessions"] = total_sessions
    stats["cart_abandonment_rate"] = float(total_abandoned / total_carts) if total_carts > 0 else 0.0
    stats["conversion_rate"] = float(len(total_purchases) / total_sessions)
    stats["total_revenue"] = float(df["revenue"].sum())
    stats["average_order_value"] = float(total_purchases["revenue"].mean()) if len(total_purchases) > 0 else 0.0
    stats["average_discount_percent"] = float(df["discount_percent"].mean())
    
    # Device Type metrics
    device_abandonment = df[df["added_to_cart"] == 1].groupby("device_type")["cart_abandoned"].mean().to_dict()
    stats["device_abandonment"] = {str(k): float(v) for k, v in device_abandonment.items()}
    
    # Marketing Channel metrics
    channel_abandonment = df[df["added_to_cart"] == 1].groupby("marketing_channel")["cart_abandoned"].mean().to_dict()
    stats["channel_abandonment"] = {str(k): float(v) for k, v in channel_abandonment.items()}
    
    # Product Category metrics
    category_abandonment = df[df["added_to_cart"] == 1].groupby("product_category")["cart_abandoned"].mean().to_dict()
    stats["category_abandonment"] = {str(k): float(v) for k, v in category_abandonment.items()}

    # Discount vs Purchase conversion rate (only for added_to_cart == 1)
    discount_conversion = df[df["added_to_cart"] == 1].groupby("discount_percent")["purchased"].mean().to_dict()
    stats["discount_conversion"] = {str(k): float(v) for k, v in discount_conversion.items()}
    
    # Monthly revenue trend
    monthly_rev = df.groupby("visit_month")["revenue"].sum().to_dict()
    stats["monthly_revenue"] = {str(k): float(v) for k, v in monthly_rev.items()}
    
    # Monthly abandonment rate (added_to_cart == 1)
    monthly_ab = df[df["added_to_cart"] == 1].groupby("visit_month")["cart_abandoned"].mean().to_dict()
    stats["monthly_abandonment"] = {str(k): float(v) for k, v in monthly_ab.items()}
    
    # Page views correlation (added_to_cart == 1)
    pv_group = df[df["added_to_cart"] == 1].groupby("pages_viewed").agg({
        "cart_abandoned": "mean",
        "time_on_site_sec": "mean"
    }).reset_index()
    
    # Clean records conversion
    stats["page_views_correlation"] = []
    for _, row in pv_group.iterrows():
        stats["page_views_correlation"].append({
            "pages_viewed": int(row["pages_viewed"]),
            "cart_abandoned_rate": float(row["cart_abandoned"]),
            "time_on_site_sec": float(row["time_on_site_sec"])
        })
    
    # Save eda metrics JSON
    eda_path = os.path.join(config.MODELS_DIR, "eda_metrics.json")
    with open(eda_path, "w") as f:
        json.dump(stats, f, indent=4)
    print(f"Saved EDA metrics JSON to {eda_path}")

if __name__ == "__main__":
    preprocess_and_train()
