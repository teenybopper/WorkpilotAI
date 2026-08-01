import uvicorn
from app.main import app

def main():
    """Launch FastAPI backend server on 127.0.0.1:8000."""
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    main()

