from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
import threading
import time
from datetime import datetime, timedelta
from pywebpush import webpush, WebPushException
from models import db, User, Schedule, Confirmation
from ocr.ocr_engine import extract_text
from rag.rag_engine import answer_question
from admin import admin_bp
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Explicitly allow Authorization header and all origins for development
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///med_assistant.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'med-assist-secret-99')
app.config['VAPID_PRIVATE_KEY'] = os.getenv('VAPID_PRIVATE_KEY')
app.config['VAPID_CLAIMS'] = {"sub": "mailto:admin@medassist.ai"}

db.init_app(app)
jwt = JWTManager(app)
app.register_blueprint(admin_bp, url_prefix='/admin')

# Ensure upload directory exists
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

with app.app_context():
    db.create_all()

# --- Push Notification Helper ---
def send_web_push(subscription_info, message_body):
    try:
        webpush(
            subscription_info=subscription_info,
            data=message_body,
            vapid_private_key=app.config['VAPID_PRIVATE_KEY'],
            vapid_claims=app.config['VAPID_CLAIMS']
        )
        return True
    except WebPushException as ex:
        print(f"Web Push Error: {ex}")
        return False

# --- Reminder Thread ---
def reminder_worker():
    with app.app_context():
        while True:
            try:
                now = datetime.now()
                current_time = now.strftime("%H:%M")
                current_day = now.strftime("%a")
                date_str = now.strftime("%Y-%m-%d")
                
                # Find all schedules matching current time and day
                schedules = Schedule.query.filter_by(time=current_time, is_active=True).all()
                
                for sch in schedules:
                    days = json.loads(sch.days) if sch.days else []
                    if current_day in days:
                        # Check if already notified for this user, schedule, time, date
                        exists = Confirmation.query.filter_by(
                            schedule_id=sch.id, 
                            scheduled_time=current_time, 
                            date_str=date_str
                        ).first()
                        
                        if not exists:
                            # Create confirmation record
                            conf = Confirmation(
                                user_id=sch.user_id,
                                schedule_id=sch.id,
                                medicine_name=sch.medicine_name,
                                scheduled_time=current_time,
                                date_str=date_str,
                                status="sent"
                            )
                            db.session.add(conf)
                            db.session.commit()
                            
                            # Send Push Notification
                            user = User.query.get(sch.user_id)
                            if user.push_subscription:
                                sub = json.loads(user.push_subscription)
                                payload = json.dumps({
                                    "title": f"💊 Time for {sch.medicine_name}",
                                    "body": f"It's {sch.time}. Please take your medicine.",
                                    "id": conf.id,
                                    "name": sch.medicine_name,
                                    "time": sch.time
                                })
                                send_web_push(sub, payload)
                
                # Handle Snoozed Reminders
                snoozed = Confirmation.query.filter_by(status="snoozed", date_str=date_str).all()
                for conf in snoozed:
                    if conf.snooze_until == current_time:
                        conf.status = "sent" # Reset to sent for new notification
                        db.session.commit()
                        
                        user = User.query.get(conf.user_id)
                        if user.push_subscription:
                            sub = json.loads(user.push_subscription)
                            payload = json.dumps({
                                "title": f"⏳ Snooze Ended: {conf.medicine_name}",
                                "body": f"Time to take your medication now!",
                                "id": conf.id,
                                "name": conf.medicine_name,
                                "time": conf.scheduled_time
                            })
                            send_web_push(sub, payload)
                            
            except Exception as e:
                print(f"Reminder Worker Error: {e}")
            
            time.sleep(40)

threading.Thread(target=reminder_worker, daemon=True).start()

# --- Auth Routes ---
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if User.query.filter_by(username=username).first():
        return jsonify({"message": "User already exists"}), 400
    
    hashed_pw = generate_password_hash(password)
    new_user = User(username=username, password_hash=hashed_pw)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": access_token}), 200
    
    return jsonify({"message": "Invalid credentials"}), 401

# --- User Routes ---
@app.route("/subscribe", methods=["POST"])
@jwt_required()
def subscribe():
    user_id = int(get_jwt_identity())
    subscription = request.json
    user = User.query.get(user_id)
    user.push_subscription = json.dumps(subscription)
    db.session.commit()
    return jsonify({"message": "Subscribed successfully"})

