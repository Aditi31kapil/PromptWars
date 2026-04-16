import json
import random
import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud import firestore
from google.oauth2 import service_account

def generate_mock_data():
    nodes = [{"id": f"node_{i}", "label": f"Gate {i}", "type": "gate"} for i in range(1, 6)]
    transactions = [f"tx_{i:05d}" for i in range(1, 10001)]
    
    stalls = []
    for i in range(1, 21):
        stalls.append({
            "id": f"stall_{i}",
            "name": f"Food Stall {i}",
            "queue_count": random.randint(0, 15),
            "capacity": 20
        })
        
    staff = []
    for i in range(1, 51):
        staff.append({
            "id": f"staff_{i}",
            "name": f"Staff User {i}",
            "role": random.choice(["security", "usher", "medic"]),
            "status": "active"
        })
        
    return {
        "nodes": nodes,
        "transactions": transactions,
        "stalls": stalls,
        "staff": staff
    }

def main():
    # 1. Setup Firebase Credentials
    # Replace 'service-account-key.json' with whatever you named your file
    key_path = "key.json" 

    if not os.path.exists(key_path):
        print(f"Error: {key_path} not found! Did you forget to download it?")
        return

    print("Initializing Firebase...")
    credentials = service_account.Credentials.from_service_account_file(key_path)
    db = firestore.Client(project="stadiasync-24afa", credentials=credentials)

    # 2. Generate Data
    print("Generating dummy data locally...")
    data = generate_mock_data()
    
    # Save locally as backup
    output_path = os.path.join(os.path.dirname(__file__), "dummy_data.json")
    with open(output_path, "w") as f:
        json.dump(data, f, indent=4)
    
    # 3. Populate Firestore
    print("Populating nodes...")
    for node in data["nodes"]:
        db.collection("nodes").document(node["id"]).set(node)
    
    print("Populating stalls...")
    for stall in data["stalls"]:
        db.collection("stalls").document(stall["id"]).set(stall)
    
    print("Firestore populated successfully!")

if __name__ == "__main__":
    main()