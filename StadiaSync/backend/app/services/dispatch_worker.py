import asyncio
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

async def run_dispatch_check(supabase: Client):
    try:
        # Fetch events
        res_events = supabase.table("events").select("Event_ID, Total_Attendance").limit(10).execute()
        events = res_events.data
        if not events:
            return

        # Fetch zones
        res_zones = supabase.table("zones").select("Seat_ID, People_Count").limit(10).execute()
        zones = res_zones.data
        
        if not zones:
            return
            
        for event in events:
            total_att = float(event.get("Total_Attendance", 0))
            if total_att == 0:
                continue
            
            for zone in zones:
                zone_occupancy = float(zone.get("People_Count", 0))
                # Logic condition: zone has > 30% total attendance and staff < 10%
                # In mock dataset we trigger it if zone gets above threshold
                if total_att > 0 and (zone_occupancy / total_att) > 0.05: # Using 5% for testing visual
                    logger.info(f"Triggering Dispatch Reallocation! Zone {zone.get('Seat_ID')} is crowded.")
                    # Setting the explicit alert in Supabase
                    supabase.table("events").update({"Alerts": f"Suggested Staff Reallocation to {zone.get('Seat_ID')}"}).eq("Event_ID", event.get("Event_ID")).execute()
                    break 
    except Exception as e:
        logger.error(f"Dispatch Worker Error: {e}")

async def dispatch_worker_loop(supabase_url: str, supabase_key: str):
    if not supabase_url or not supabase_key:
        logger.error("Dispatch Worker missing Supabase keys.")
        return
        
    supabase: Client = create_client(supabase_url, supabase_key)
    while True:
        await run_dispatch_check(supabase)
        await asyncio.sleep(20) # Runs every 20 seconds
