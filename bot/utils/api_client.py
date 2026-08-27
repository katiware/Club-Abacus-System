import requests
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000/api")

def get_budget(user_id=None):
    """
    Fetch budget info from the backend.
    """
    # Example endpoint: GET /api/budget
    # In a real scenario, you'd handle authentication here (e.g. API keys for the bot)
    try:
        # Mocking for now
        # total: 125000, pending: 15000, approved: 10000, completed: 20000
        # spent = pending + approved + completed = 45000
        # remaining = total - spent = 80000
        return {
            "total": 125000,
            "pending": 15000,
            "approved": 10000,
            "completed": 20000,
            "spent": 45000,
            "remaining": 80000
        }
    except Exception as e:
        print(f"API Error: {e}")
        return None

def get_history(user_id=None):
    """
    Fetch application history.
    """
    try:
        # Mocking for now
        return [
            {"id": 1, "item": "事務用品", "amount": 1500, "status": "APPROVED"},
            {"id": 2, "item": "懇親会費用", "amount": 20000, "status": "PENDING_APPROVAL"}
        ]
    except Exception as e:
        print(f"API Error: {e}")
        return None
