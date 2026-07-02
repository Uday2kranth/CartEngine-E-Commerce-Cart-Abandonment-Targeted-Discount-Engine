import subprocess
import time
import sys
import os
import webbrowser

def check_and_install_dependencies():
    # Check Python dependencies
    required_packages = ["fastapi", "uvicorn", "pandas", "xgboost", "joblib", "sklearn", "google.generativeai"]
    missing_packages = []
    for pkg in required_packages:
        try:
            if pkg == "sklearn":
                import sklearn
            elif pkg == "google.generativeai":
                import google.generativeai
            else:
                __import__(pkg)
        except ImportError:
            missing_packages.append(pkg)
            
    if missing_packages:
        print(f"Missing Python packages: {', '.join(missing_packages)}")
        print("Installing dependencies from requirements.txt...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
            print("Successfully installed Python dependencies!")
        except Exception as e:
            print(f"Error installing Python dependencies: {str(e)}")
            print("Please run: pip install -r requirements.txt manually.")
            
    # Check Frontend node_modules
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    node_modules_dir = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_dir):
        print("Frontend node_modules not found. Installing npm dependencies...")
        try:
            subprocess.run(["npm", "install"], cwd=frontend_dir, shell=True if os.name == 'nt' else False, check=True)
            print("Successfully installed frontend dependencies!")
        except Exception as e:
            print(f"Error installing frontend dependencies: {str(e)}")
            print("Please run: npm install in the frontend directory manually.")

def run_all():
    print("====================================================")
    print("  STARTING CART ABANDONMENT & DISCOUNT ENGINE APP")
    print("====================================================")
    
    # 0. Check and install dependencies
    check_and_install_dependencies()
    
    # 1. Train the ML pipeline to ensure model is compatible with local Python version
    print("\nTraining ML models (main.py)...")
    try:
        subprocess.run([sys.executable, "main.py"], check=True)
        print("Model training completed successfully.")
    except Exception as e:
        print(f"Error running training pipeline: {str(e)}")
        sys.exit(1)
        
    # 2. Start backend FastAPI server
    print("\nStarting FastAPI Backend (Port 8001)...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "server.main:app", "--port", "8001", "--reload"]
    backend_process = subprocess.Popen(
        backend_cmd,
        stdout=sys.stdout,
        stderr=sys.stderr,
        shell=True if os.name == 'nt' else False
    )

    # Wait dynamically for backend to bind to port 8001 (prevents ECONNREFUSED proxy errors in Vite)
    print("Waiting for FastAPI backend to start and bind to port 8001...")
    backend_ready = False
    import socket
    start_time = time.time()
    while time.time() - start_time < 15:
        try:
            with socket.create_connection(("127.0.0.1", 8001), timeout=1):
                backend_ready = True
                break
        except (ConnectionRefusedError, socket.timeout):
            time.sleep(0.5)

    if backend_ready:
        print("FastAPI backend is ready!")
    else:
        print("FastAPI backend is taking longer than expected to start. Proceeding anyway...")

    # 3. Start frontend dev server
    print("\nStarting React + Vite Frontend (Port 5173)...")
    frontend_cmd = ["npm", "run", "dev"]
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    
    frontend_process = subprocess.Popen(
        frontend_cmd,
        cwd=frontend_dir,
        stdout=sys.stdout,
        stderr=sys.stderr,
        shell=True if os.name == 'nt' else False
    )

    print("\nApplication processes launched successfully!")
    print("- Frontend running at: http://localhost:5173")
    print("- Backend running at:  http://127.0.0.1:8001")
    print("- OpenAPI Swagger docs: http://127.0.0.1:8001/docs")
    
    # Wait a moment for Vite dev server to compile and start listening
    time.sleep(2)
    print("\nOpening web browser...")
    try:
        webbrowser.open("http://localhost:5173")
    except Exception as e:
        print(f"Could not open browser automatically: {str(e)}")
        
    print("Press Ctrl+C to terminate both servers.\n")

    try:
        # Keep main thread alive monitoring both processes
        while True:
            if backend_process.poll() is not None:
                print("Backend process terminated. Exiting...")
                break
            if frontend_process.poll() is not None:
                print("Frontend process terminated. Exiting...")
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down servers...")
    finally:
        # Gracefully terminate subprocesses
        backend_process.terminate()
        frontend_process.terminate()
        
        backend_process.wait()
        frontend_process.wait()
        print("Both servers stopped successfully.")

if __name__ == "__main__":
    run_all()
