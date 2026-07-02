# =============================================================================
# ACADEMIC R PIPELINE — CartEngine E-Commerce Cart Abandonment Dataset
# =============================================================================
# PROJECT DOMAIN  : CLASSIFICATION (Binary: cart_abandoned = 0 or 1)
# PRIMARY DATASET : Ecommerce.csv (25,000 sessions, 29 columns)
# TARGET COLUMN   : cart_abandoned (0 = purchased, 1 = abandoned cart)
#
# COLUMN INVENTORY:
#   CATEGORICAL : device_type, user_type, marketing_channel, product_category,
#                 payment_method, visit_season, session_duration_bucket
#   NUMERIC     : unit_price, quantity, discount_percent, discount_amount,
#                 revenue, pages_viewed, time_on_site_sec, rating,
#                 review_helpful_votes, visit_day, visit_month, visit_weekday,
#                 revenue_normalized, location
#   ID/DATE     : customer_id, session_id, visit_date, product_id
#   TEXT        : review_text
#   BINARY      : added_to_cart, purchased, cart_abandoned
#
# PYTHON MODELS ALREADY USED:
#   - XGBoost Classifier (primary), scikit-learn StandardScaler
#   - Google Gemini / OpenAI / OpenRouter LLMs for AI Copilot
#
# ADVANCED TECHNIQUES IMPLEMENTED (5 total):
#   1. Custom Descriptive Statistics (Skewness & Kurtosis via raw moments)
#   2. Chi-Square Test of Independence (device_type vs cart_abandoned)
#   3. Welch's Two-Sample t-test (unit_price across abandonment groups)
#   4. One-Way ANOVA (time_on_site_sec across binned discount_percent groups)
#   5. Logistic Regression Classifier (binary classification in R)
# =============================================================================

library(dplyr)
suppressPackageStartupMessages(library(stats))

cat("=============================================================\n")
cat("  CartEngine Academic R Pipeline — Starting Execution\n")
cat("  Dataset: Ecommerce.csv | Target: cart_abandoned\n")
cat("=============================================================\n\n")


# =============================================================================
# [1/5] SECTION 1: DATA LOADING & INSPECTION
# =============================================================================
cat("--- [1/5] DATA LOADING & INSPECTION ---\n")

# Try loading from parent directory first, then current directory
csv_path_parent <- "../Ecommerce.csv"
csv_path_local  <- "Ecommerce.csv"

if (file.exists(csv_path_parent)) {
  df <- read.csv(csv_path_parent, stringsAsFactors = FALSE)
  cat("Loaded dataset from: ../Ecommerce.csv\n")
} else if (file.exists(csv_path_local)) {
  df <- read.csv(csv_path_local, stringsAsFactors = FALSE)
  cat("Loaded dataset from: Ecommerce.csv (current directory)\n")
} else {
  stop("ERROR: Ecommerce.csv not found. Please ensure the CSV file is in the project root or the R pipeline folder.")
}

cat(sprintf("Initial dataset dimensions : %d rows x %d columns\n", nrow(df), ncol(df)))
cat("\nColumn names and types:\n")
for (col in names(df)) {
  cat(sprintf("  %-30s [%s]\n", col, class(df[[col]])))
}

cat("\n--- Summary Statistics (first numeric columns) ---\n")
print(summary(df[, c("unit_price", "quantity", "discount_percent", "pages_viewed",
                      "time_on_site_sec", "rating", "cart_abandoned")]))

cat("\n--- Missing Values Per Column ---\n")
na_counts <- colSums(is.na(df))
na_report <- na_counts[na_counts > 0]
if (length(na_report) == 0) {
  cat("  No missing values found in any column.\n")
} else {
  for (col in names(na_report)) {
    cat(sprintf("  %-30s: %d missing\n", col, na_report[col]))
  }
}

dup_count <- sum(duplicated(df))
cat(sprintf("\nDuplicate row count: %d\n", dup_count))


# =============================================================================
# [2/5] SECTION 2: DATA CLEANING
# =============================================================================
cat("\n--- [2/5] DATA CLEANING ---\n")

# Drop rows with NA values
df_clean <- df %>% tidyr::drop_na()
cat(sprintf("Rows after NA removal    : %d\n", nrow(df_clean)))

# Remove duplicates
df_clean <- df_clean %>% distinct()
cat(sprintf("Rows after dedup         : %d\n", nrow(df_clean)))

# IQR-based outlier removal for key numeric columns
remove_outliers_iqr <- function(df, col_name) {
  x    <- df[[col_name]]
  Q1   <- quantile(x, 0.25, na.rm = TRUE)
  Q3   <- quantile(x, 0.75, na.rm = TRUE)
  IQR_val <- Q3 - Q1
  lower <- Q1 - 1.5 * IQR_val
  upper <- Q3 + 1.5 * IQR_val
  df[x >= lower & x <= upper, ]
}

