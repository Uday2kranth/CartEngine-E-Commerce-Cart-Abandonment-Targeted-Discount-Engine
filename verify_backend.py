import subprocess
import time
import sys
import os

# Auto-verify and install dependencies if missing
try:
    import requests
except ImportError:
    print("Required 'requests' library not found.")
    print("Installing packages from requirements.txt to local environment...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        import requests
        print("Successfully installed Python dependencies!")
    except Exception as e:
        print(f"Error installing dependencies: {str(e)}")
        print("Please run: pip install -r requirements.txt manually.")
        sys.exit(1)

def test_backend():
    print("=== STARTING BACKEND INTEGRATION TEST ===")
    
    # 1. Trigger the ML training pipeline first
    print("Running ML training pipeline (main.py)...")
    try:
        # Run main.py using current python executable
        python_executable = sys.executable
        subprocess.run([python_executable, "main.py"], check=True)
        print("SUCCESS: Pipeline training run finished and metrics saved.")
    except Exception as e:
        print(f"ERROR: ML training pipeline run failed: {str(e)}")
        sys.exit(1)

    # Check that model file was trained and exists
    model_path = os.path.join("models", "cart_abandonment_model.joblib")
    if not os.path.exists(model_path):
        print(f"Error: Model file {model_path} does not exist.")
        sys.exit(1)
    print("SUCCESS: Model artifacts exist.")

    # Start FastAPI server on port 8001 in background
    print("Starting FastAPI server locally on port 8001...")
    server_process = subprocess.Popen(
        [python_executable, "-m", "uvicorn", "server.main:app", "--port", "8001"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for server to bind and start
    time.sleep(6)
    
    base_url = "http://127.0.0.1:8001"
    success = True
    
    try:
        # Test 1: GET /api/status
        print("\nTest 1: GET /api/status")
        resp = requests.get(f"{base_url}/api/status")
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.json()}")
        assert resp.status_code == 200
        assert resp.json()["model_trained"] is True
        print("[OK] Test 1 Passed.")

        # Test 2: GET /api/stats
        print("\nTest 2: GET /api/stats")
        resp = requests.get(f"{base_url}/api/stats")
        print(f"Status Code: {resp.status_code}")
        assert resp.status_code == 200
        print(f"Total sessions in database: {resp.json().get('total_sessions')}")
        print("[OK] Test 2 Passed.")

        # Test 3: POST /api/predict
        print("\nTest 3: POST /api/predict")
        payload = {
            "device_type": 1,
            "user_type": 1,
            "marketing_channel": 2,
            "product_category": 3,
            "unit_price": 650.0,
            "quantity": 1,
            "discount_percent": 10.0,
            "pages_viewed": 8,
            "time_on_site_sec": 420,
            "visit_day": 15,
            "visit_month": 6,
            "visit_weekday": 2,
            "visit_season": 1,
            "location": 104,
            "rating": 4,
            "payment_method": 1
        }
        resp = requests.post(f"{base_url}/api/predict", json=payload)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.json()}")
        assert resp.status_code == 200
        assert "abandonment_probability" in resp.json()
        print("[OK] Test 3 Passed.")

        # Test 4: POST /api/optimize-discount
        print("\nTest 4: POST /api/optimize-discount")
        optim_payload = payload.copy()
        del optim_payload["discount_percent"] # Optimizer determines discount percent
        resp = requests.post(f"{base_url}/api/optimize-discount", json=optim_payload)
        print(f"Status Code: {resp.status_code}")
        print(f"Response (Optimal Discount): {resp.json().get('optimal_discount')}%")
        print(f"Revenue Lift: ${resp.json().get('revenue_lift'):.2f}")
        assert resp.status_code == 200
        assert "discount_matrix" in resp.json()
        print("[OK] Test 4 Passed.")

    except Exception as e:
        print(f"\nERROR: Integration Test Failed: {str(e)}")
        success = False
    finally:
        # Shut down backend server
        print("\nStopping FastAPI server...")
        server_process.terminate()
        server_process.wait()
        print("FastAPI server stopped.")
        
    if success:
        print("\n=== ALL BACKEND TESTS PASSED SUCCESSFULLY ===")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    test_backend()
