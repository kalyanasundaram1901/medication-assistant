from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Push notification subscription info (stored as JSON string)
    push_subscription = db.Column(db.Text, nullable=True)
    
    schedules = db.relationship('Schedule', backref='user', lazy=True)

class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    medicine_name = db.Column(db.String(100), nullable=False)
    time = db.Column(db.String(5), nullable=False) # HH:MM
    period = db.Column(db.String(20), nullable=True) # Morning, Afternoon, Night
    days = db.Column(db.String(200), nullable=False) # Store as JSON string: ["Mon", "Tue"]
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.medicine_name,
            "time": self.time,
            "period": self.period,
            "days": json.loads(self.days) if self.days else []
        }

class Confirmation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    medicine_name = db.Column(db.String(100), nullable=False)
    scheduled_time = db.Column(db.String(5), nullable=False)
    date_str = db.Column(db.String(10), nullable=False) # YYYY-MM-DD
    status = db.Column(db.String(20), default="sent") # sent, taken, snoozed
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    snooze_until = db.Column(db.String(5), nullable=True)