numeric_cols_to_clean <- c("unit_price", "time_on_site_sec", "pages_viewed", "discount_percent")
for (col in numeric_cols_to_clean) {
  before <- nrow(df_clean)
  df_clean <- remove_outliers_iqr(df_clean, col)
  after <- nrow(df_clean)
  cat(sprintf("  IQR outlier removal [%-20s]: removed %d rows\n", col, before - after))
}

cat(sprintf("\nCleaned dataset dimensions : %d rows x %d columns\n", nrow(df_clean), ncol(df_clean)))

# Export cleaned data to parent directory
out_path_parent <- "../cleaned_data.csv"
out_path_local  <- "cleaned_data.csv"
tryCatch({
  write.csv(df_clean, file = out_path_parent, row.names = FALSE)
  cat(sprintf("Exported cleaned data to   : %s\n", out_path_parent))
}, error = function(e) {
  write.csv(df_clean, file = out_path_local, row.names = FALSE)
  cat(sprintf("Exported cleaned data to   : %s (fallback)\n", out_path_local))
})


# =============================================================================
# [3/5] SECTION 3: DESCRIPTIVE STATISTICS — ADVANCED TECHNIQUE #1
# =============================================================================
cat("\n--- [3/5] DESCRIPTIVE STATISTICS (Advanced Technique #1) ---\n")
cat("Custom Skewness & Kurtosis via Raw Moment Formulae\n\n")

# Custom functions using raw moment formulae (no external packages)
calc_skewness <- function(x) {
  x    <- x[!is.na(x)]
  n    <- length(x)
  mu   <- mean(x)
  m2   <- mean((x - mu)^2)
  m3   <- mean((x - mu)^3)
  return(m3 / (m2^1.5))
}

calc_kurtosis <- function(x) {
  x    <- x[!is.na(x)]
  mu   <- mean(x)
  m2   <- mean((x - mu)^2)
  m4   <- mean((x - mu)^4)
  return((m4 / m2^2) - 3)  # Excess kurtosis
}

desc_cols <- c("unit_price", "quantity", "discount_percent", "pages_viewed",
               "time_on_site_sec", "rating", "revenue")

cat(sprintf("%-22s %10s %10s %12s %12s %10s %12s\n",
            "Feature", "Mean", "Median", "Variance", "Std Dev", "Skewness", "Ex.Kurtosis"))
cat(strrep("-", 95), "\n")

for (col in desc_cols) {
  x <- df_clean[[col]]
  x <- x[!is.na(x)]
  cat(sprintf("%-22s %10.4f %10.4f %12.4f %12.4f %10.4f %12.4f\n",
              col,
              mean(x),
              median(x),
              var(x),
              sd(x),
              calc_skewness(x),
              calc_kurtosis(x)))
}

cat("\nInterpretation Guide:\n")
cat("  Skewness > 0 : Right-tailed distribution (long tail toward higher values)\n")
cat("  Skewness < 0 : Left-tailed distribution (long tail toward lower values)\n")
cat("  |Skewness| > 1 : High skewness — consider log transform before modeling\n")
cat("  Ex.Kurtosis > 0 : Leptokurtic (heavier tails than normal)\n")
cat("  Ex.Kurtosis < 0 : Platykurtic (lighter tails than normal)\n")


# =============================================================================
# [4/5] SECTION 4: HYPOTHESIS TESTING (3 Tests)
# =============================================================================
cat("\n--- [4/5] HYPOTHESIS TESTING ---\n")

# --- Test A: Chi-Square Test of Independence — ADVANCED TECHNIQUE #2 ---
cat("\n== Hypothesis Test #2: Chi-Square Test of Independence ==\n")
cat("Null Hypothesis (H0): Device type and cart abandonment are INDEPENDENT\n")
cat("Alt Hypothesis  (H1): Device type and cart abandonment are ASSOCIATED\n\n")

# Filter only sessions where cart abandonment makes sense (added_to_cart == 1)
df_cart <- df_clean %>% filter(added_to_cart == 1)
contingency_table <- table(df_cart$device_type, df_cart$cart_abandoned)
colnames(contingency_table) <- c("Purchased", "Abandoned")
rownames(contingency_table) <- c("Desktop", "Mobile", "Tablet")[rownames(contingency_table) %>% as.numeric() + 1]

cat("Observed Frequency Table (Device Type vs Cart Abandonment):\n")
print(contingency_table)

