import json
import random
import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def generate_base_entities():
    # Generating transactions (ticket IDs) for login
    transactions = [{"ticket_id": f"tx_{i:05d}", "status": "valid"} for i in range(1, 10001)]
    
    # Generating mock staff with locations
    staff = []
    for i in range(1, 51):
        staff.append({
            "id": f"staff_{i}",
            "name": f"Volunteer {i}",
            "role": random.choice(["security", "usher", "medic"]),
            "status": "active",
            "current_zone": "gate_1"
        })
    return {"transactions": transactions, "staff": staff}

def chunked_insert(supabase, table_name, data, chunk_size=1000):
    """Helper function to upload data in smaller batches"""
    for i in range(0, len(data), chunk_size):
        batch = data[i:i + chunk_size]
        supabase.table(table_name).upsert(batch).execute()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("Error: Supabase environment variables missing.")
        return

    print("Initializing Database...")
    supabase: Client = create_client(url, key)

    # 1. Base Entities
    print("Generating base entities...")
    base_data = generate_base_entities()
    chunked_insert(supabase, "tickets", base_data["transactions"])
    chunked_insert(supabase, "staff", base_data["staff"])

    # --- 2. Ingest Seat Clusters ---
    cluster_path = os.path.join("dataset", "seat_clusters.csv")
    if os.path.exists(cluster_path):
        print("Ingesting Seat Clusters...")
        df_clusters = pd.read_csv(cluster_path)
        
        # FIX: Remove duplicate Seat_IDs before processing
        df_clusters = df_clusters.drop_duplicates(subset=['Seat_ID'])
        
        clusters_data = df_clusters[[
            'Seat_ID', 'Zone_Capacity', 'Seat_Occupancy_Prob', 'Seat_X', 'Seat_Y', 'People_Count'
        ]].to_dict(orient='records')
        chunked_insert(supabase, "zones", clusters_data)
        print(f"Loaded {len(clusters_data)} unique zones.")

    # --- 3. Ingest Movement Edges ---
    edges_path = os.path.join("dataset", "movement_edges.csv")
    if os.path.exists(edges_path):
        print("Ingesting Movement Edges...")
        df_edges = pd.read_csv(edges_path)
        
        # FIX: Remove duplicate pathways (Source + Target combo)
        df_edges = df_edges.drop_duplicates(subset=['Source_Seat', 'Target_Seat'])
        
        edges_data = df_edges[[
            'Source_Seat', 'Target_Seat', 'Flow_Capacity', 'Congestion_Level'
        ]].to_dict(orient='records')
        chunked_insert(supabase, "pathways", edges_data)
        print(f"Loaded {len(edges_data)} unique pathways.")

    # --- 3. Ingest Movement Edges ---
    edges_path = os.path.join("dataset", "movement_edges.csv")
    if os.path.exists(edges_path):
        print("Ingesting Movement Edges...")
        df_edges = pd.read_csv(edges_path)
        
        # 1. Drop rows where source or target is missing
        df_edges = df_edges.dropna(subset=['Source_Seat', 'Target_Seat'])
        
        # 2. STRICT De-duplication: Ensure Source+Target combo is unique
        # This keeps the FIRST occurrence and removes others
        df_edges = df_edges.drop_duplicates(subset=['Source_Seat', 'Target_Seat'], keep='first')
        
        edges_data = df_edges[[
            'Source_Seat', 'Target_Seat', 'Flow_Capacity', 'Congestion_Level'
        ]].to_dict(orient='records')
        
        # 3. Smaller batch size for pathways to be extra safe
        chunked_insert(supabase, "pathways", edges_data, chunk_size=500)
        print(f"Loaded {len(edges_data)} unique pathways.")

    # # --- 4. Ingest Event Metadata (Predictive Layer) ---
    meta_path = os.path.join("dataset", "event_metadata.csv")
    if os.path.exists(meta_path):
        print("Ingesting Event Metadata...")
        df_events = pd.read_csv(meta_path)
        
        # 1. Map columns to match your actual CSV headers
        # We also use .copy() to avoid SettingWithCopyWarnings
        events_data_df = df_events[[
            'Event_ID', 'Gate_Status', 'Total_Attendance', 'Staff_On_Duty', 'Alerts'
        ]].copy()

        # 2. THE FIX: Replace NaN values
        # This replaces any empty cell with an empty string or 0 so JSON doesn't crash
        events_data_df = events_data_df.fillna({
            'Event_ID': 'unknown',
            'Gate_Status': 'closed',
            'Total_Attendance': 0,
            'Staff_On_Duty': 0,
            'Alerts': 'None'
        })

        events_data = events_data_df.to_dict(orient='records')
        
        # 3. Clean duplicates for Event_ID to avoid the previous 21000 error
        unique_events = {v['Event_ID']: v for v in events_data}.values()
        
        chunked_insert(supabase, "events", list(unique_events))
        print(f"Loaded {len(unique_events)} unique event records.")
    print("Database populated successfully!")

if __name__ == "__main__":
    main()