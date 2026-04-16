import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Supabase credentials missing from .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

dummy_items = [
    {
        "type": "customer_lost",
        "title": "Black Leather Wallet",
        "location": "North Concourse near Stall C01",
        "description": "Contains driving license and stadium pass. Distinctive silver buckle.",
        "reporter_name": "Patron_402",
        "status": "lost"
    },
    {
        "type": "customer_lost",
        "title": "iPhone 13 (Clear Case)",
        "location": "Sector G Washroom",
        "description": "Lock screen has a picture of a dog. Battery was around 15%.",
        "reporter_name": "Patron_119",
        "status": "lost"
    },
    {
        "type": "customer_lost",
        "title": "Nike Cap (Blue)",
        "location": "Aisle 12 Row F",
        "description": "Nearly new, has 'NYC' written on the side in white.",
        "reporter_name": "Patron_293",
        "status": "lost"
    },
    {
        "type": "customer_lost",
        "title": "Car Keys (Audi)",
        "location": "Food Stall 2 (C02) Area",
        "description": "Attached to a red keychain. 3 buttons.",
        "reporter_name": "Patron_005",
        "status": "lost"
    },
    {
        "type": "customer_lost",
        "title": "Spectacles (Gold Frame)",
        "location": "Main Entrance Stairs",
        "description": "Prada brand, left in a black case.",
        "reporter_name": "Patron_882",
        "status": "lost"
    }
]

def seed_data():
    print(f"[*] Seeding {len(dummy_items)} dummy lost items...")
    try:
        res = supabase.table("lost_items").insert(dummy_items).execute()
        print(f"[+] Successfully seeded items.")
    except Exception as e:
        print(f"[-] Error seeding items: {e}")

if __name__ == "__main__":
    seed_data()