chi_result <- chisq.test(contingency_table)
cat(sprintf("\nChi-Square Statistic : %.4f\n", chi_result$statistic))
cat(sprintf("Degrees of Freedom   : %d\n", chi_result$parameter))
cat(sprintf("p-value              : %.6f\n", chi_result$p.value))

if (chi_result$p.value < 0.05) {
  cat("Decision: REJECT H0 — Device type and cart abandonment are significantly ASSOCIATED (p < 0.05).\n")
} else {
  cat("Decision: FAIL TO REJECT H0 — No statistically significant association detected (p >= 0.05).\n")
}

# --- Test B: Welch's Two-Sample t-test — ADVANCED TECHNIQUE #3 ---
cat("\n== Hypothesis Test #3: Welch's Independent Two-Sample t-test ==\n")
cat("Null Hypothesis (H0): Mean unit_price is EQUAL across abandonment groups\n")
cat("Alt Hypothesis  (H1): Mean unit_price DIFFERS between purchased and abandoned carts\n\n")

group_purchased <- df_cart$unit_price[df_cart$cart_abandoned == 0]
group_abandoned  <- df_cart$unit_price[df_cart$cart_abandoned == 1]

cat(sprintf("Group 'Purchased' (n=%d)  — Mean unit_price: $%.2f | SD: $%.2f\n",
            length(group_purchased), mean(group_purchased), sd(group_purchased)))
cat(sprintf("Group 'Abandoned' (n=%d)  — Mean unit_price: $%.2f | SD: $%.2f\n",
            length(group_abandoned), mean(group_abandoned), sd(group_abandoned)))

t_result <- t.test(group_purchased, group_abandoned, var.equal = FALSE)
cat(sprintf("\nWelch's t-statistic  : %.4f\n", t_result$statistic))
cat(sprintf("Degrees of Freedom   : %.2f\n", t_result$parameter))
cat(sprintf("p-value              : %.6f\n", t_result$p.value))
cat(sprintf("95%% Confidence Interval: [%.4f, %.4f]\n",
            t_result$conf.int[1], t_result$conf.int[2]))

if (t_result$p.value < 0.05) {
  cat("Decision: REJECT H0 — Significant difference in unit_price between groups (p < 0.05).\n")
} else {
  cat("Decision: FAIL TO REJECT H0 — No significant price difference detected (p >= 0.05).\n")
}

# --- Test C: One-Way ANOVA — ADVANCED TECHNIQUE #4 ---
cat("\n== Hypothesis Test #4: One-Way ANOVA ==\n")
cat("Goal: Test if time_on_site_sec differs significantly across discount level groups\n")
cat("Null Hypothesis (H0): Mean time_on_site_sec is EQUAL across all discount groups\n")
cat("Alt Hypothesis  (H1): At least one discount group has a DIFFERENT mean session duration\n\n")

# Bin discount_percent into 3 equal-frequency groups: Low/Medium/High
df_cart$discount_group <- cut(df_cart$discount_percent,
                              breaks = quantile(df_cart$discount_percent, probs = c(0, 0.33, 0.67, 1.0), na.rm = TRUE),
                              labels = c("Low", "Medium", "High"),
                              include.lowest = TRUE)

# Print group summary
group_summary <- df_cart %>%
  filter(!is.na(discount_group)) %>%
  group_by(discount_group) %>%
  summarise(
    n = n(),
    mean_time_sec = round(mean(time_on_site_sec, na.rm = TRUE), 2),
    sd_time_sec   = round(sd(time_on_site_sec, na.rm = TRUE), 2),
    .groups = "drop"
  )
cat("Group Summary (time_on_site_sec by discount group):\n")
print(as.data.frame(group_summary))

anova_data <- df_cart %>% filter(!is.na(discount_group))
anova_model <- aov(time_on_site_sec ~ discount_group, data = anova_data)
anova_summary <- summary(anova_model)

cat("\nANOVA Table:\n")
print(anova_summary)

p_anova <- anova_summary[[1]][["Pr(>F)"]][1]
if (!is.na(p_anova) && p_anova < 0.05) {
  cat("Decision: REJECT H0 — Significant differences in session duration across discount groups (p < 0.05).\n")
} else {
  cat("Decision: FAIL TO REJECT H0 — No significant session duration difference across discount groups (p >= 0.05).\n")
}


# =============================================================================
# [5/5] SECTION 5: MACHINE LEARNING — LOGISTIC REGRESSION (ADVANCED TECHNIQUE #5)
# =============================================================================
cat("\n--- [5/5] LOGISTIC REGRESSION CLASSIFIER (Advanced Technique #5) ---\n")
cat("Task: Binary classification — predict cart_abandoned (0=purchased, 1=abandoned)\n")
cat("Data: Filtered to sessions where added_to_cart == 1 (meaningful abandonment signal)\n\n")

