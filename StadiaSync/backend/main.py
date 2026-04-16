from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import os
import json
import base64
import uuid
from datetime import datetime
from typing import List
from supabase import create_client, Client
from dotenv import load_dotenv
import random
from contextlib import asynccontextmanager

# Load Environment Variables
load_dotenv()

# --- CONFIGURATION ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
#GEMINI_KEY = os.environ.get("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Supabase credentials missing from .env")
else:
    print("✅ Supabase credentials loaded")

# Initialize Global Clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# This will now work because 'google.generativeai' has the 'configure' attribute
#genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# --- MODELS ---
class LostItem(BaseModel):
    description: str
    category: str
    location: str
    user_id: str

class TicketRequest(BaseModel):
    ticket_id: str

class FoundItem(BaseModel):
    description: str

class ImageRequest(BaseModel):
    image_base64: str
    location: str
    reporter: str

# --- MODELS (MUST BE ABOVE ROUTES) ---

class NotificationRequest(BaseModel):
    sender: str
    content: str

class LostItemRequest(BaseModel):
    type: str 
    reporter: str
    title: str
    location: str
    desc: str

class TicketRequest(BaseModel):
    ticket_id: str

class FoundItem(BaseModel):
    description: str

class ImageRequest(BaseModel):
    image_base64: str
    location: str
    reporter: str

# --- ENDPOINTS ---

# --- TRAFFIC SIMULATOR (BACKGROUND TASK) ---
async def simulate_stadium_traffic():
    """
    Background loop that fluctuates stadium zone populations.
    This provides 'Constant Triggers' for Incentivized Routing.
    """
    print("[*] Stadium Traffic Simulator Active (Lifespan Task)")
    zones_to_pulse = ["C01", "C02", "W01", "W02"]
    
    while True:
        try:
            # Randomly fluctuate populations
            for zid in zones_to_pulse:
                # Random count between 20 and 150 for subtle churn
                new_count = random.randint(20, 150)
                
                # OCCASIONALLY FORCE A PEAK (To demo the 10% / 5% discounts)
                # Scenario: C01 becomes extremely crowded (>30 min wait)
                if zid == "C01" and random.random() < 0.3: # 30% chance for peak event
                    new_count = random.randint(550, 750) # Force > 30 min wait
                
                supabase.table("zones").update({"People_Count": new_count}).eq("Seat_ID", zid).execute()
            
            print(f"[*] Traffic Sync: Pulses sent to {len(zones_to_pulse)} zones.")
            await asyncio.sleep(60) # Pulse every 60 seconds
        except Exception as e:
            print(f"[-] Traffic Simulator encountered an error: {e}")
            await asyncio.sleep(10) # Wait before retry

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the traffic simulator in the background
    asyncio.create_task(simulate_stadium_traffic())
    yield
    # Shutdown logic (if any)

app = FastAPI(title="StadiaSync API", version="1.0.0", lifespan=lifespan)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/notifications")
async def get_notifications():
    # Fetch from Supabase notifications or return system default
    return {"notifications": [
        {"id": "msg_001", "sender": "Admin Command", "content": "Welcome to StadiaSync Secure Operations.", "timestamp": str(datetime.now())}
    ]}

@app.get("/api/lost-items")
async def get_lost_items():
    # REAL DATA: Fetch from Supabase instead of mock list
    response = supabase.table("lost_items").select("*").order("created_at", desc=True).execute()
    return {"items": response.data}

@app.post("/api/lost-items")
async def post_lost_item(item: LostItem):
    # REAL DATA: Insert into Supabase
    new_item = {
        "type": "customer_lost",
        "title": f"Lost {item.category}",
        "location": item.location,
        "description": item.description,
        "reporter_name": item.user_id,
        "status": "open"
    }
    response = supabase.table("lost_items").insert(new_item).execute()
    return {"status": "success", "data": response.data}


# --- ROUTES ---

@app.post("/api/notifications")
async def post_notification(req: NotificationRequest):
    # This will now work because NotificationRequest is defined above
    new_msg = {
        "id": str(uuid.uuid4()), 
        "sender": req.sender, 
        "content": req.content, 
        "timestamp": str(datetime.now())
    }
    # ... your logic to save/return
    return new_msg

@app.post("/api/routing/entry")
async def routing_entry(req: TicketRequest):
    # Fixed: Uses global supabase client
    response = supabase.table("events").select("*").limit(5).execute()
    events = response.data
    for event in events:
        if event.get("Gate_Status") in ["Closed", "Congested"]:
            bad_gate = event.get("Gate_ID", "Unknown")
            return {
                "instruction": f"Notice: {bad_gate} Gate is {event.get('Gate_Status')}. Redirecting to optimal gates.", 
                "status": "redirect"
            }
    return {"instruction": "Your entry gate is clear.", "status": "clear"}

# --- GEMINI NLP MATCHER ---
# @app.post("/api/lost-and-found/match")
# async def lost_and_found_match(item: FoundItem):
#     # REAL DATA: Pull actual lost items from DB to compare against
#     response = supabase.table("lost_items").select("id, description").eq("type", "customer_lost").execute()
#     db_items = [{"id": r["id"], "description": r["description"]} for r in response.data]
    
#     if not db_items:
#         return {"matches": []}

#     prompt = f"""You are a semantic matching engine. Compare the FOUND item to the LOST items list.
#     FOUND: "{item.description}"
#     LOST LIST: {json.dumps(db_items)}
#     Return JSON: {{ "matches": [ {{ "inquiry_id": "str", "match_score": 0.0, "matching_logic": "str" }} ] }}"""
    
    # try:
    #     model = genai.GenerativeModel('gemini-3-pro-preview')
    #     response = model.generate_content(prompt)
    #     # Clean potential markdown fences
    #     clean_text = response.text.replace("```json", "").replace("```", "").strip()
    #     return json.loads(clean_text)
    # except Exception as e:
    #     return {"matches": [], "error": str(e)}

@app.get("/")
def read_root(): return {"message": "StadiaSync API Active"}