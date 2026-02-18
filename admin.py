from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required
import pandas as pd
import os

admin_bp = Blueprint('admin', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(BASE_DIR, "drug_database", "medicine_database.xlsx")

# Admin credentials (simple for now as requested)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        access_token = create_access_token(identity="admin")
        return jsonify({"token": access_token}), 200
    
    return jsonify({"message": "Invalid admin credentials"}), 401

@admin_bp.route("/medicines", methods=["GET"])
@jwt_required()
def get_medicines():
    if not os.path.exists(EXCEL_PATH):
        return jsonify([])
    
    try:
        df = pd.read_excel(EXCEL_PATH)
        # Convert to list of dicts, handle NaN values
        medicines = df.fillna("").to_dict(orient="records")
        return jsonify(medicines)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/add-medicine", methods=["POST"])
@jwt_required()
def add_medicine():
    data = request.json
    try:
        if not os.path.exists(EXCEL_PATH):
            df = pd.DataFrame(columns=["Name", "Used for", "How it works", "Common side effects", "Notes"])
        else:
            df = pd.read_excel(EXCEL_PATH)
        
        new_row = {
            "Name": data.get("name"),
            "Used for": data.get("used_for"),
            "How it works": data.get("how_it_works"),
            "Common side effects": data.get("side_effects"),
            "Notes": data.get("notes")
        }
        
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        df.to_excel(EXCEL_PATH, index=False)
        return jsonify({"message": "Medicine added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