@app.route("/schedule", methods=["GET", "POST"])
@jwt_required()
def manage_schedule():
    user_id = int(get_jwt_identity())
    
    if request.method == "POST":
        data = request.json
        new_sch = Schedule(
            user_id=user_id,
            medicine_name=data.get("name"),
            time=data.get("time"),
            period=data.get("period"),
            days=json.dumps(data.get("days", []))
        )
        db.session.add(new_sch)
        db.session.commit()
        return jsonify({"message": "Scheduled successfully", "id": new_sch.id})
    
    schedules = Schedule.query.filter_by(user_id=user_id, is_active=True).all()
    return jsonify([s.to_dict() for s in schedules])

@app.route("/schedule/<int:sch_id>", methods=["PUT", "DELETE"])
@jwt_required()
def update_delete_schedule(sch_id):
    user_id = int(get_jwt_identity())
    sch = Schedule.query.filter_by(id=sch_id, user_id=user_id).first()
    
    if not sch:
        return jsonify({"message": "Schedule not found"}), 404
    
    if request.method == "DELETE":
        db.session.delete(sch)
        db.session.commit()
        return jsonify({"message": "Deleted successfully"})
    
    data = request.json
    sch.medicine_name = data.get("name", sch.medicine_name)
    sch.time = data.get("time", sch.time)
    sch.days = json.dumps(data.get("days", json.loads(sch.days)))
    db.session.commit()
    return jsonify({"message": "Updated successfully"})

@app.route("/confirm", methods=["POST"])
@jwt_required()
def confirm_medicine():
    data = request.json
    conf_id = data.get("confirmation_id")
    status = data.get("status") # taken, snoozed
    
    conf = Confirmation.query.get(conf_id)
    if not conf:
        return jsonify({"message": "Confirmation record not found"}), 404
        
    conf.status = status
    if status == "snoozed":
        minutes = data.get("minutes", 30)
        snooze_time = (datetime.now() + timedelta(minutes=minutes)).strftime("%H:%M")
        conf.snooze_until = snooze_time
        
    db.session.commit()
    return jsonify({"message": f"Medicine marked as {status}"})

@app.route("/ask", methods=["POST"])
@jwt_required()
def ask():
    data = request.json
    question = data.get("question")
    answer = answer_question(question)
    return jsonify({"answer": answer})

@app.route("/upload", methods=["POST"])
@jwt_required()
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    text = extract_text(filepath)
    
    # Simple extraction logic: Match OCR lines against the drug database names
    # or just return lines that look like medicine names.
    # For now, let's load the DB and find matches in the text.
    discovered_medicines = []
    try:
        from rag.rag_engine import load_drug_documents
        docs = load_drug_documents()
        lines = text.split('\n')
        
        # 1. First try matching against our RAG database (most accurate)
        db_names_lower = {name.lower(): name for name in docs.keys()}
        for line in lines:
            line_lower = line.lower()
            for db_name_lower, original_name in db_names_lower.items():
                if db_name_lower in line_lower:
                    if original_name.capitalize() not in discovered_medicines:
                        discovered_medicines.append(original_name.capitalize())
        
        # 2. Heuristic: If we still have few results, look for words that look like medicine names
        # (Usually 4+ letters, Title Case, not extremely common English words)
        common_words = {"prescription", "patient", "doctor", "medicine", "tablets", "capsules", "morning", "evening", "night", "daily", "every", "take"}
        if len(discovered_medicines) < 3:
            for line in lines:
                words = line.strip().split()
                for word in words:
                    # Clean the word
                    clean_word = "".join(filter(str.isalpha, word))
                    if len(clean_word) >= 4 and clean_word[0].isupper() and clean_word.lower() not in common_words:
                        cap_word = clean_word.capitalize()
                        if cap_word not in discovered_medicines:
                            discovered_medicines.append(cap_word)
    except Exception as e:
        print(f"Extraction error: {e}")

    print(f"DEBUG: Extracted text length: {len(text)}")
    print(f"DEBUG: Discovered medicines: {discovered_medicines}")

    return jsonify({
        "extracted_text": text,
        "medicines": discovered_medicines
    })

@app.route("/vapid-public-key", methods=["GET"])
def get_vapid_public_key():
    return jsonify({"publicKey": os.getenv('VAPID_PUBLIC_KEY')})

import os

if __name__ == "__main__":
    # Render provides the port in an environment variable called 'PORT'
    # We use 10000 as a backup default for Render
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
