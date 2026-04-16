import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Add backend directory to sys path so we can resolve app package if we needed
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', 'app', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("FAILED: Supabase credentials missing in backend/app/.env")
    sys.exit(1)

supabase: Client = create_client(url, key)

dummy_data = [
    {
        "type": "customer_lost",
        "title": "Lost Wallet (Brown Leather)",
        "location": "Sector 4 Concourse",
        "description": "Fell out of my pocket while buying food. Distinct metal badge on the front.",
        "reporter_name": "Patron TX_019",
        "status": "open"
    },
    {
        "type": "customer_lost",
        "title": "Missing iPhone 14 Pro",
        "location": "Washroom West",
        "description": "Has a clear case and a sticker of a dog on the back. Urgent!",
        "reporter_name": "Patron TX_442",
        "status": "open"
    },
    {
        "type": "customer_lost",
        "title": "Red Team Scarf",
        "location": "Gate North",
        "description": "Knitted scarf, left it by the scanning terminal during entry.",
        "reporter_name": "Patron TX_003",
        "status": "open"
    },
    {
        "type": "volunteer_found",
        "title": "Found Car Keys",
        "location": "Gate North",
        "description": "Honda car keys with a blue lanyard and a small flashlight attached.",
        "reporter_name": "Guard Unit 7",
        "status": "open"
    },
    {
        "type": "volunteer_found",
        "title": "Abandoned Backpack",
        "location": "Food Stall East",
        "description": "Black Nike backpack, smells like spilled soda. Confiscated for safety.",
        "reporter_name": "Security Chief 1",
        "status": "open"
    }
]

try:
    print("Flushing existing lost_items data...")
    # Using a broad delete to clear dummy data cleanly. Note: Supabase Python currently requires eq or something. 
    # To delete all: eq('status', 'open') or neq('id', null)
    res = supabase.table("lost_items").delete().neq('status', 'invalid').execute()
    
    print("Inserting 5 dummy intelligence records...")
    res = supabase.table("lost_items").insert(dummy_data).execute()
    print("SUCCESS: Items populated successfully directly to remote DB.")
except Exception as e:
    print(f"Error during population: {e}")
