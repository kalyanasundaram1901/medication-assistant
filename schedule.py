import uuid
import json
import os

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schedule_db.json")

def load_data():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_data(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

medicine_schedule = load_data()

def add_schedule(name, time, days=None):
    global medicine_schedule
    item = {
        "id": str(uuid.uuid4()),
        "name": name,
        "time": time,
        "days": days if days else ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    }
    medicine_schedule.append(item)
    save_data(medicine_schedule)
    return item

def get_schedules():
    return medicine_schedule

def update_schedule(item_id, name, time, days=None):
    global medicine_schedule
    for item in medicine_schedule:
        if item["id"] == str(item_id):
            item["name"] = name
            item["time"] = time
            if days:
                item["days"] = days
            save_data(medicine_schedule)
            return item
    return None

def delete_schedule(item_id):
    global medicine_schedule
    medicine_schedule = [item for item in medicine_schedule if item["id"] != str(item_id)]
    save_data(medicine_schedule)
