from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Response
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import base64
import io
import os
import logging
from pathlib import Path
from PIL import Image
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio
import secrets
import resend
from erp_routes import router as erp_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
NOTIFICATION_EMAIL = os.environ.get('NOTIFICATION_EMAIL', 'contact@decorous.in')
WHATSAPP_NUMBER = os.environ.get('WHATSAPP_NUMBER', '917008863329')

# Admin password is a hard-required secret. Refuse to boot without it so that
# a misconfigured environment never silently falls back to a known default.
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
if not ADMIN_PASSWORD or len(ADMIN_PASSWORD) < 8:
    raise RuntimeError(
        "ADMIN_PASSWORD environment variable is required and must be at least "
        "8 characters. Refusing to boot with a missing or weak admin password."
    )

# Create the main app
app = FastAPI(title="Decorous Construction API")

# Security for admin routes
security = HTTPBasic()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class LeadBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    city: Optional[str] = None
    plot_size: Optional[str] = None
    construction_type: Optional[str] = None
    message: Optional[str] = None
    source: str = "website"

class Lead(LeadBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "new"

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    category: str
    location: str
    area_sqft: int
    completion_time: str
    description: str
    images: List[str]
    featured: bool = False

class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    excerpt: str
    content: str
    category: str
    tags: List[str]
    image: str
    author: str = "Decorous Team"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    meta_title: str
    meta_description: str

class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    short_description: str
    content: str
    image: str
    icon: str
    benefits: List[str]
    process_steps: List[str]
    faqs: List[dict]
    meta_title: str
    meta_description: str

class City(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    content: str
    image: str
    service_type: str
    meta_title: str
    meta_description: str
    faqs: List[dict]

class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str
    project_type: str
    rating: int
    content: str
    image: Optional[str] = None

# ==================== ADMIN CONTENT MANAGEMENT ====================
# Input models for the admin projects/testimonials editor. Separate from
# Project/Testimonial (the public read models) so the public GET endpoints'
# response shape never has to change.

class ProjectCreate(BaseModel):
    title: str
    category: str
    location: str
    area_sqft: int
    completion_time: str
    description: str
    images: List[str]
    featured: bool = False

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    area_sqft: Optional[int] = None
    completion_time: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    featured: Optional[bool] = None

class TestimonialCreate(BaseModel):
    name: str
    location: str
    project_type: str
    rating: int
    content: str
    image: Optional[str] = None

class TestimonialUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    project_type: Optional[str] = None
    rating: Optional[int] = None
    content: Optional[str] = None
    image: Optional[str] = None

class ImageUploadIn(BaseModel):
    content_type: str = Field(default="image/jpeg")
    data_base64: str  # base64 without the "data:...;base64," prefix

class CostEstimate(BaseModel):
    plot_size: int
    floors: int
    quality: str
    city: str

class CostEstimateResponse(BaseModel):
    estimated_cost: int
    cost_per_sqft: int
    breakdown: dict
    quality_description: str

# ==================== EMAIL NOTIFICATION ====================

async def send_lead_notification(lead: Lead):
    """Send email notification for new lead with WhatsApp link"""
    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email notification")
        return
    
    whatsapp_message = f"Hi {lead.name}! Thank you for your interest in Decorous construction services. I received your inquiry and would love to discuss your project. How can I help you?"
    whatsapp_link = f"https://wa.me/{lead.phone.replace('+', '').replace(' ', '')}?text={whatsapp_message.replace(' ', '%20')}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #1a365d; color: white; padding: 20px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 20px; background: #f8f9fa; }}
            .lead-details {{ background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }}
            .lead-details h3 {{ color: #1a365d; margin-top: 0; }}
            .detail-row {{ display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }}
            .detail-label {{ font-weight: bold; width: 140px; color: #666; }}
            .detail-value {{ color: #333; }}
            .whatsapp-btn {{ display: inline-block; background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }}
            .call-btn {{ display: inline-block; background: #1a365d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 5px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏗️ New Lead Alert - Decorous</h1>
            </div>
            <div class="content">
                <p>You have received a new inquiry from your website!</p>
                
                <div class="lead-details">
                    <h3>Lead Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">{lead.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">{lead.phone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">{lead.email or 'Not provided'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">City:</span>
                        <span class="detail-value">{lead.city or 'Not specified'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Plot Size:</span>
                        <span class="detail-value">{lead.plot_size or 'Not specified'} sqft</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Construction Type:</span>
                        <span class="detail-value">{lead.construction_type or 'Not specified'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Source:</span>
                        <span class="detail-value">{lead.source}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Message:</span>
                        <span class="detail-value">{lead.message or 'No message'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Received At:</span>
                        <span class="detail-value">{lead.created_at.strftime('%d %b %Y, %I:%M %p')}</span>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="{whatsapp_link}" class="whatsapp-btn">💬 Chat on WhatsApp</a>
                    <a href="tel:{lead.phone}" class="call-btn">📞 Call Now</a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    <strong>Tip:</strong> Respond within 5 minutes for the best conversion rate!
                </p>
            </div>
            <div class="footer">
                <p>This notification was sent from your Decorous website lead capture system.</p>
                <p>© 2024 Decorous Construction | Bhubaneswar, Odisha</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": "Decorous Leads <onboarding@resend.dev>",
            "to": [NOTIFICATION_EMAIL],
            "subject": f"🏗️ New Lead: {lead.name} - {lead.city or 'Website'}",
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email notification sent for lead: {lead.name}, email_id: {email.get('id')}")
        return email
    except Exception as e:
        logger.error(f"Failed to send email notification: {str(e)}")
        return None

# ==================== ADMIN AUTH ====================

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (credentials.username == "admin" and correct_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Decorous Construction API", "status": "active"}

# Lead Routes
@api_router.post("/leads", response_model=Lead)
async def create_lead(input: LeadBase):
    lead = Lead(**input.model_dump())
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leads.insert_one(doc)
    
    # Send email notification (non-blocking)
    asyncio.create_task(send_lead_notification(lead))
    
    return lead

@api_router.get("/leads", response_model=List[Lead])
async def get_leads():
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return leads

# Admin Lead Routes
@api_router.get("/admin/leads")
async def get_admin_leads(admin: str = Depends(verify_admin)):
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    # Get stats
    total = len(leads)
    new_count = sum(1 for l in leads if l.get('status') == 'new')
    contacted_count = sum(1 for l in leads if l.get('status') == 'contacted')
    converted_count = sum(1 for l in leads if l.get('status') == 'converted')
    
    return {
        "leads": leads,
        "stats": {
            "total": total,
            "new": new_count,
            "contacted": contacted_count,
            "converted": converted_count
        }
    }

@api_router.patch("/admin/leads/{lead_id}")
async def update_lead(lead_id: str, update: LeadUpdate, admin: str = Depends(verify_admin)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"status": "success", "updated": update_data}

@api_router.delete("/admin/leads/{lead_id}")
async def delete_lead(lead_id: str, admin: str = Depends(verify_admin)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"status": "success", "deleted": lead_id}

# Projects Routes
@api_router.get("/projects", response_model=List[Project])
async def get_projects(category: Optional[str] = None, featured: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    projects = await db.projects.find(query, {"_id": 0}).to_list(100)
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.post("/admin/projects", response_model=Project)
async def create_project(input: ProjectCreate, admin: str = Depends(verify_admin)):
    project = Project(**input.model_dump())
    await db.projects.insert_one(project.model_dump())
    return project

@api_router.put("/admin/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, input: ProjectUpdate, admin: str = Depends(verify_admin)):
    updates = {k: v for k, v in input.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.projects.update_one({"id": project_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return project

@api_router.delete("/admin/projects/{project_id}")
async def delete_project(project_id: str, admin: str = Depends(verify_admin)):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "success", "deleted": project_id}

# Blog Routes
@api_router.get("/blog", response_model=List[BlogPost])
async def get_blog_posts(
    category: Optional[str] = None,
    limit: int = Query(default=10, le=50),
    skip: int = 0
):
    query = {}
    if category:
        query["category"] = category
    posts = await db.blog_posts.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    for post in posts:
        if isinstance(post.get('created_at'), str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    return posts

@api_router.get("/blog/{slug}", response_model=BlogPost)
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    if isinstance(post.get('created_at'), str):
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    return post

# Services Routes
@api_router.get("/services", response_model=List[Service])
async def get_services():
    services = await db.services.find({}, {"_id": 0}).to_list(10)
    return services

@api_router.get("/services/{slug}", response_model=Service)
async def get_service(slug: str):
    service = await db.services.find_one({"slug": slug}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

# Cities Routes
@api_router.get("/cities", response_model=List[City])
async def get_cities():
    cities = await db.cities.find({}, {"_id": 0}).to_list(50)
    return cities

@api_router.get("/cities/{slug}", response_model=City)
async def get_city(slug: str):
    city = await db.cities.find_one({"slug": slug}, {"_id": 0})
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city

# Testimonials Routes
@api_router.get("/testimonials", response_model=List[Testimonial])
async def get_testimonials():
    testimonials = await db.testimonials.find({}, {"_id": 0}).to_list(50)
    return testimonials

@api_router.post("/admin/testimonials", response_model=Testimonial)
async def create_testimonial(input: TestimonialCreate, admin: str = Depends(verify_admin)):
    testimonial = Testimonial(**input.model_dump())
    await db.testimonials.insert_one(testimonial.model_dump())
    return testimonial

@api_router.put("/admin/testimonials/{testimonial_id}", response_model=Testimonial)
async def update_testimonial(testimonial_id: str, input: TestimonialUpdate, admin: str = Depends(verify_admin)):
    updates = {k: v for k, v in input.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.testimonials.update_one({"id": testimonial_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    testimonial = await db.testimonials.find_one({"id": testimonial_id}, {"_id": 0})
    return testimonial

@api_router.delete("/admin/testimonials/{testimonial_id}")
async def delete_testimonial(testimonial_id: str, admin: str = Depends(verify_admin)):
    result = await db.testimonials.delete_one({"id": testimonial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"status": "success", "deleted": testimonial_id}

# ==================== IMAGE UPLOADS (admin content: projects/testimonials) ====================

IMAGE_MAX_DIM = 1600
IMAGE_WEBP_QUALITY = 80
UPLOAD_RAW_MAX_BYTES = 15 * 1024 * 1024


def _optimize_uploaded_image(raw: bytes) -> tuple[bytes, str]:
    """Resize + re-encode an image to WebP. Raises ValueError if unparseable."""
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception as exc:
        raise ValueError(f"Not a valid image: {exc}") from exc

    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.mode or img.mode == "P" else "RGB")

    ratio = min(1.0, IMAGE_MAX_DIM / max(img.width, img.height))
    if ratio < 1.0:
        img = img.resize((round(img.width * ratio), round(img.height * ratio)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=IMAGE_WEBP_QUALITY, method=6)
    return buf.getvalue(), "image/webp"


@api_router.post("/admin/upload-image")
async def admin_upload_image(dto: ImageUploadIn, admin: str = Depends(verify_admin)):
    approx_raw_bytes = (len(dto.data_base64) * 3) // 4
    if approx_raw_bytes > UPLOAD_RAW_MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"Upload too large (>{UPLOAD_RAW_MAX_BYTES // (1024*1024)} MB).")

    try:
        raw = base64.b64decode(dto.data_base64)
        optimized, content_type = _optimize_uploaded_image(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    upload_id = str(uuid.uuid4())
    await db.content_uploads.insert_one({
        "_id": upload_id,
        "content_type": content_type,
        "data": optimized,
        "bytes": len(optimized),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": upload_id, "url": f"/api/uploads/{upload_id}", "bytes": len(optimized)}


@api_router.get("/uploads/{upload_id}")
async def get_content_upload(upload_id: str):
    doc = await db.content_uploads.find_one({"_id": upload_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Upload not found")
    return Response(
        content=bytes(doc["data"]),
        media_type=doc["content_type"],
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )

# Cost Calculator
@api_router.post("/calculate-cost", response_model=CostEstimateResponse)
async def calculate_cost(estimate: CostEstimate):
    quality_costs = {
        "basic": 1700,
        "standard": 2000,
        "premium": 2400
    }
    
    quality_descriptions = {
        "basic": "Standard materials with basic finishes - Ideal for budget-conscious construction",
        "standard": "Quality materials with good finishes - Best value for most homeowners",
        "premium": "Premium materials with luxury finishes - Top-tier construction quality"
    }
    
    location_multipliers = {
        "bhubaneswar": 1.0,
        "cuttack": 0.95,
        "puri": 1.05,
        "khordha": 0.92,
        "rourkela": 0.90,
        "berhampur": 0.88,
        "sambalpur": 0.87
    }
    
    base_cost_per_sqft = quality_costs.get(estimate.quality, 2000)
    location_multiplier = location_multipliers.get(estimate.city.lower(), 1.0)
    
    adjusted_cost_per_sqft = int(base_cost_per_sqft * location_multiplier)
    total_area = estimate.plot_size * estimate.floors
    construction_cost = total_area * adjusted_cost_per_sqft
    
    foundation_cost = int(estimate.plot_size * 300)
    electrical_cost = int(total_area * 150)
    plumbing_cost = int(total_area * 100)
    finishing_cost = int(total_area * (200 if estimate.quality == "basic" else 350 if estimate.quality == "standard" else 500))
    
    total_cost = construction_cost + foundation_cost + electrical_cost + plumbing_cost + finishing_cost
    
    return CostEstimateResponse(
        estimated_cost=total_cost,
        cost_per_sqft=adjusted_cost_per_sqft,
        breakdown={
            "construction": construction_cost,
            "foundation": foundation_cost,
            "electrical": electrical_cost,
            "plumbing": plumbing_cost,
            "finishing": finishing_cost,
            "total_area": total_area
        },
        quality_description=quality_descriptions.get(estimate.quality, "")
    )

# Stats/Counters
@api_router.get("/stats")
async def get_stats():
    return {
        "projects_completed": 500,
        "engineers": 10,
        "client_satisfaction": 100,
        "years_experience": 8
    }

# ==================== SITEMAP ====================

@api_router.get("/sitemap.xml")
async def get_sitemap():
    """
    Returns the public sitemap as `application/xml`.

    Hardening notes (Jun 2026 Phase-1):
      • Hostname is hard-pinned to https://decorous.in — supervisor's
        APP_URL override (preview hostname) is deliberately ignored so this
        endpoint never leaks a non-canonical host into Google's index.
      • Database failures degrade gracefully — we still emit the static
        section (homepage + 9 fixed routes) so the response is never blank,
        which is what triggers Search Console's "Invalid sitemap address"
        error.
      • Explicit Content-Type header set (defensive — FastAPI's media_type
        is sometimes stripped by upstream proxies).
    """
    base_url = "https://decorous.in"
    today = datetime.now(timezone.utc).date().isoformat()  # yyyy-mm-dd

    # Static routes are always emitted, even if MongoDB is unreachable.
    urls = [
        {"loc": base_url, "priority": "1.0", "changefreq": "weekly", "lastmod": today},
        {"loc": f"{base_url}/about", "priority": "0.8", "changefreq": "monthly", "lastmod": today},
        {"loc": f"{base_url}/services", "priority": "0.9", "changefreq": "weekly", "lastmod": today},
        {"loc": f"{base_url}/projects", "priority": "0.8", "changefreq": "weekly", "lastmod": today},
        {"loc": f"{base_url}/process", "priority": "0.7", "changefreq": "monthly", "lastmod": today},
        {"loc": f"{base_url}/blog", "priority": "0.8", "changefreq": "daily", "lastmod": today},
        {"loc": f"{base_url}/cities", "priority": "0.8", "changefreq": "weekly", "lastmod": today},
        {"loc": f"{base_url}/contact", "priority": "0.9", "changefreq": "monthly", "lastmod": today},
        {"loc": f"{base_url}/cost-calculator", "priority": "0.9", "changefreq": "monthly", "lastmod": today},
        {"loc": f"{base_url}/privacy-policy", "priority": "0.3", "changefreq": "yearly", "lastmod": today},
        {"loc": f"{base_url}/terms-and-conditions", "priority": "0.3", "changefreq": "yearly", "lastmod": today},
    ]

    # Dynamic content — wrapped in try/except so a Mongo hiccup never produces
    # a blank/invalid sitemap. Also fetch `updated_at` so each URL has a
    # meaningful <lastmod>.
    try:
        services = await db.services.find(
            {}, {"_id": 0, "slug": 1, "updated_at": 1}
        ).to_list(10)
        cities = await db.cities.find(
            {}, {"_id": 0, "slug": 1, "updated_at": 1}
        ).to_list(50)
        blog_posts = await db.blog_posts.find(
            {}, {"_id": 0, "slug": 1, "updated_at": 1, "created_at": 1}
        ).to_list(100)
    except Exception as exc:  # noqa: BLE001  — bare except is intentional here
        logger.warning("sitemap: dynamic section degraded (%s); serving static only", exc)
        services, cities, blog_posts = [], [], []

    def _lastmod(doc: dict) -> str:
        """Extract a yyyy-mm-dd string from a Mongo doc, falling back to today."""
        val = doc.get("updated_at") or doc.get("created_at")
        if isinstance(val, datetime):
            return val.date().isoformat()
        if isinstance(val, str) and len(val) >= 10:
            return val[:10]
        return today

    # Add service pages
    for service in services:
        urls.append({
            "loc": f"{base_url}/services/{service['slug']}",
            "priority": "0.8",
            "changefreq": "monthly",
            "lastmod": _lastmod(service),
        })

    # Add city pages
    for city in cities:
        urls.append({
            "loc": f"{base_url}/cities/{city['slug']}",
            "priority": "0.8",
            "changefreq": "monthly",
            "lastmod": _lastmod(city),
        })

    # Add blog posts
    for post in blog_posts:
        urls.append({
            "loc": f"{base_url}/blog/{post['slug']}",
            "priority": "0.6",
            "changefreq": "monthly",
            "lastmod": _lastmod(post),
        })

    # Generate XML — escape < > & in <loc> defensively, though our slugs
    # should already be URL-safe.
    from xml.sax.saxutils import escape as _xml_escape
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    for url in urls:
        xml_content += '  <url>\n'
        xml_content += f'    <loc>{_xml_escape(url["loc"])}</loc>\n'
        xml_content += f'    <lastmod>{url["lastmod"]}</lastmod>\n'
        xml_content += f'    <changefreq>{url["changefreq"]}</changefreq>\n'
        xml_content += f'    <priority>{url["priority"]}</priority>\n'
        xml_content += '  </url>\n'

    xml_content += '</urlset>\n'

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "X-Robots-Tag": "noindex",  # the sitemap itself shouldn't be indexed
        },
    )

# ==================== SCHEMA MARKUP ====================

@api_router.get("/schema/organization")
async def get_organization_schema():
    return {
        "@context": "https://schema.org",
        "@type": "ConstructionCompany",
        "name": "Decorous",
        "description": "Leading construction company in Odisha offering residential, commercial, interior design, warehouse, and PEB construction services.",
        "url": "https://decorous.in",
        "logo": "https://decorous.in/logo.png",
        "telephone": "+917008863329",
        "email": "contact@decorous.in",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Bhubaneswar",
            "addressRegion": "Odisha",
            "addressCountry": "IN"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": "20.2961",
            "longitude": "85.8245"
        },
        "areaServed": [
            {"@type": "City", "name": "Bhubaneswar"},
            {"@type": "City", "name": "Cuttack"},
            {"@type": "City", "name": "Puri"},
            {"@type": "City", "name": "Khordha"},
            {"@type": "City", "name": "Rourkela"},
            {"@type": "City", "name": "Berhampur"},
            {"@type": "City", "name": "Sambalpur"}
        ],
        "serviceType": [
            "Residential Construction",
            "Commercial Construction",
            "Interior Design",
            "Warehouse Construction",
            "Pre-Engineered Buildings"
        ],
        "priceRange": "₹₹₹",
        "openingHours": "Mo-Sa 09:00-19:00",
        "sameAs": [
            "https://www.facebook.com/decorous",
            "https://www.instagram.com/decorous",
            "https://www.linkedin.com/company/decorous"
        ]
    }

@api_router.get("/schema/local-business")
async def get_local_business_schema():
    return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": "https://decorous.in/#business",
        "name": "Decorous - Construction Company Bhubaneswar",
        "image": "https://decorous.in/logo.png",
        "telephone": "+917008863329",
        "email": "contact@decorous.in",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Bhubaneswar",
            "addressLocality": "Bhubaneswar",
            "addressRegion": "Odisha",
            "postalCode": "751001",
            "addressCountry": "IN"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "150"
        }
    }

# Include the router in the main app
app.include_router(api_router)
app.include_router(erp_router)

# allow_credentials=True with a wildcard origin is rejected by browsers and is
# a loose config even where it's accepted, so default to the two known
# production origins instead of '*', and refuse to boot if '*' sneaks in via
# CORS_ORIGINS while credentials are enabled.
DEFAULT_CORS_ORIGINS = "https://decorous.in,https://app.decorous.in"
cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', DEFAULT_CORS_ORIGINS).split(',') if o.strip()]
if '*' in cors_origins:
    raise RuntimeError(
        "CORS_ORIGINS must not be '*' when allow_credentials=True. Set it to a "
        "comma-separated list of exact origins, e.g. "
        "https://decorous.in,https://app.decorous.in."
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
