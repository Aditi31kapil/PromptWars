import os
from dotenv import load_dotenv

# Try to load root env
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

class Settings:
    PROJECT_ID = os.getenv("GCP_PROJECT_ID", "stadiasync-dev")
    REGION = os.getenv("GCP_REGION", "asia-south1")
    STRIPE_API_KEY = os.getenv("STRIPE_API_KEY", "sk_test_placeholder")
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

settings = Settings()
