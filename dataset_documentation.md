# E-Commerce Cart Abandonment Dataset Documentation

This document provides a detailed breakdown of the behavioral and transaction attributes within the `Ecommerce.csv` dataset, which contains **25,000 historical customer sessions**.

---

## 1. Feature Dictionary (29 Columns)

The dataset contains 29 structural columns, categorized into customer demographics, session browsing behaviors, cart & product parameters, and marketing & traffic attributes.

### A. Customer Demographics
* **`customer_id`** (Integer): Unique customer identifier.
* **`location`** (Integer): Numeric location/city code representing geographical origins (0–250).
* **`user_type`** (Integer): Binary customer segment identifier:
  * `0` = New Customer
  * `1` = Returning Customer

### B. Session Browsing Behaviors
* **`session_id`** (Integer): Unique session identifier.
* **`visit_date`** (String): Calendar date of the visit in `DD-MM-YYYY` format.
* **`pages_viewed`** (Integer): Total pages viewed by the customer during the session.
* **`time_on_site_sec`** (Integer): Total duration of the session on the website in seconds.
* **`session_duration_bucket`** (String): Qualitative classification of session length (`Short`, `Medium`, `Long`).
* **`visit_day`** (Integer): Numeric day of the month (1–31).
* **`visit_month`** (Integer): Numeric month of the year (1–12).
* **`visit_weekday`** (Integer): Numeric weekday index (`0` = Sunday … `6` = Saturday).
* **`visit_season`** (Integer): Numeric code representing season of the year (0–3).

### C. Cart & Product Parameters
* **`product_id`** (Integer): Unique product identifier.
* **`product_category`** (Integer): Numeric category code corresponding to product lines (0–7).
* **`unit_price`** (Float): The unit retail price of the product in USD ($).
* **`quantity`** (Integer): The count of items added or purchased in the session (1–10).
* **`discount_percent`** (Integer): Percentage discount offered to the customer (e.g., 0%, 5%, 10%, 15%, 20%, 25%, 30%).
* **`discount_amount`** (Float): Computed dollar discount value applied to the transaction.
* **`rating`** (Integer): Product quality rating assigned by customer reviews (1–5 stars).
* **`review_text`** (Integer): Binary indicator representing the presence of textual review content.
* **`review_helpful_votes`** (Integer): Number of helpful votes received on the customer review.
* **`added_to_cart`** (Integer): Binary flag indicating if the customer added item(s) to their cart:
  * `0` = Did not add to cart
  * `1` = Added to cart
* **`purchased`** (Integer): Checkout completion status indicator:
  * `0` = Did not complete transaction
  * `1` = Completed purchase transaction
* **`cart_abandoned`** (Integer): **Target Variable** for prediction. Identifies if the cart was abandoned after adding items:
  * `0` = Did not abandon (either purchased, or never added items to the cart)
  * `1` = Abandoned cart (added to cart but did not purchase)
* **`revenue`** (Float): Total transaction revenue generated from the session ($). Defaults to `0.0` if no purchase was completed.
* **`revenue_normalized`** (Float): Min-max normalized scale of the transaction revenue.
* **`payment_method`** (Integer): Numeric code representing the payment method selected (0–3).

### D. Marketing & Traffic Attributes
* **`device_type`** (Integer): Numeric code representing the device used:
  * `0` = Desktop
  * `1` = Mobile
  * `2` = Tablet
* **`marketing_channel`** (Integer): Numeric code representing the acquisition traffic source:
  * `0` = Direct
  * `1` = SEO
  * `2` = PPC (Pay-Per-Click)
  * `3` = Social Media
  * `4` = Email
  * `5` = Affiliates

---

## 2. Target Column Semantics & Population Slicing Numbers

The dataset consists of **25,000 total customer sessions**. The predictive classification models restrict focus onto sessions where the customer explicitly engaged in buying intent (adding items to the cart).

* **Total Session Volume:** `25,000` records.
* **Cart Addition Volume (`added_to_cart == 1`):** `16,117` sessions (64.47% of total population).
* **Target Distribution (`cart_abandoned` where `added_to_cart == 1`):**
  * **Abandoned Carts (`cart_abandoned == 1`):** `10,501` sessions (65.15% of cart addition population).
  * **Recovered/Completed Carts (`cart_abandoned == 0`):** `5,616` sessions (34.85% of cart addition population).

---

## 3. Data Integrity & Missing Values

* **Null Count:** `0` (Zero missing values).
* **Summary:** The `Ecommerce.csv` dataset is dense and contains no missing values across any of its 29 structural columns prior to loading. 
* *Note:* Although the data has no nulls, the preprocessing pipeline inside `main.py` incorporates median/mode imputation safeguards (`fillna`) to ensure operational reliability if future live customer inputs contain missing parameters.
