#!/usr/bin/env python3
"""
TruthLens Backend Server Startup Script
Run this script to start the FastAPI backend server for TruthLens
"""

import subprocess
import sys
import os

def start_backend():
    """Start the TruthLens backend server"""
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    
    if not os.path.exists(backend_dir):
        print("❌ Backend directory not found!")
        print("Make sure you're running this script from the project root directory.")
        return False
    
    main_py = os.path.join(backend_dir, 'main.py')
    if not os.path.exists(main_py):
        print("❌ main.py not found in backend directory!")
        return False
    
    print("🚀 Starting TruthLens Backend Server...")
    print("📍 Backend will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔄 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        # Start the FastAPI server using uvicorn
        subprocess.run([
            sys.executable, '-m', 'uvicorn', 
            'main:app', 
            '--host', '0.0.0.0', 
            '--port', '8000', 
            '--reload'
        ], cwd=backend_dir)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        return True
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        print("\n💡 Make sure you have uvicorn installed:")
        print("   pip install uvicorn")
        return False

if __name__ == "__main__":
    start_backend()

