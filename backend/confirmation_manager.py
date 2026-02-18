import json
import os
from datetime import datetime, timedelta

CONFIRM_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "confirmations.json")

def load_confirmations():
    if os.path.exists(CONFIRM_FILE):
        try:
            with open(CONFIRM_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_confirmations(data):
    with open(CONFIRM_FILE, "w") as f:
        json.dump(data, f, indent=4)

def record_sent(medicine_id, medicine_name, scheduled_time, date_str):
    data = load_confirmations()
    if date_str not in data:
        data[date_str] = {}
    
    key = f"{medicine_id}_{scheduled_time}"
    if key not in data[date_str]:
        data[date_str][key] = {
            "name": medicine_name,
            "status": "sent",
            "sent_at": datetime.now().isoformat()
        }
        save_confirmations(data)

def mark_taken(medicine_id, scheduled_time, date_str):
    data = load_confirmations()
    if date_str not in data:
        data[date_str] = {}
    
    key = f"{medicine_id}_{scheduled_time}"
    if key not in data[date_str]:
        data[date_str][key] = {}
        
    data[date_str][key].update({
        "status": "taken",
        "taken_at": datetime.now().isoformat()
    })
    save_confirmations(data)

def mark_snoozed(medicine_id, scheduled_time, date_str, snooze_minutes=30):
    data = load_confirmations()
    if date_str not in data:
        data[date_str] = {}
    
    key = f"{medicine_id}_{scheduled_time}"
    if key not in data[date_str]:
        data[date_str][key] = {}
        
    snooze_until = (datetime.now() + timedelta(minutes=snooze_minutes)).strftime("%H:%M")
    data[date_str][key].update({
        "status": "snoozed",
        "snooze_until": snooze_until,
        "snoozed_at": datetime.now().isoformat()
    })
    save_confirmations(data)

def get_status(medicine_id, scheduled_time, date_str):
    data = load_confirmations()
    key = f"{medicine_id}_{scheduled_time}"
    return data.get(date_str, {}).get(key)

def get_pending_confirmations(date_str):
    data = load_confirmations()
    day_data = data.get(date_str, {})
    return {k: v for k, v in day_data.items() if v.get("status") == "sent"}

def get_snoozed_confirmations(date_str):
    data = load_confirmations()
    day_data = data.get(date_str, {})
    return {k: v for k, v in day_data.items() if v.get("status") == "snoozed"}
