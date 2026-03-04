from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Decorous Construction API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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
    return lead

@api_router.get("/leads", response_model=List[Lead])
async def get_leads():
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    return leads

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

# Cost Calculator
@api_router.post("/calculate-cost", response_model=CostEstimateResponse)
async def calculate_cost(estimate: CostEstimate):
    # Cost per sqft based on quality
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
    
    # Location multiplier
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
    
    # Additional costs
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
