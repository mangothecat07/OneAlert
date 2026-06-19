import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, Dict, Optional
from collections import defaultdict
import time
import json
import urllib.request
import hashlib
import uuid
import math
import httpx
import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.fernet import Fernet
import textwrap
from twilio.rest import Client
import mimetypes

# Load .env from backend directory
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / ".env")


from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    status,
    WebSocket,
    WebSocketDisconnect
)
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
import motor.motor_asyncio

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.backend.auth import (
    LoginRequest,
    authenticate_user,
    create_access_token,
    verify_data_token,
    verify_entry_token,
)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

ROOT_DIR = Path(__file__).parent

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield

app = FastAPI(title="OneAlert API", lifespan=lifespan)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"\n--- 422 VALIDATION ERROR ---")
    print(f"URL: {request.url}")
    print(f"Errors: {exc.errors()}")
    print(f"Body: {exc.body}\n----------------------------\n")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

public_router = APIRouter()

import os

# --- MONGODB OR LOCAL JSON FALLBACK CONFIG ---
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://127.0.0.1:27017"
INCIDENTS_JSON_PATH = os.path.join(os.path.dirname(__file__), "alerts", "incidents.json")

# OpenRouter key for AI features (FIR drafting etc.)
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

class DatabaseManager:
    def __init__(self, uri):
        self.mongo_uri = uri
        self.use_mongo = True
        self.client = None
        self.collection = None
        self.contacts_collection = None
        self.malicious_links_collection = None
        self.local_data = []
        self.local_contacts = []

    async def connect(self):
        try:
            self.client = AsyncIOMotorClient(self.mongo_uri, serverSelectionTimeoutMS=2000)
            await self.client.admin.command('ping')
            self.collection = self.client.onealert.incidents
            self.contacts_collection = self.client.onealert.contacts
            self.malicious_links_collection = self.client.onealert.malicious_links
            self.use_mongo = True
            print("[\033[92mOK\033[0m] Connected to MongoDB!")
        except Exception as e:
            print(f"[\033[93mWARN\033[0m] MongoDB unavailable. Falling back to local JSON file! Error: {e}")
            self.use_mongo = False
            self.load_local_data()

    def load_local_data(self):
        if os.path.exists(INCIDENTS_JSON_PATH):
            try:
                with open(INCIDENTS_JSON_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.local_data = data.get("incidents", [])
            except Exception as e:
                print(f"Error loading local json: {e}")
                self.local_data = []
        else:
            self.local_data = []
            
        CONTACTS_JSON_PATH = os.path.join(os.path.dirname(__file__), "alerts", "contacts.json")
        if os.path.exists(CONTACTS_JSON_PATH):
            try:
                with open(CONTACTS_JSON_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.local_contacts = data.get("contacts", [])
            except Exception as e:
                print(f"Error loading local contacts json: {e}")
                self.local_contacts = []
        else:
            self.local_contacts = []

    def save_local_data(self):
        os.makedirs(os.path.dirname(INCIDENTS_JSON_PATH), exist_ok=True)
        try:
            with open(INCIDENTS_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump({"incidents": self.local_data}, f, indent=4)
        except Exception as e:
            print(f"Error saving local json: {e}")
            
    def save_local_contacts(self):
        CONTACTS_JSON_PATH = os.path.join(os.path.dirname(__file__), "alerts", "contacts.json")
        os.makedirs(os.path.dirname(CONTACTS_JSON_PATH), exist_ok=True)
        try:
            with open(CONTACTS_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump({"contacts": self.local_contacts}, f, indent=4)
        except Exception as e:
            print(f"Error saving contacts json: {e}")

    async def get_all_contacts(self):
        if self.use_mongo:
            cursor = self.contacts_collection.find({}, {"_id": 0})
            return await cursor.to_list(length=None)
        else:
            return self.local_contacts
            
    async def set_all_contacts(self, contacts_list):
        if self.use_mongo:
            await self.contacts_collection.delete_many({})
            if contacts_list:
                await self.contacts_collection.insert_many(contacts_list)
        else:
            self.local_contacts = contacts_list
            self.save_local_contacts()

    async def count_active(self):
        if self.use_mongo:
            return await self.collection.count_documents({"status": {"$ne": "resolved"}})
        else:
            return sum(1 for inc in self.local_data if inc.get("status") != "resolved")

    async def get_user_incidents(self, user_id):
        if self.use_mongo:
            cursor = self.collection.find({"user.user_id": user_id}, {"_id": 0}).sort("timestamp", -1)
            return await cursor.to_list(length=None)
        else:
            res = [inc for inc in self.local_data if inc.get("user", {}).get("user_id") == user_id]
            res.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return res

    async def get_all_incidents(self):
        if self.use_mongo:
            cursor = self.collection.find({}, {"_id": 0}).sort("timestamp", -1)
            return await cursor.to_list(length=None)
        else:
            res = list(self.local_data)
            res.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return res

    async def get_incident(self, incident_id):
        if self.use_mongo:
            return await self.collection.find_one({"id": incident_id}, {"_id": 0})
        else:
            for inc in self.local_data:
                if inc.get("id") == incident_id:
                    return inc
            return None

    async def update_incident(self, incident_id, incident_dict):
        if self.use_mongo:
            await self.collection.replace_one({"id": incident_id}, incident_dict)
        else:
            for i, inc in enumerate(self.local_data):
                if inc.get("id") == incident_id:
                    self.local_data[i] = incident_dict
                    break
            self.save_local_data()

    async def upsert_incident(self, incident_id, incident_dict):
        if self.use_mongo:
            await self.collection.replace_one({"id": incident_id}, incident_dict, upsert=True)
        else:
            found = False
            for i, inc in enumerate(self.local_data):
                if inc.get("id") == incident_id:
                    self.local_data[i] = incident_dict
                    found = True
                    break
            if not found:
                self.local_data.append(incident_dict)
            self.save_local_data()

db = DatabaseManager(MONGO_URI)

# --- WEBSOCKET CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = defaultdict(list)
        self.dashboard_connections: List[WebSocket] = []

    async def connect_incident(self, websocket: WebSocket, incident_id: str):
        await websocket.accept()
        self.active_connections[incident_id].append(websocket)

    def disconnect_incident(self, websocket: WebSocket, incident_id: str):
        if websocket in self.active_connections.get(incident_id, []):
            self.active_connections[incident_id].remove(websocket)

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.dashboard_connections.append(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        if websocket in self.dashboard_connections:
            self.dashboard_connections.remove(websocket)

    async def broadcast_incident(self, incident_id: str, payload: dict):
        dead = []
        for connection in self.active_connections.get(incident_id, []):
            try:
                await connection.send_json(payload)
            except Exception:
                dead.append(connection)
        for c in dead:
            self.disconnect_incident(c, incident_id)

        dead_dash = []
        for connection in self.dashboard_connections:
            try:
                await connection.send_json({"type": "incident_update", "incident": payload})
            except Exception:
                dead_dash.append(connection)
        for c in dead_dash:
            self.disconnect_dashboard(c)

manager = ConnectionManager()


# --- CORS ---
origins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://10.160.227.68:5173",
    "http://10.160.227.68:8080",
    "capacitor://localhost",
    "http://localhost",
    "https://onealert.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security"]
)

# --- CSP MIDDLEWARE ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        
        is_https = (
            request.headers.get("x-forwarded-proto") == "https"
            or request.url.scheme == "https"
        )
        
        # Allowed connect sources (API, WS, known dev origins)
        connect_src = " ".join([
            "'self'",
            "ws://localhost:8082",
            "wss://localhost:8082",
            "http://localhost:8082",
            "https://onealert.vercel.app",
            "capacitor://localhost",
        ])
        
        csp_parts = [
            "default-src 'self'",
            # Allow scripts from self only — no inline scripts, no eval
            "script-src 'self'",
            # Allow styles from self + inline (needed for CSS-in-JS)
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            f"connect-src {connect_src}",
            # Block <object>, <embed>, <applet>
            "object-src 'none'",
            # Block framing (clickjacking)
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        
        response.headers["Content-Security-Policy"] = "; ".join(csp_parts)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(self), camera=()"
        
        if is_https:
            # HSTS: enforce HTTPS for 1 year, include subdomains
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

# CSP must be added AFTER CORS (outermost middleware runs last)
app.add_middleware(SecurityHeadersMiddleware)

ALERTS_DIR = ROOT_DIR / "alerts"
ALERTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/alerts", StaticFiles(directory=str(ALERTS_DIR)), name="alerts")

@app.get("/")
@app.head("/")
async def root():
    return {"status": "online", "service": "OneAlert API"}

# --- AUTHENTICATION ---
login_attempts = defaultdict(list)

def is_rate_limited(ip: str) -> bool:
    now = time.time()
    attempts = login_attempts[ip]
    attempts = [t for t in attempts if now - t < 60]
    login_attempts[ip] = attempts
    attempts.append(now)
    if len(attempts) > 10: 
        return True
    return False

@app.post("/api/auth/login")
async def login(
    login_data: LoginRequest,
    response: Response,
    request: Request,
):
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    if is_rate_limited(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
        )

    user_info = authenticate_user(login_data.username, login_data.password)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
        )

    role = user_info["role"]
    scope = user_info["scope"]
    access_token = create_access_token(
        data={"sub": login_data.username, "role": role, "scope": scope}
    )

    is_https = (
        request.headers.get("x-forwarded-proto") == "https"
        or request.url.scheme == "https"
    )

    if is_https:
        response.set_cookie(
            key="entry_jwt",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
        )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "scope": scope,
        "is_local": not is_https,
    }


@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    for samesite_val in ["none", "lax", "strict"]:
        for secure_val in [True, False]:
            response.delete_cookie(
                "entry_jwt",
                path="/",
                httponly=True,
                secure=secure_val,
                samesite=samesite_val,  # type: ignore
            )
    return {"status": "ok"}


@app.get("/api/auth/me")
async def get_current_user(user: dict = Depends(verify_entry_token)):
    return {"role": user["role"], "scope": user["scope"], "username": user.get("sub")}


# --- API ROUTERS ---
dashboard_router = APIRouter(prefix="/api/dashboard", dependencies=[Depends(verify_data_token)])
public_router = APIRouter(prefix="/api")

# --- ONEALERT MODELS ---
class DashboardStats(BaseModel):
    active_incidents: int
    resolved_today: int
    active_users: int

class UserInfo(BaseModel):
    user_id: str
    name: str
    phone: str
    emergency_contacts_notified: bool

class Location(BaseModel):
    lat: float
    lng: float
    accuracy: float
    address: Optional[str] = None
    is_live_tracking: bool = False

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    accuracy: float
    timestamp: str
    address: Optional[str] = None
    is_duplicate: Optional[bool] = False

class Victim(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    contact: Optional[str] = None
    relation_to_suspect: Optional[str] = None

class CyberDetails(BaseModel):
    crime_category: Optional[str] = None
    description: Optional[str] = None
    suspects: List[Any] = []
    victims: List[Victim] = []          # NEW: victim details
    reporter_details: Optional[str] = None  # moved here for completeness

class EvidenceAccessLog(BaseModel):
    username: str
    timestamp: str

class Evidence(BaseModel):
    evidence_id: str
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    sha256_hash: str
    is_sensitive: bool = False
    uploaded_at: str
    access_logs: List[EvidenceAccessLog] = []

class ThreatScanRequest(BaseModel):
    type: str  # "url", "text", "profile"
    payload: str

class ThreatScanResponse(BaseModel):
    is_malicious: bool
    score: int
    flags: List[str]
    recommendations: List[str]
    cached: bool = False

class AiAnalysis(BaseModel):
    threat_score: Optional[int] = None
    flags: List[str] = []

class Comment(BaseModel):
    text: str
    timestamp: str
    source: str

class StatusUpdate(BaseModel):
    status: str
    description: str
    timestamp: str
    source: str = "police"

class Incident(BaseModel):
    id: str
    type: str # "physical_sos", "cyber_report", "hybrid"
    trigger_type: str # "voice", "button", "silent_panic", "manual_form"
    status: str # "active", "dispatching", "investigating", "resolved"
    severity: str # "low", "medium", "high", "critical"
    timestamp: str
    last_updated: str
    incident_password: Optional[str] = None
    
    user: Optional[UserInfo] = None
    location: Optional[Location] = None
    cyber_details: Optional[CyberDetails] = None
    evidence: List[Evidence] = []
    ai_analysis: Optional[AiAnalysis] = None
    status_history: List[StatusUpdate] = []
    comments: List[Comment] = []
    location_history: List[LocationUpdate] = []

class IncidentsResponse(BaseModel):
    incidents: List[Incident]
    critical_count: int

class Contact(BaseModel):
    id: str
    name: str
    phone: str
    relationship: str

class ContactsResponse(BaseModel):
    contacts: List[Contact]

# --- WEBSOCKETS ---
@public_router.websocket("/ws/incident/{incident_id}")
async def websocket_incident(websocket: WebSocket, incident_id: str):
    await manager.connect_incident(websocket, incident_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_incident(websocket, incident_id)

@public_router.websocket("/dashboard/ws")
async def websocket_dashboard(websocket: WebSocket):
    await manager.connect_dashboard(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_dashboard(websocket)


# --- CRYPTOGRAPHY ---
def get_fernet_for_password(password: str) -> Fernet:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'static_salt_1234_onealert',
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return Fernet(key)

def encrypt_file(file_path: str, password: str):
    f = get_fernet_for_password(password)
    with open(file_path, 'rb') as file:
        file_data = file.read()
    encrypted_data = f.encrypt(file_data)
    with open(file_path, 'wb') as file:
        file.write(encrypted_data)

def decrypt_file(file_path: str, password: str) -> bytes:
    f = get_fernet_for_password(password)
    with open(file_path, 'rb') as file:
        encrypted_data = file.read()
    return f.decrypt(encrypted_data)

# --- THREAT LEVEL ENGINE ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6371 # Earth radius in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + math.cos(math.radians(lat1)) \
        * math.cos(math.radians(lat2)) * math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def calculate_threat_score(incident: dict):
    if "ai_analysis" not in incident or not incident["ai_analysis"]:
        incident["ai_analysis"] = {"threat_score": 0, "flags": []}
    
    score = 0
    flags = set(incident["ai_analysis"].get("flags", []) or [])
    
    # Base score
    if incident.get("type") == "physical_sos":
        score += 50
    elif incident.get("type") == "cyber_report":
        score += 30
    
    # Trigger modifiers
    t_type = incident.get("trigger_type")
    if t_type in ["voice", "silent_panic"]:
        score += 30
        flags.add("Duress/Hands-Free Trigger")
    
    # Keyword analysis
    cyber_details = incident.get("cyber_details", {})
    desc = ""
    if cyber_details and isinstance(cyber_details, dict):
        desc = cyber_details.get("description", "") or ""
    
    desc_lower = desc.lower()
    high_risk_words = ["weapon", "kill", "threaten", "leaked", "stalk", "suicide", "gun", "knife", "kidnap", "rape", "bomb"]
    found_words = [w for w in high_risk_words if w in desc_lower]
    if found_words:
        score += min(40, len(found_words) * 20)
        flags.add("High-Risk Keywords Detected")
        
    # AI Threat Detection (Phishing & Fake Profiles)
    if incident.get("type") == "cyber_report":
        phishing_keywords = ["bit.ly", "tinyurl", "login", "verify", "password", "bank", "account", "prize", "lottery", "otp", "kyc", "update now", "urgent"]
        found_phishing = [w for w in phishing_keywords if w in desc_lower]
        if found_phishing:
            score += min(30, len(found_phishing) * 15)
            flags.add("AI Flag: Possible Phishing/Scam")
            
        fake_profile_keywords = ["fake account", "impersonat", "using my photo", "fake profile"]
        found_fake = [w for w in fake_profile_keywords if w in desc_lower]
        if found_fake:
            score += 20
            flags.add("AI Flag: Impersonation/Fake Profile")

    # Velocity calculation (Smoothing GPS jitter by using a min 15s window)
    loc_history = incident.get("location_history", [])
    if len(loc_history) >= 2:
        last = loc_history[-1]
        try:
            t_last = datetime.fromisoformat(last["timestamp"].replace("Z", "+00:00"))
            valid_prev = None
            
            # Find a historical ping that is at least 15 seconds older to calculate a stable average speed
            for loc in reversed(loc_history[:-1]):
                t_curr = datetime.fromisoformat(loc["timestamp"].replace("Z", "+00:00"))
                if (t_last - t_curr).total_seconds() >= 15:
                    valid_prev = loc
                    break
            
            if valid_prev:
                dist = haversine(valid_prev["lat"], valid_prev["lng"], last["lat"], last["lng"])
                t_prev = datetime.fromisoformat(valid_prev["timestamp"].replace("Z", "+00:00"))
                hours = (t_last - t_prev).total_seconds() / 3600.0
                
                # To prevent GPS drift (e.g., 150m jump in 15 seconds = 36km/h) from triggering false positives,
                # we mandate that the total distance traveled must be at least 0.3 km (300 meters).
                if hours > 0 and dist > 0.3:
                    speed = dist / hours
                    if speed > 30 and incident.get("type") == "physical_sos":
                        score += 20
                        flags.add("High Velocity Detected (>30km/h)")
                elif "High Velocity Detected (>30km/h)" in flags:
                    # If they slow down or it was a false spike, remove the flag
                    flags.remove("High Velocity Detected (>30km/h)")
        except Exception as e:
            pass
    
    # Time decay (active for >3 mins)
    if incident.get("status") == "active":
        try:
            t_start = datetime.fromisoformat(incident["timestamp"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            minutes_active = (now - t_start).total_seconds() / 60.0
            if minutes_active > 3:
                score += min(30, int(minutes_active - 3) * 5)
                flags.add("Prolonged Active Status")
        except:
            pass
            
    # Cap score at 100
    incident["ai_analysis"]["threat_score"] = min(100, score)
    incident["ai_analysis"]["flags"] = list(flags)
    
    return incident

# --- ENDPOINTS ---

@dashboard_router.get("/stats", response_model=DashboardStats)
async def get_stats():
    active = await db.count_active()
    return DashboardStats(
        active_incidents=active,
        resolved_today=12,
        active_users=450,
    )

@public_router.get("/my-incidents", response_model=IncidentsResponse)
async def get_my_incidents():
    my_incidents = await db.get_user_incidents("usr_citizen")
    active_count = len([i for i in my_incidents if i.get("status") == "active"])
    
    incident_objects = []
    for inc_dict in my_incidents:
        try:
            incident_objects.append(Incident(**inc_dict))
        except Exception as e:
            pass
            
    return IncidentsResponse(
        incidents=incident_objects,
        critical_count=active_count
    )

@public_router.get("/incident/{incident_id}", response_model=Incident)
async def get_public_incident(incident_id: str, request: Request):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    pwd_hash = incident.get("password_hash")
    if pwd_hash:
        provided_pwd = request.headers.get("x-incident-password")
        if not provided_pwd:
            raise HTTPException(status_code=401, detail="Password required to view this report")
        if hashlib.sha256(provided_pwd.encode()).hexdigest() != pwd_hash:
            raise HTTPException(status_code=401, detail="Incorrect password")
            
    return Incident(**incident)

@dashboard_router.get("/incidents", response_model=IncidentsResponse)
async def get_incidents():
    incidents_data = await db.get_all_incidents()
    active_count = len([i for i in incidents_data if i.get("status") == "active"])
    
    incident_objects = []
    for inc_dict in incidents_data:
        try:
            incident_objects.append(Incident(**inc_dict))
        except Exception as e:
            pass
            
    return IncidentsResponse(
        incidents=incident_objects,
        critical_count=active_count,
    )

@dashboard_router.get("/analytics")
async def get_analytics():
    incidents_data = await db.get_all_incidents()
    
    crime_categories = {}
    location_categories = {}
    repeat_offenders = {}
    
    for inc in incidents_data:
        if inc.get("type") == "cyber_report":
            cat = inc.get("cyber_details", {}).get("crime_category", "Other")
            if not cat:
                cat = "Other"
            crime_categories[cat] = crime_categories.get(cat, 0) + 1
            
            loc = inc.get("location", {}).get("address", "Unknown Location")
            # Extract city from "Ahmedabad, Gujarat, India" -> "Ahmedabad"
            city = loc.split(",")[0].strip() if loc else "Unknown"
            
            if city not in location_categories:
                location_categories[city] = {}
            location_categories[city][cat] = location_categories[city].get(cat, 0) + 1
            
            suspects = inc.get("cyber_details", {}).get("suspects", [])
            for suspect_str in suspects:
                if suspect_str:
                    suspect_key = str(suspect_str).strip()
                    if suspect_key not in repeat_offenders:
                        repeat_offenders[suspect_key] = {"count": 0, "incidents": [], "name": suspect_key, "platform": "Unknown"}
                    repeat_offenders[suspect_key]["count"] += 1
                    if inc["id"] not in repeat_offenders[suspect_key]["incidents"]:
                        repeat_offenders[suspect_key]["incidents"].append(inc["id"])

    offenders_list = [v for k, v in repeat_offenders.items() if v["count"] > 1]
    
    return {
        "categories": crime_categories,
        "locations": location_categories,
        "repeat_offenders": offenders_list
    }

@dashboard_router.get("/incident/{incident_id}", response_model=Incident)
async def get_dashboard_incident(incident_id: str):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return Incident(**incident)

class AddressUpdateRequest(BaseModel):
    address: str

@dashboard_router.post("/incident/{incident_id}/address")
async def update_incident_address(incident_id: str, req: AddressUpdateRequest):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if "location" in incident and incident["location"]:
        incident["location"]["address"] = req.address
        await db.update_incident(incident_id, incident)
        await manager.broadcast_incident(incident_id, incident)
        return {"status": "success", "address": req.address}
    
    raise HTTPException(status_code=400, detail="Incident has no location data")

class StatusUpdateRequest(BaseModel):
    status: str
    description: str

@dashboard_router.post("/incident/{incident_id}/status")
async def update_incident_status(incident_id: str, req: StatusUpdateRequest):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    status_update = {
        "status": req.status,
        "description": req.description,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "police"
    }
    
    if "status_history" not in incident:
        incident["status_history"] = []
        incident["status_history"].append({
            "status": incident.get("status", "active"),
            "description": "Initial report",
            "timestamp": incident.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "source": "citizen" if incident.get("trigger_type") else "system"
        })
        
    incident["status_history"].append(status_update)
    incident["status"] = req.status
    incident["last_updated"] = status_update["timestamp"]
    
    await db.update_incident(incident_id, incident)
    await manager.broadcast_incident(incident_id, incident)
    return {"status": "success", "incident": incident}

class CommentRequest(BaseModel):
    text: str

@public_router.post("/incident/{incident_id}/comment")
async def add_incident_comment(incident_id: str, req: CommentRequest):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if "comments" not in incident:
        incident["comments"] = []
        
    comment_data = {
        "text": req.text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "citizen"
    }
    
    incident["comments"].append(comment_data)
    incident["last_updated"] = comment_data["timestamp"]
    
    await db.update_incident(incident_id, incident)
    await manager.broadcast_incident(incident_id, incident)
    return {"status": "success", "incident": incident}

@dashboard_router.post("/incident/{incident_id}/comment")
async def add_incident_comment_dashboard(incident_id: str, req: CommentRequest):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if "comments" not in incident:
        incident["comments"] = []
        
    comment_data = {
        "text": req.text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "police"
    }
    
    incident["comments"].append(comment_data)
    incident["last_updated"] = comment_data["timestamp"]
    
    await db.update_incident(incident_id, incident)
    await manager.broadcast_incident(incident_id, incident)
    return {"status": "success", "incident": incident}

@public_router.post("/incident/{incident_id}/status")
async def update_incident_status_public(incident_id: str, req: StatusUpdateRequest):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    status_update = {
        "status": req.status,
        "description": req.description,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "citizen"
    }
    
    if "status_history" not in incident:
        incident["status_history"] = []
        incident["status_history"].append({
            "status": incident.get("status", "active"),
            "description": "Initial report",
            "timestamp": incident.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "source": "citizen" if incident.get("trigger_type") else "system"
        })
        
    incident["status_history"].append(status_update)
    incident["status"] = req.status
    incident["last_updated"] = status_update["timestamp"]
    
    await db.update_incident(incident_id, incident)
    await manager.broadcast_incident(incident_id, incident)
    return {"status": "success", "incident": incident}

class SuspectRequest(BaseModel):
    suspect: str
    source: str = "citizen"

@public_router.post("/incident/{incident_id}/suspect")
async def add_incident_suspect(incident_id: str, req: SuspectRequest):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if "cyber_details" not in incident or not incident["cyber_details"]:
        incident["cyber_details"] = {"suspects": []}
    
    if "suspects" not in incident["cyber_details"] or not incident["cyber_details"]["suspects"]:
        incident["cyber_details"]["suspects"] = []
        
    incident["cyber_details"]["suspects"].append({
        "name": req.suspect,
        "source": req.source
    })
    incident["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    await db.update_incident(incident_id, incident)
    await manager.broadcast_incident(incident_id, incident)
    return {"status": "success", "incident": incident}

class LocationPostRequest(BaseModel):
    lat: float
    lng: float
    accuracy: float

def fetch_address(lat, lng):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
        req = urllib.request.Request(url, headers={'User-Agent': 'OneAlertApp/1.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            return data.get("display_name", "Unknown Address")
    except Exception as e:
        print(f"Geocoding error: {e}")
        return "Unknown Address"

@public_router.post("/incident/{incident_id}/location")
async def update_incident_location(incident_id: str, req: LocationPostRequest):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if "location_history" not in incident:
        incident["location_history"] = []
        
    is_duplicate = False
    address = None
    if len(incident["location_history"]) > 0:
        last_unique = next((loc for loc in reversed(incident["location_history"]) if not loc.get("is_duplicate")), incident["location_history"][-1])
        dist_lat = abs(last_unique.get("lat", 0) - req.lat)
        dist_lng = abs(last_unique.get("lng", 0) - req.lng)
        if dist_lat < 0.0001 and dist_lng < 0.0001:
            is_duplicate = True
            address = last_unique.get("address")
            
    ts = datetime.now(timezone.utc).isoformat()
    if not is_duplicate:
        # Offload sync fetch_address to asyncio threadpool to prevent event loop blocking
        address = await asyncio.get_event_loop().run_in_executor(None, fetch_address, req.lat, req.lng)
    
    update = {
        "lat": req.lat,
        "lng": req.lng,
        "accuracy": req.accuracy,
        "timestamp": ts,
        "address": address,
        "is_duplicate": is_duplicate
    }
    
    incident["location_history"].append(update)
    
    if "location" not in incident or not incident["location"]:
        incident["location"] = {
            "lat": req.lat,
            "lng": req.lng,
            "accuracy": req.accuracy,
            "is_live_tracking": True
        }
    else:
        incident["location"]["lat"] = req.lat
        incident["location"]["lng"] = req.lng
        incident["location"]["accuracy"] = req.accuracy
        incident["location"]["is_live_tracking"] = True
        
    incident["last_updated"] = ts
    
    incident = calculate_threat_score(incident)
    
    await db.update_incident(incident_id, incident)
    await manager.broadcast_incident(incident_id, incident)
    return {"status": "success", "incident": incident}

@public_router.post("/incident")
async def create_incident(incident: Incident):
    incident_dict = incident.model_dump()
    pwd = incident_dict.pop("incident_password", None)
    if not pwd:
        import random
        pwd = str(random.randint(100000, 999999))
    incident_dict["password_hash"] = hashlib.sha256(pwd.encode()).hexdigest()
    incident_dict["decryption_key"] = pwd


    if incident.location and incident.type == "physical_sos":
        address = await asyncio.get_event_loop().run_in_executor(None, fetch_address, incident.location.lat, incident.location.lng)
        incident_dict["location"]["address"] = address
        incident_dict["location_history"] = [{
            "lat": incident.location.lat,
            "lng": incident.location.lng,
            "accuracy": incident.location.accuracy,
            "timestamp": incident.timestamp,
            "address": address
        }]
        
    incident_dict = calculate_threat_score(incident_dict)
        
    await db.upsert_incident(incident.id, incident_dict)
    await manager.broadcast_incident(incident.id, incident_dict)
    
        
    # Encrypt sensitive evidence files
    password = pwd
    for ev in incident.evidence:
        if ev.is_sensitive:
            full_path = os.path.join(ROOT_DIR, ev.file_path)
            if os.path.exists(full_path):
                try:
                    encrypt_file(full_path, password)
                except Exception as e:
                    print(f"Failed to encrypt {full_path}: {e}")
    
    if incident.type == "physical_sos":
        asyncio.create_task(send_background_sms(incident_dict))
    
    # 4a: Auto-forward cyber_report incidents to the CCB integration layer
    if incident.type == "cyber_report":
        case_ref = await forward_to_ccb(incident_dict)
        incident_dict["ccb_sync_status"] = "synced" if case_ref else "failed"
        incident_dict["ccb_case_ref"] = case_ref
        await db.update_incident(incident.id, incident_dict)
        
    return {"status": "success", "id": incident.id}

@public_router.get("/contacts", response_model=ContactsResponse)
async def get_contacts():
    contacts_list = await db.get_all_contacts()
    return ContactsResponse(contacts=contacts_list)

@public_router.post("/contacts")
async def save_user_contacts(contacts: List[Contact]):
    await db.set_all_contacts([c.model_dump() for c in contacts])
    return {"status": "success"}

@public_router.post("/scan-threat", response_model=ThreatScanResponse)
async def scan_threat(req: ThreatScanRequest):
    score = 0
    flags = []
    recommendations = []
    is_malicious = False
    cached = False
    payload_lower = req.payload.lower()

    if req.type == "url":
        # Check cache
        if db.use_mongo and db.malicious_links_collection is not None:
            cached_link = await db.malicious_links_collection.find_one({"url": payload_lower})
            if cached_link:
                return ThreatScanResponse(
                    is_malicious=cached_link.get("is_malicious", True),
                    score=cached_link.get("score", 100),
                    flags=cached_link.get("flags", ["Cached Malicious Link"]),
                    recommendations=["Do not open this link.", "Verify through VirusTotal.", "Check Cloudflare Radar."],
                    cached=True
                )
                
    if OPENROUTER_API_KEY:
        try:
            import httpx
            import json
            
            prompt = f"""You are a cyber security expert system. Analyze this {req.type} for malicious intent (phishing, impersonation, scam, etc).
Payload: {req.payload}

Return ONLY a valid JSON object with:
- "is_malicious" (bool)
- "score" (int 0-100, where 100 is highly malicious)
- "flags" (list of strings, max 3)
- "recommendations" (list of strings, max 2)"""
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "google/gemini-2.5-flash",
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    },
                    timeout=10.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    # Sometimes the model returns markdown JSON block, strip it
                    if content.startswith("```json"):
                        content = content[7:-3]
                    elif content.startswith("```"):
                        content = content[3:-3]
                        
                    parsed = json.loads(content.strip())
                    
                    is_mal = parsed.get("is_malicious", False)
                    sc = parsed.get("score", 0)
                    flgs = parsed.get("flags", [])
                    recs = parsed.get("recommendations", [])
                    
                    # Update cache if url
                    if req.type == "url" and is_mal and db.use_mongo and db.malicious_links_collection is not None:
                        try:
                            await db.malicious_links_collection.update_one(
                                {"url": payload_lower},
                                {"$set": {"url": payload_lower, "score": sc, "flags": flgs, "is_malicious": is_mal}},
                                upsert=True
                            )
                        except Exception as e:
                            print(f"Error caching link: {e}")
                            
                    return ThreatScanResponse(
                        is_malicious=is_mal,
                        score=sc,
                        flags=flgs,
                        recommendations=recs,
                        cached=False
                    )
        except Exception as e:
            print(f"AI API failed, falling back to heuristics: {e}")

    if req.type == "url":
        # Heuristics
        phishing_domains = ["bit.ly", "tinyurl", "free-prizes", "kyc-update", "bank-secure-login", "ngrok"]
        if any(d in payload_lower for d in phishing_domains):
            score += 60
            flags.append("Suspicious Domain/Shortener")
        if not payload_lower.startswith("https"):
            score += 20
            flags.append("Missing HTTPS (Insecure)")
        
        # IP instead of domain
        import re
        if re.search(r"http[s]?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", payload_lower):
            score += 50
            flags.append("IP Address used instead of Domain Name")
            
        recommendations.append("We recommend checking this link on VirusTotal (virustotal.com) and Cloudflare Radar.")

    elif req.type == "text":
        urgency_words = ["urgent", "immediate", "suspend", "block", "verify now"]
        financial_words = ["otp", "cvv", "bank account", "lottery", "prize", "customs fee", "pay now", "crypto"]
        
        if any(w in payload_lower for w in urgency_words):
            score += 30
            flags.append("Urgent/Threatening Language")
        if any(w in payload_lower for w in financial_words):
            score += 40
            flags.append("Financial Request / OTP Farming")

    elif req.type == "profile":
        fake_indicators = ["admin", "support", "official", "helpdesk"]
        if any(w in payload_lower for w in fake_indicators):
            score += 40
            flags.append("Suspicious Impersonation Keywords")
        if sum(c.isdigit() for c in payload_lower) > 4:
            score += 20
            flags.append("Random Alphanumeric Handle (Bot pattern)")

    is_malicious = score >= 50
    
    # Save to cache if malicious URL
    if req.type == "url" and is_malicious and db.use_mongo and db.malicious_links_collection is not None:
        try:
            await db.malicious_links_collection.update_one(
                {"url": payload_lower},
                {"$set": {"url": payload_lower, "score": score, "flags": flags, "is_malicious": is_malicious}},
                upsert=True
            )
        except Exception as e:
            print(f"Error caching link: {e}")

    return ThreatScanResponse(
        is_malicious=is_malicious,
        score=min(score, 100),
        flags=flags,
        recommendations=recommendations,
        cached=False
    )

@public_router.post("/evidence/upload")
async def upload_evidence(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    evidence_id = f"EV-{uuid.uuid4().hex[:8]}"
    safe_filename = f"{evidence_id}_{file.filename}"
    file_path = ALERTS_DIR / safe_filename
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
        
    return {
        "status": "success",
        "evidence": {
            "evidence_id": evidence_id,
            "file_name": file.filename,
            "file_path": f"alerts/{safe_filename}",
            "file_type": file.content_type or f"application/{ext}",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "uploaded_by": "citizen_app",
            "sha256_hash": file_hash
        }
    }

class DecryptRequest(BaseModel):
    file_path: str
    password: str

@public_router.post("/evidence/decrypt")
async def decrypt_evidence(req: DecryptRequest):
    full_path = os.path.join(ROOT_DIR, req.file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        decrypted_bytes = decrypt_file(full_path, req.password)
        mime_type, _ = mimetypes.guess_type(full_path)
        return Response(content=decrypted_bytes, media_type=mime_type or "application/octet-stream")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Decryption failed. Incorrect password or corrupted file.")

# --- 4a: CCB INTEGRATION ---

async def forward_to_ccb(incident_dict: dict) -> Optional[str]:
    """Simulate forwarding an incident to the Cyber Crime Branch.
    In a real deployment, this would call the official CCB/CCTNS API.
    Returns a case reference number on success, None on failure."""
    try:
        case_ref = f"CCB-{datetime.now(timezone.utc).strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        cyber = incident_dict.get("cyber_details", {})
        print(f"[CCB] Forwarding incident {incident_dict.get('id')} to Cyber Crime Branch...")
        print(f"[CCB] Category: {cyber.get('crime_category', 'Unknown')}")
        print(f"[CCB] Case Reference Issued: {case_ref}")
        return case_ref
    except Exception as e:
        print(f"[CCB] Forward failed: {e}")
        return None

@public_router.get("/incident/{incident_id}/ccb-status")
async def get_ccb_status(incident_id: str):
    """Return the CCB sync status and case reference for a given incident."""
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {
        "incident_id": incident_id,
        "ccb_sync_status": incident.get("ccb_sync_status", "not_applicable"),
        "ccb_case_ref": incident.get("ccb_case_ref", None),
    }

class EvidenceLogRequest(BaseModel):
    username: str

@public_router.post("/incident/{incident_id}/evidence/{evidence_id}/log")
async def log_evidence_access(incident_id: str, evidence_id: str, req: EvidenceLogRequest):
    incident = await db.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    evidence_list = incident.get("evidence", [])
    found = False
    for ev in evidence_list:
        if ev.get("evidence_id") == evidence_id:
            if "access_logs" not in ev:
                ev["access_logs"] = []
            ev["access_logs"].append({
                "username": req.username,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Evidence not found")
        
    incident["evidence"] = evidence_list
    await db.update_incident(incident_id, incident)
    
    # Return updated incident so UI can refresh
    updated = await db.get_incident(incident_id)
    return Incident(**updated)

app.include_router(dashboard_router)
app.include_router(public_router)


# Background Tasks & APIs

async def send_background_sms(incident_dict):
    """
    Sends an SMS alert in the background using Twilio.
    If no credentials are set, falls back to a terminal print simulation.
    """
    contacts_list = await db.get_all_contacts()
    if not contacts_list:
        print("[SMS Background Task] No trusted contacts found.")
        return

    lat = incident_dict.get("location", {}).get("lat", "Unknown")
    lng = incident_dict.get("location", {}).get("lng", "Unknown")
    incident_id = incident_dict.get("id", "Unknown")
    decryption_key = incident_dict.get("decryption_key", "Unknown")
    msg_body = f"URGENT: Emergency SOS triggered by OneAlert user. Location: {lat}, {lng}. Report ID: {incident_id}. Privacy PIN: {decryption_key}. Please attempt contact immediately."
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            for c in contacts_list:
                phone = c.get("phone")
                # Ensure phone format starts with +
                if not phone.startswith("+"):
                    continue
                try:
                    message = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: client.messages.create(
                            body=msg_body,
                            from_=TWILIO_PHONE_NUMBER,
                            to=phone
                        )
                    )
                    print(f"[SMS Background Task] Sent to {phone}. SID: {message.sid}")
                except Exception as e:
                    print(f"[SMS Background Task] Failed sending to {phone}: {e}")
        except Exception as e:
            print(f"[SMS Background Task] Twilio initialization failed: {e}")
    else:
        print("\n--- [MOCK] BACKGROUND SMS DISPATCH ---")
        print(f"Message: {msg_body}")
        for c in contacts_list:
            print(f"-> Dispatched to {c.get('name', 'Unknown')} at {c.get('phone', 'Unknown')}")
        print("--------------------------------------\n")


@public_router.get("/unsafe-zones")
async def get_unsafe_zones():
    """
    Calculates dynamic unsafe zones based on incident clustering.
    We identify incidents with physical SOS/panic types.
    """
    incidents = await db.get_all_incidents()
    zones = []
    
    # Simple mock clustering: we'll just treat any unique physical_sos coordinate as a zone center
    # In a real app, we'd use DBSCAN or KMeans to find dense clusters.
    # For now, we aggregate incidents within ~0.01 lat/lng degree.
    
    clusters = {}
    for inc in incidents:
        # Check if it has a location
        loc = inc.get("location")
        if not loc or not loc.get("lat") or not loc.get("lng"):
            continue
            
        # Group by approx coordinates (rounding to 2 decimals is ~1.1km precision)
        lat_rnd = round(loc["lat"], 2)
        lng_rnd = round(loc["lng"], 2)
        
        key = f"{lat_rnd},{lng_rnd}"
        if key not in clusters:
            clusters[key] = {
                "lat": loc["lat"], 
                "lng": loc["lng"], 
                "incident_count": 0,
                "score": 0
            }
        
        clusters[key]["incident_count"] += 1
        clusters[key]["score"] += inc.get("ai_analysis", {}).get("threat_score", 50)
        
    for k, v in clusters.items():
        if v["incident_count"] >= 1: # in production, this threshold would be higher
            # Average score
            avg_score = v["score"] / v["incident_count"]
            zones.append({
                "id": f"zone_{k.replace('.', '_').replace(',', '-')}",
                "center": {"lat": v["lat"], "lng": v["lng"]},
                "radius_meters": 1000, # Fixed 1km as requested
                "incident_count": v["incident_count"],
                "threat_level": "critical" if avg_score > 75 else ("high" if avg_score > 50 else "medium")
            })
            
    return {"status": "success", "zones": zones}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=20134)