# Prepare modeling dataset using only pre-purchase features
model_data <- df_cart %>%
  select(cart_abandoned, device_type, user_type, marketing_channel,
         product_category, unit_price, quantity, discount_percent,
         pages_viewed, time_on_site_sec, visit_weekday, visit_month,
         visit_season, location, payment_method) %>%
  filter(complete.cases(.))

# Convert factors
model_data$cart_abandoned    <- as.factor(model_data$cart_abandoned)
model_data$device_type       <- as.factor(model_data$device_type)
model_data$user_type         <- as.factor(model_data$user_type)
model_data$marketing_channel <- as.factor(model_data$marketing_channel)
model_data$product_category  <- as.factor(model_data$product_category)
model_data$payment_method    <- as.factor(model_data$payment_method)
model_data$visit_season      <- as.factor(model_data$visit_season)

cat(sprintf("Modeling dataset size: %d rows x %d columns\n", nrow(model_data), ncol(model_data)))

# 80/20 Train-Test Split
set.seed(42)
train_idx  <- sample(1:nrow(model_data), size = floor(0.80 * nrow(model_data)), replace = FALSE)
train_data <- model_data[train_idx, ]
test_data  <- model_data[-train_idx, ]
cat(sprintf("Train samples : %d | Test samples : %d\n\n", nrow(train_data), nrow(test_data)))

# Fit Logistic Regression using base R glm()
cat("Fitting Logistic Regression model (glm, family = binomial)...\n")
logit_model <- glm(
  cart_abandoned ~ device_type + user_type + marketing_channel +
    product_category + unit_price + quantity + discount_percent +
    pages_viewed + time_on_site_sec + visit_weekday + visit_month +
    visit_season + location + payment_method,
  data   = train_data,
  family = binomial(link = "logit")
)

cat("\n--- Logistic Regression Summary (Training Set) ---\n")
model_summary <- summary(logit_model)
print(model_summary)

# Evaluate on test set
pred_probs <- predict(logit_model, newdata = test_data, type = "response")
pred_class <- ifelse(pred_probs >= 0.5, 1, 0)
actual_class <- as.numeric(as.character(test_data$cart_abandoned))

# Confusion Matrix
cm <- table(Actual = actual_class, Predicted = pred_class)
cat("\n--- Confusion Matrix (Test Set) ---\n")
print(cm)

TP <- ifelse("1" %in% rownames(cm) && "1" %in% colnames(cm), cm["1", "1"], 0)
TN <- ifelse("0" %in% rownames(cm) && "0" %in% colnames(cm), cm["0", "0"], 0)
FP <- ifelse("0" %in% rownames(cm) && "1" %in% colnames(cm), cm["0", "1"], 0)
FN <- ifelse("1" %in% rownames(cm) && "0" %in% colnames(cm), cm["1", "0"], 0)
total <- TP + TN + FP + FN

accuracy  <- (TP + TN) / total
precision <- ifelse((TP + FP) > 0, TP / (TP + FP), 0)
recall    <- ifelse((TP + FN) > 0, TP / (TP + FN), 0)
f1        <- ifelse((precision + recall) > 0,
                    2 * precision * recall / (precision + recall), 0)

cat(sprintf("\n--- R Logistic Regression Performance Metrics ---\n"))
cat(sprintf("Accuracy   : %.4f  (%.2f%%)\n", accuracy, accuracy * 100))
cat(sprintf("Precision  : %.4f  (%.2f%%)\n", precision, precision * 100))
cat(sprintf("Recall     : %.4f  (%.2f%%)\n", recall, recall * 100))
cat(sprintf("F1-Score   : %.4f  (%.2f%%)\n", f1, f1 * 100))
cat(sprintf("\nNote: XGBoost Python model achieves 64.11%% accuracy on the same task.\n"))
cat(sprintf("      R Logistic Regression provides a simpler, interpretable baseline.\n"))

# =============================================================================
# FINAL SUCCESS BANNER
# =============================================================================
cat("\n")
cat("=============================================================\n")
cat("  ACADEMIC R PIPELINE — COMPLETE\n")
cat("=============================================================\n")
cat("  Techniques executed:\n")
cat("  [1] Descriptive Statistics (custom Skewness & Kurtosis)\n")
cat("  [2] Chi-Square Test of Independence (Device x Abandonment)\n")
cat("  [3] Welch's Two-Sample t-test (unit_price across groups)\n")
cat("  [4] One-Way ANOVA (session_duration across discount bins)\n")
cat("  [5] Logistic Regression Classifier (binary classification)\n")
cat("\n")
cat("  Output files:\n")
cat("  - ../cleaned_data.csv  — IQR-cleaned dataset\n")
cat("=============================================================\n")
