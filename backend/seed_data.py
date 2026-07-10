"""
Seed script for Decorous Construction website
Run with: python seed_data.py
"""
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Services Data
services_data = [
    {
        "id": "svc-residential",
        "name": "Residential Construction",
        "slug": "residential-construction",
        "short_description": "Build your dream home with our expert residential construction services in Odisha.",
        "content": """<h2>Premium Residential Construction Services in Odisha</h2>
<p>At Decorous, we specialize in building dream homes across Odisha. Our residential construction services combine innovative design, quality materials, and expert craftsmanship to create homes that stand the test of time.</p>

<h3>What We Offer</h3>
<p>Our residential construction services cover everything from initial consultation to final handover. We handle single-family homes, duplexes, villas, and apartment buildings with the same dedication to quality.</p>

<h3>Our Construction Process</h3>
<p>Every project begins with understanding your vision. Our architects and engineers work closely with you to design a home that reflects your lifestyle while maximizing space efficiency and natural light.</p>

<h3>Quality Materials</h3>
<p>We source only the finest construction materials from trusted suppliers. From TMT bars to premium cement, every material is tested for quality before use in your home.</p>

<h3>Cost Transparency</h3>
<p>We believe in complete transparency. Our detailed cost estimates break down every expense, so you know exactly where your investment goes. No hidden charges, no surprises.</p>""",
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "icon": "Home",
        "benefits": [
            "Customized home designs tailored to your needs",
            "Premium quality construction materials",
            "Experienced team of architects and engineers",
            "Transparent pricing with no hidden costs",
            "On-time project delivery guarantee",
            "5-year structural warranty"
        ],
        "process_steps": [
            "Initial consultation and requirement gathering",
            "Site analysis and soil testing",
            "Architectural design and approval",
            "Structural design and engineering",
            "Construction with quality checkpoints",
            "Final inspection and handover"
        ],
        "faqs": [
            {"question": "How long does it take to build a house?", "answer": "A typical residential project takes 8-12 months depending on size and complexity."},
            {"question": "Do you handle all permits and approvals?", "answer": "Yes, we manage all necessary permits, approvals, and documentation."},
            {"question": "What warranty do you provide?", "answer": "We provide a 5-year structural warranty and 1-year warranty on fittings."}
        ],
        "meta_title": "Residential Construction Services in Bhubaneswar | Decorous",
        "meta_description": "Build your dream home with Decorous - the leading residential construction company in Bhubaneswar, Odisha. Quality construction, transparent pricing, on-time delivery."
    },
    {
        "id": "svc-commercial",
        "name": "Commercial Construction",
        "slug": "commercial-construction",
        "short_description": "Expert commercial construction for offices, retail spaces, and industrial buildings.",
        "content": """<h2>Commercial Construction Excellence in Odisha</h2>
<p>Decorous delivers world-class commercial construction services across Odisha. From modern office complexes to retail spaces and industrial facilities, we bring expertise and precision to every commercial project.</p>

<h3>Our Commercial Expertise</h3>
<p>Our commercial division has successfully completed numerous projects including corporate offices, shopping complexes, hotels, hospitals, and educational institutions.</p>

<h3>Project Management</h3>
<p>We employ rigorous project management methodologies to ensure your commercial project is completed on time and within budget. Our dedicated project managers keep you informed at every stage.</p>""",
        "image": "https://images.unsplash.com/photo-1747085040719-55282cc206b9?q=85&w=800&auto=format&fit=crop",
        "icon": "Building2",
        "benefits": [
            "Turnkey commercial construction solutions",
            "Modern design with functional efficiency",
            "Compliance with all commercial building codes",
            "Energy-efficient building systems",
            "Professional project management",
            "Post-construction maintenance support"
        ],
        "process_steps": [
            "Business requirement analysis",
            "Commercial design development",
            "Regulatory compliance and approvals",
            "Construction execution",
            "MEP installations",
            "Final commissioning and handover"
        ],
        "faqs": [
            {"question": "Can you handle large-scale commercial projects?", "answer": "Yes, we have experience with projects ranging from small retail spaces to large office complexes."},
            {"question": "Do you provide design services?", "answer": "Yes, our in-house architects specialize in commercial design and space planning."}
        ],
        "meta_title": "Commercial Construction Company in Bhubaneswar | Decorous",
        "meta_description": "Leading commercial construction services in Odisha. Offices, retail, industrial buildings - Decorous delivers quality commercial construction on time."
    },
    {
        "id": "svc-interior",
        "name": "Interior Design",
        "slug": "interior-design",
        "short_description": "Transform your spaces with our premium interior design and execution services.",
        "content": """<h2>Premium Interior Design Services</h2>
<p>Decorous Interior Design transforms ordinary spaces into extraordinary living and working environments. Our design philosophy combines aesthetics with functionality to create interiors that inspire.</p>

<h3>Design Philosophy</h3>
<p>We believe great interior design should reflect your personality while optimizing comfort and functionality. Our designers work closely with you to understand your preferences and create spaces you'll love.</p>

<h3>Services We Offer</h3>
<p>From concept to completion, we handle residential interiors, office spaces, retail interiors, hospitality projects, and modular solutions.</p>""",
        "image": "https://images.unsplash.com/photo-1580674287256-40141f08e9a5?q=85&w=800&auto=format&fit=crop",
        "icon": "Palette",
        "benefits": [
            "Customized design concepts",
            "3D visualization before execution",
            "Premium materials and finishes",
            "Modular furniture solutions",
            "Complete project execution",
            "After-service support"
        ],
        "process_steps": [
            "Design consultation",
            "Concept development",
            "3D visualization",
            "Material selection",
            "Execution and installation",
            "Final styling and handover"
        ],
        "faqs": [
            {"question": "Do you provide 3D designs?", "answer": "Yes, we provide detailed 3D renderings so you can visualize your space before execution."},
            {"question": "Can you work with existing furniture?", "answer": "Absolutely, we can incorporate your existing pieces into the new design."}
        ],
        "meta_title": "Interior Designers in Bhubaneswar | Decorous",
        "meta_description": "Transform your home with Decorous - top interior designers in Bhubaneswar. Modern designs, quality execution, affordable pricing."
    },
    {
        "id": "svc-warehouse",
        "name": "Warehouse Construction",
        "slug": "warehouse-construction",
        "short_description": "Industrial-grade warehouse construction for logistics and manufacturing needs.",
        "content": """<h2>Warehouse Construction Specialists</h2>
<p>Decorous specializes in building efficient, durable warehouses designed for modern logistics and industrial operations. Our warehouse solutions optimize space utilization while ensuring structural integrity.</p>

<h3>Warehouse Solutions</h3>
<p>We construct warehouses for various purposes including storage facilities, distribution centers, cold storage, and manufacturing units.</p>""",
        "image": "https://images.unsplash.com/photo-1747085040719-55282cc206b9?q=85&w=800&auto=format&fit=crop",
        "icon": "Warehouse",
        "benefits": [
            "High ceiling designs for maximum storage",
            "Loading dock integration",
            "Fire safety compliance",
            "Efficient ventilation systems",
            "Durable flooring solutions",
            "Security infrastructure"
        ],
        "process_steps": [
            "Site assessment",
            "Warehouse design",
            "Foundation work",
            "Structure erection",
            "Utility installations",
            "Final inspection"
        ],
        "faqs": [
            {"question": "What is the typical timeline for warehouse construction?", "answer": "Depending on size, warehouse construction typically takes 4-8 months."},
            {"question": "Do you handle industrial permits?", "answer": "Yes, we manage all necessary industrial and environmental permits."}
        ],
        "meta_title": "Warehouse Construction in Odisha | Decorous",
        "meta_description": "Industrial warehouse construction services in Odisha. Efficient design, durable construction, timely delivery by Decorous."
    },
    {
        "id": "svc-peb",
        "name": "Pre-Engineered Buildings (PEB)",
        "slug": "peb-construction",
        "short_description": "Fast, cost-effective Pre-Engineered Building solutions for industrial and commercial needs.",
        "content": """<h2>Pre-Engineered Building Solutions</h2>
<p>Decorous offers state-of-the-art Pre-Engineered Building (PEB) solutions that combine speed, cost-efficiency, and quality. PEB structures are ideal for factories, warehouses, showrooms, and sports facilities.</p>

<h3>Why Choose PEB?</h3>
<p>PEB construction offers 30-40% faster construction time, lower costs, and greater design flexibility compared to conventional construction methods.</p>""",
        "image": "https://images.unsplash.com/photo-1734555772444-469ee8b45914?q=85&w=800&auto=format&fit=crop",
        "icon": "Factory",
        "benefits": [
            "30-40% faster construction",
            "Cost-effective solutions",
            "High structural strength",
            "Customizable designs",
            "Low maintenance",
            "Eco-friendly construction"
        ],
        "process_steps": [
            "Requirement analysis",
            "Design engineering",
            "Manufacturing",
            "Foundation preparation",
            "Erection and assembly",
            "Finishing and handover"
        ],
        "faqs": [
            {"question": "What is the lifespan of a PEB structure?", "answer": "With proper maintenance, PEB structures can last 50+ years."},
            {"question": "Can PEB be used for offices?", "answer": "Yes, PEB is versatile and suitable for offices, showrooms, and even residential buildings."}
        ],
        "meta_title": "PEB Construction Company in Odisha | Decorous",
        "meta_description": "Leading PEB construction services in Odisha. Fast, cost-effective pre-engineered buildings by Decorous."
    }
]

# Cities Data
cities_data = [
    {
        "id": "city-bhubaneswar",
        "name": "Bhubaneswar",
        "slug": "house-construction-bhubaneswar",
        "service_type": "House Construction",
        "content": """<h2>House Construction in Bhubaneswar</h2>
<p>Looking for trusted home builders in Bhubaneswar? Decorous is the leading construction company in Bhubaneswar, delivering premium residential construction services across the capital city of Odisha.</p>

<h3>Why Choose Decorous for House Construction in Bhubaneswar?</h3>
<p>As Bhubaneswar's premier construction company, we understand the unique requirements of building homes in the Smart City. From understanding local soil conditions to navigating BDA approvals, our team ensures a hassle-free construction experience.</p>

<h3>Construction Cost in Bhubaneswar</h3>
<p>The average construction cost in Bhubaneswar ranges from ₹1,700 to ₹2,400 per square foot depending on the quality of materials and finishes you choose. Our transparent pricing ensures you know exactly what you're paying for.</p>

<h3>Areas We Serve in Bhubaneswar</h3>
<p>We provide house construction services across all areas of Bhubaneswar including Patia, Chandrasekharpur, Saheed Nagar, Jaydev Vihar, Nayapalli, Khandagiri, and Sundarpada.</p>""",
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "meta_title": "House Construction in Bhubaneswar | Best Home Builders | Decorous",
        "meta_description": "Looking for house construction in Bhubaneswar? Decorous is the leading construction company offering quality home building services. Get free estimate!",
        "faqs": [
            {"question": "What is the cost of house construction in Bhubaneswar?", "answer": "Construction cost in Bhubaneswar ranges from ₹1,700-₹2,400 per sqft depending on quality."},
            {"question": "How long does it take to build a house in Bhubaneswar?", "answer": "A typical residential construction in Bhubaneswar takes 8-12 months."},
            {"question": "Do you handle BDA approvals?", "answer": "Yes, we manage all BDA approvals and necessary permits for your project."}
        ]
    },
    {
        "id": "city-cuttack",
        "name": "Cuttack",
        "slug": "house-construction-cuttack",
        "service_type": "House Construction",
        "content": """<h2>House Construction in Cuttack</h2>
<p>Decorous brings premium house construction services to the Silver City of Odisha. As Cuttack's trusted construction partner, we build homes that combine traditional elegance with modern functionality.</p>

<h3>Building in the Millennium City</h3>
<p>Cuttack's unique geography and rich heritage require specialized construction expertise. Our team understands the city's flood-prone areas and ensures your home is built with proper foundation and drainage systems.</p>""",
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "meta_title": "House Construction in Cuttack | Home Builders | Decorous",
        "meta_description": "Premium house construction services in Cuttack. Decorous - trusted home builders in the Silver City. Get free consultation!",
        "faqs": [
            {"question": "What is construction cost per sqft in Cuttack?", "answer": "Construction cost in Cuttack ranges from ₹1,600-₹2,300 per sqft."},
            {"question": "Do you build in flood-prone areas?", "answer": "Yes, we have expertise in building with proper flood-resistant foundations."}
        ]
    },
    {
        "id": "city-puri",
        "name": "Puri",
        "slug": "house-construction-puri",
        "service_type": "House Construction",
        "content": """<h2>House Construction in Puri</h2>
<p>Build your dream home in the holy city of Puri with Decorous. Our coastal construction expertise ensures your home withstands the seaside environment while providing comfort and elegance.</p>""",
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "meta_title": "House Construction in Puri | Coastal Home Builders | Decorous",
        "meta_description": "Expert house construction in Puri. Coastal construction specialists building quality homes in the holy city.",
        "faqs": [
            {"question": "How do you handle coastal construction challenges?", "answer": "We use corrosion-resistant materials and special coatings for coastal environments."}
        ]
    },
    {
        "id": "city-khordha",
        "name": "Khordha",
        "slug": "house-construction-khordha",
        "service_type": "House Construction",
        "content": """<h2>House Construction in Khordha</h2>
<p>Decorous offers affordable house construction services in Khordha district. Whether you're building in Khordha town or nearby areas, our team delivers quality construction at competitive prices.</p>""",
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "meta_title": "House Construction in Khordha | Affordable Home Builders | Decorous",
        "meta_description": "Affordable house construction in Khordha. Quality home building services at competitive prices by Decorous.",
        "faqs": [
            {"question": "Is construction cheaper in Khordha compared to Bhubaneswar?", "answer": "Yes, construction costs in Khordha are typically 8-10% lower than Bhubaneswar."}
        ]
    },
    {
        "id": "city-rourkela",
        "name": "Rourkela",
        "slug": "house-construction-rourkela",
        "service_type": "House Construction",
        "content": """<h2>House Construction in Rourkela</h2>
<p>Decorous extends its premium construction services to the Steel City of Odisha. Our Rourkela team brings the same quality and professionalism to every home we build.</p>""",
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "meta_title": "House Construction in Rourkela | Home Builders | Decorous",
        "meta_description": "Trusted house construction company in Rourkela. Build your dream home with Decorous - Steel City's preferred builder.",
        "faqs": [
            {"question": "Do you have a local team in Rourkela?", "answer": "Yes, we have a dedicated team and material partners in Rourkela."}
        ]
    },
    {
        "id": "city-berhampur",
        "name": "Berhampur",
        "slug": "house-construction-berhampur",
        "service_type": "House Construction",
        "content": """<h2>House Construction in Berhampur</h2>
<p>South Odisha's silk city deserves premium construction. Decorous brings expert house building services to Berhampur and surrounding areas in Ganjam district.</p>""",
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "meta_title": "House Construction in Berhampur | Home Builders | Decorous",
        "meta_description": "Quality house construction services in Berhampur. Decorous - South Odisha's trusted construction company.",
        "faqs": [
            {"question": "Do you provide services in all of Ganjam district?", "answer": "Yes, we serve Berhampur and all major towns in Ganjam district."}
        ]
    },
    {
        "id": "city-sambalpur",
        "name": "Sambalpur",
        "slug": "house-construction-sambalpur",
        "service_type": "House Construction",
        "content": """<h2>House Construction in Sambalpur</h2>
<p>Western Odisha's cultural capital trusts Decorous for quality construction. We bring premium home building services to Sambalpur and nearby areas.</p>""",
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "meta_title": "House Construction in Sambalpur | Home Builders | Decorous",
        "meta_description": "Premium house construction in Sambalpur. Build with Decorous - Western Odisha's preferred construction partner.",
        "faqs": [
            {"question": "What areas in Western Odisha do you serve?", "answer": "We serve Sambalpur, Jharsuguda, Bargarh, and surrounding areas."}
        ]
    },
    {
        "id": "city-interior-bbsr",
        "name": "Bhubaneswar",
        "slug": "interior-designers-bhubaneswar",
        "service_type": "Interior Design",
        "content": """<h2>Interior Designers in Bhubaneswar</h2>
<p>Looking for the best interior designers in Bhubaneswar? Decorous Interior Design transforms homes and offices across the capital city with stunning, functional designs.</p>

<h3>Our Interior Design Services</h3>
<p>From modern minimalist to traditional Odia aesthetics, our designers create spaces that reflect your personality. We handle residential interiors, office spaces, and commercial establishments.</p>""",
        "image": "https://images.unsplash.com/photo-1580674287256-40141f08e9a5?q=85&w=800&auto=format&fit=crop",
        "meta_title": "Best Interior Designers in Bhubaneswar | Decorous",
        "meta_description": "Top interior designers in Bhubaneswar. Transform your home with Decorous - modern designs, quality execution, affordable pricing.",
        "faqs": [
            {"question": "What is the cost of interior design in Bhubaneswar?", "answer": "Interior design costs range from ₹500-₹1,500 per sqft depending on materials and complexity."},
            {"question": "Do you provide modular kitchen designs?", "answer": "Yes, modular kitchens are one of our specialties."}
        ]
    },
    {
        "id": "city-commercial-bbsr",
        "name": "Bhubaneswar",
        "slug": "commercial-construction-bhubaneswar",
        "service_type": "Commercial Construction",
        "content": """<h2>Commercial Construction in Bhubaneswar</h2>
<p>Decorous delivers world-class commercial construction services in Bhubaneswar. From corporate offices to retail spaces, we build commercial properties that drive business success.</p>""",
        "image": "https://images.unsplash.com/photo-1747085040719-55282cc206b9?q=85&w=800&auto=format&fit=crop",
        "meta_title": "Commercial Construction Company in Bhubaneswar | Decorous",
        "meta_description": "Leading commercial construction services in Bhubaneswar. Offices, retail, complexes - Decorous builds for business success.",
        "faqs": [
            {"question": "What types of commercial projects do you handle?", "answer": "We handle offices, retail spaces, hotels, hospitals, and educational institutions."}
        ]
    },
    {
        "id": "city-warehouse-odisha",
        "name": "Odisha",
        "slug": "warehouse-construction-odisha",
        "service_type": "Warehouse Construction",
        "content": """<h2>Warehouse Construction in Odisha</h2>
<p>Decorous specializes in industrial warehouse construction across Odisha. Our warehouses are designed for efficiency, durability, and cost-effectiveness.</p>""",
        "image": "https://images.unsplash.com/photo-1747085040719-55282cc206b9?q=85&w=800&auto=format&fit=crop",
        "meta_title": "Warehouse Construction Company in Odisha | Decorous",
        "meta_description": "Industrial warehouse construction services across Odisha. Efficient design, durable construction by Decorous.",
        "faqs": [
            {"question": "What sizes of warehouses can you build?", "answer": "We build warehouses from 5,000 sqft to 100,000+ sqft."}
        ]
    },
    {
        "id": "city-peb-odisha",
        "name": "Odisha",
        "slug": "peb-construction-odisha",
        "service_type": "PEB Construction",
        "content": """<h2>PEB Construction Company in Odisha</h2>
<p>Decorous is Odisha's leading Pre-Engineered Building (PEB) construction company. Our PEB solutions offer faster construction, lower costs, and superior quality.</p>""",
        "image": "https://images.unsplash.com/photo-1734555772444-469ee8b45914?q=85&w=800&auto=format&fit=crop",
        "meta_title": "PEB Construction Company in Odisha | Decorous",
        "meta_description": "Leading PEB construction services in Odisha. Fast, cost-effective pre-engineered buildings by Decorous.",
        "faqs": [
            {"question": "What is the advantage of PEB over conventional construction?", "answer": "PEB offers 30-40% faster construction, lower costs, and greater design flexibility."}
        ]
    }
]

# Testimonials Data
testimonials_data = [
    {
        "id": "test-1",
        "name": "Rajesh Kumar",
        "location": "Patia, Bhubaneswar",
        "project_type": "3BHK Duplex",
        "rating": 5,
        "content": "Decorous built our dream home exactly as we envisioned. The team was professional, transparent about costs, and delivered on time. Highly recommended for anyone looking to build in Bhubaneswar!",
        "image": None
    },
    {
        "id": "test-2",
        "name": "Priya Mohanty",
        "location": "Saheed Nagar, Bhubaneswar",
        "project_type": "Villa Construction",
        "rating": 5,
        "content": "From design to execution, Decorous exceeded our expectations. Their attention to detail and quality of work is outstanding. Our villa is the talk of the neighborhood!",
        "image": None
    },
    {
        "id": "test-3",
        "name": "Suresh Panda",
        "location": "Cuttack",
        "project_type": "Commercial Building",
        "rating": 5,
        "content": "We hired Decorous for our office building construction. Their commercial expertise and project management skills are top-notch. Completed on schedule with excellent quality.",
        "image": None
    },
    {
        "id": "test-4",
        "name": "Anita Das",
        "location": "Chandrasekharpur, Bhubaneswar",
        "project_type": "Interior Design",
        "rating": 5,
        "content": "The interior design team at Decorous transformed our flat into a stunning modern home. Their 3D visualization helped us see the final result before execution. Amazing work!",
        "image": None
    },
    {
        "id": "test-5",
        "name": "Manoj Industries",
        "location": "Khordha Industrial Area",
        "project_type": "Warehouse",
        "rating": 5,
        "content": "Decorous completed our 50,000 sqft warehouse ahead of schedule. Their PEB expertise and attention to industrial requirements made the project smooth and successful.",
        "image": None
    }
]

# Marks this as demo content from the original site template, not a real
# client testimonial. The homepage hides is_placeholder entries; admin edits
# clear the flag automatically since editing means it's real content now.
for _t in testimonials_data:
    _t["is_placeholder"] = True

# Projects Data
projects_data = [
    {
        "id": "proj-1",
        "title": "Modern Duplex Villa",
        "category": "Luxury Homes",
        "location": "Patia, Bhubaneswar",
        "area_sqft": 3500,
        "completion_time": "10 months",
        "description": "A stunning 4BHK duplex villa with contemporary design, landscaped garden, and premium finishes.",
        "images": ["https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop"],
        "featured": True
    },
    {
        "id": "proj-2",
        "title": "Corporate Office Complex",
        "category": "Commercial Buildings",
        "location": "Chandrasekharpur, Bhubaneswar",
        "area_sqft": 25000,
        "completion_time": "14 months",
        "description": "A modern 5-floor corporate office building with state-of-the-art facilities and sustainable design.",
        "images": ["https://images.unsplash.com/photo-1747085040719-55282cc206b9?q=85&w=800&auto=format&fit=crop"],
        "featured": True
    },
    {
        "id": "proj-3",
        "title": "Minimalist Home Interior",
        "category": "Interior Projects",
        "location": "Saheed Nagar, Bhubaneswar",
        "area_sqft": 2200,
        "completion_time": "3 months",
        "description": "Complete interior transformation with minimalist design, custom furniture, and smart home integration.",
        "images": ["https://images.unsplash.com/photo-1580674287256-40141f08e9a5?q=85&w=800&auto=format&fit=crop"],
        "featured": True
    },
    {
        "id": "proj-4",
        "title": "Industrial Warehouse",
        "category": "Warehouses",
        "location": "Khordha Industrial Area",
        "area_sqft": 50000,
        "completion_time": "6 months",
        "description": "Pre-engineered warehouse with high bay storage, loading docks, and office space.",
        "images": ["https://images.unsplash.com/photo-1747085040719-55282cc206b9?q=85&w=800&auto=format&fit=crop"],
        "featured": False
    },
    {
        "id": "proj-5",
        "title": "Premium 3BHK Apartment",
        "category": "Luxury Homes",
        "location": "Nayapalli, Bhubaneswar",
        "area_sqft": 1800,
        "completion_time": "8 months",
        "description": "Elegant 3BHK home with modern amenities, vastu-compliant design, and premium interiors.",
        "images": ["https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop"],
        "featured": False
    },
    {
        "id": "proj-6",
        "title": "Retail Shopping Complex",
        "category": "Commercial Buildings",
        "location": "Cuttack",
        "area_sqft": 35000,
        "completion_time": "18 months",
        "description": "Multi-floor retail complex with modern facade, escalators, and ample parking.",
        "images": ["https://images.unsplash.com/photo-1747085040719-55282cc206b9?q=85&w=800&auto=format&fit=crop"],
        "featured": False
    }
]

# Marks this as demo content from the original site template (stock photos,
# not a real completed project). The homepage hides is_placeholder entries;
# admin edits clear the flag automatically since editing means it's real now.
for _p in projects_data:
    _p["is_placeholder"] = True

# Blog Posts Data
blog_posts_data = [
    {
        "id": "blog-1",
        "title": "Cost of Building a House in Bhubaneswar 2024 - Complete Guide",
        "slug": "cost-building-house-bhubaneswar-2024",
        "excerpt": "Discover the complete breakdown of house construction costs in Bhubaneswar. From materials to labor, understand what goes into building your dream home.",
        "category": "Construction Cost",
        "tags": ["construction cost", "bhubaneswar", "house building", "budget"],
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Cost of Building a House in Bhubaneswar 2024 | Complete Guide",
        "meta_description": "Complete guide to house construction costs in Bhubaneswar. Learn about per sqft rates, material costs, and budget planning for your dream home.",
        "content": """<h2>Understanding House Construction Costs in Bhubaneswar</h2>
<p>Building a house in Bhubaneswar requires careful financial planning. As the capital city of Odisha, Bhubaneswar offers diverse options for homeowners looking to construct their dream homes. In this comprehensive guide, we break down all the costs involved in house construction.</p>

<h3>Current Construction Rates in Bhubaneswar (2024)</h3>
<p>The average construction cost in Bhubaneswar ranges from ₹1,700 to ₹2,400 per square foot. This variation depends on several factors including the quality of materials, design complexity, and finishing standards.</p>

<h4>Basic Construction: ₹1,700/sqft</h4>
<p>Basic construction includes standard materials, simple designs, and essential finishes. Suitable for budget-conscious homeowners who prioritize functionality over luxury.</p>

<h4>Standard Construction: ₹2,000/sqft</h4>
<p>Standard construction offers a balance between quality and cost. It includes better quality materials, improved finishes, and more design flexibility.</p>

<h4>Premium Construction: ₹2,400/sqft</h4>
<p>Premium construction uses the best materials available, incorporates advanced design elements, and includes luxury finishes throughout the home.</p>

<h3>Cost Breakdown by Component</h3>
<p>Understanding where your money goes helps in better budget planning:</p>
<ul>
<li><strong>Foundation and Structure (30-35%):</strong> This includes excavation, foundation, columns, beams, and slabs.</li>
<li><strong>Brickwork and Plastering (15-20%):</strong> Walls, internal plastering, and external finishes.</li>
<li><strong>Electrical and Plumbing (12-15%):</strong> Wiring, fixtures, pipes, and sanitary fittings.</li>
<li><strong>Flooring and Tiling (10-12%):</strong> Floor tiles, wall tiles, and installation.</li>
<li><strong>Doors and Windows (8-10%):</strong> Wooden or UPVC doors and windows.</li>
<li><strong>Painting (5-7%):</strong> Interior and exterior painting.</li>
<li><strong>Miscellaneous (10-15%):</strong> Labour, transportation, permits, and contingencies.</li>
</ul>

<h3>Factors Affecting Construction Cost</h3>
<p>Several factors can influence your final construction cost:</p>
<ul>
<li>Location within Bhubaneswar (prime areas may have higher labor costs)</li>
<li>Design complexity and architectural features</li>
<li>Quality and brand of materials chosen</li>
<li>Season of construction (monsoon can cause delays)</li>
<li>Accessibility of construction site</li>
</ul>

<h3>Tips to Optimize Your Construction Budget</h3>
<ol>
<li><strong>Plan Thoroughly:</strong> Invest time in planning to avoid costly changes later.</li>
<li><strong>Choose the Right Contractor:</strong> Partner with experienced builders like Decorous who offer transparent pricing.</li>
<li><strong>Buy Materials Wisely:</strong> Compare prices and consider bulk purchases for savings.</li>
<li><strong>Phase Your Construction:</strong> If budget is tight, consider building in phases.</li>
<li><strong>Monitor Quality:</strong> Regular site visits ensure quality and prevent costly repairs later.</li>
</ol>

<h3>Get a Free Estimate</h3>
<p>Ready to build your dream home in Bhubaneswar? Contact Decorous for a free, detailed construction estimate tailored to your requirements.</p>"""
    },
    {
        "id": "blog-2",
        "title": "Construction Cost Per Sqft in Odisha - Area-wise Comparison",
        "slug": "construction-cost-sqft-odisha",
        "excerpt": "Compare construction costs across different cities in Odisha. From Bhubaneswar to Rourkela, understand regional pricing variations.",
        "category": "Construction Cost",
        "tags": ["construction cost", "odisha", "sqft rate", "comparison"],
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Construction Cost Per Sqft in Odisha 2024 | City-wise Comparison",
        "meta_description": "Compare construction costs per sqft across Odisha cities. Bhubaneswar, Cuttack, Puri, Rourkela rates compared.",
        "content": """<h2>Construction Costs Across Odisha</h2>
<p>Construction costs vary significantly across different cities in Odisha. This comprehensive guide compares rates across major cities to help you plan your construction budget effectively.</p>

<h3>City-wise Construction Cost Comparison</h3>

<h4>Bhubaneswar</h4>
<p>As the capital city, Bhubaneswar has the highest construction costs in Odisha. The average rate ranges from ₹1,700 to ₹2,400 per sqft. Prime localities like Patia, Chandrasekharpur, and Saheed Nagar may have slightly higher rates due to better infrastructure and accessibility.</p>

<h4>Cuttack</h4>
<p>The Silver City offers slightly lower rates than Bhubaneswar. Construction costs range from ₹1,600 to ₹2,300 per sqft. Areas near the Mahanadi riverbank may require additional foundation work due to soil conditions.</p>

<h4>Puri</h4>
<p>Coastal construction in Puri requires special considerations. Rates range from ₹1,750 to ₹2,500 per sqft. The higher end accounts for corrosion-resistant materials needed for coastal environments.</p>

<h4>Rourkela</h4>
<p>Western Odisha's Steel City offers competitive rates between ₹1,500 to ₹2,200 per sqft. The industrial presence keeps material costs reasonable.</p>

<h4>Sambalpur</h4>
<p>Construction costs in Sambalpur range from ₹1,450 to ₹2,100 per sqft, making it one of the more affordable options in Odisha.</p>

<h3>Why Costs Vary by Location</h3>
<ul>
<li><strong>Material Transportation:</strong> Distance from material sources affects costs</li>
<li><strong>Labor Availability:</strong> Skilled labor costs vary by region</li>
<li><strong>Land Rates:</strong> Higher land values often correlate with higher construction standards</li>
<li><strong>Climate Factors:</strong> Coastal areas require special materials</li>
</ul>"""
    },
    {
        "id": "blog-3",
        "title": "Step-by-Step House Construction Process in India",
        "slug": "step-by-step-house-construction-process",
        "excerpt": "Complete guide to house construction process from land purchase to final handover. Learn each stage of building your dream home.",
        "category": "Construction Guide",
        "tags": ["construction process", "house building", "guide", "steps"],
        "image": "https://images.unsplash.com/photo-1632516160994-b4463d4e19d2?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Step-by-Step House Construction Process | Complete Guide",
        "meta_description": "Learn the complete house construction process from start to finish. Expert guide covering all stages of building your dream home.",
        "content": """<h2>The Complete House Construction Journey</h2>
<p>Building a house involves multiple stages, each crucial for creating a safe, beautiful, and lasting home. This guide walks you through every step of the construction process.</p>

<h3>Stage 1: Pre-Construction Planning</h3>
<h4>Land Selection and Purchase</h4>
<p>Choose a plot that meets your requirements for size, location, and budget. Verify clear titles and ensure all legal documents are in order.</p>

<h4>Soil Testing</h4>
<p>Soil testing determines the type of foundation required. It's a critical step that affects the structural integrity of your building.</p>

<h4>Architectural Design</h4>
<p>Work with architects to create floor plans that optimize space, natural light, and ventilation while meeting your lifestyle needs.</p>

<h3>Stage 2: Approvals and Permits</h3>
<p>Obtain necessary approvals from local authorities including building plan approval, environmental clearances, and utility connections.</p>

<h3>Stage 3: Foundation Work</h3>
<p>The foundation is the most critical part of construction. Depending on soil conditions, this may be strip foundation, raft foundation, or pile foundation.</p>

<h3>Stage 4: Structural Construction</h3>
<p>This includes column and beam construction, slab casting, and brickwork. Quality materials and skilled labor are essential at this stage.</p>

<h3>Stage 5: MEP Installation</h3>
<p>Mechanical, Electrical, and Plumbing (MEP) work includes wiring, piping, and HVAC installations before plastering begins.</p>

<h3>Stage 6: Finishing Work</h3>
<p>Plastering, flooring, painting, door and window installation, and final touches transform the structure into a livable home.</p>

<h3>Stage 7: Final Inspection and Handover</h3>
<p>A thorough quality check ensures everything meets standards before the final handover to the homeowner.</p>"""
    },
    {
        "id": "blog-4",
        "title": "How to Choose the Best Construction Company in Bhubaneswar",
        "slug": "choose-best-construction-company-bhubaneswar",
        "excerpt": "Essential tips for selecting a reliable construction company. Learn what to look for when hiring home builders in Bhubaneswar.",
        "category": "Construction Tips",
        "tags": ["construction company", "home builders", "bhubaneswar", "tips"],
        "image": "https://images.unsplash.com/photo-1628146023674-ede6049609b1?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "How to Choose Best Construction Company in Bhubaneswar",
        "meta_description": "Tips for selecting the right construction company in Bhubaneswar. What to look for when hiring home builders.",
        "content": """<h2>Selecting the Right Construction Partner</h2>
<p>Choosing a construction company is one of the most important decisions you'll make when building your home. The right partner ensures quality, transparency, and peace of mind throughout the project.</p>

<h3>Key Factors to Consider</h3>

<h4>1. Experience and Track Record</h4>
<p>Look for companies with proven experience in your type of project. Ask for references and visit completed projects if possible.</p>

<h4>2. Transparency in Pricing</h4>
<p>A trustworthy company provides detailed cost breakdowns with no hidden charges. Avoid those who give vague estimates.</p>

<h4>3. Quality of Materials</h4>
<p>Inquire about the brands and quality standards of materials they use. Premium materials may cost more but offer better durability.</p>

<h4>4. Project Management</h4>
<p>Ask about their project management process, timelines, and how they handle delays or issues.</p>

<h4>5. Legal Compliance</h4>
<p>Ensure they handle all permits and approvals properly and have necessary licenses and insurance.</p>

<h4>6. Communication</h4>
<p>Clear, regular communication keeps you informed and involved throughout the construction process.</p>

<h3>Red Flags to Watch Out For</h3>
<ul>
<li>Reluctance to provide detailed written estimates</li>
<li>No references or portfolio to show</li>
<li>Demands for large upfront payments</li>
<li>Unrealistic timelines or cost estimates</li>
<li>Poor reviews or unresolved complaints</li>
</ul>"""
    },
    {
        "id": "blog-5",
        "title": "10 Common Mistakes to Avoid When Building a House",
        "slug": "mistakes-avoid-building-house",
        "excerpt": "Learn from others' mistakes. Avoid these common errors that can derail your house construction project.",
        "category": "Construction Tips",
        "tags": ["mistakes", "house building", "tips", "construction"],
        "image": "https://images.unsplash.com/photo-1632516160994-b4463d4e19d2?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "10 Mistakes to Avoid When Building a House | Expert Tips",
        "meta_description": "Avoid these common house construction mistakes. Expert advice to ensure a smooth building experience.",
        "content": """<h2>Avoid These Construction Pitfalls</h2>
<p>Building a house is a major investment. Avoid these common mistakes to ensure a smooth construction experience and a quality home.</p>

<h3>1. Inadequate Budget Planning</h3>
<p>Always add 15-20% contingency to your budget for unexpected expenses. Underestimating costs leads to compromises later.</p>

<h3>2. Skipping Soil Testing</h3>
<p>Soil testing is essential for proper foundation design. Skipping it can lead to structural issues later.</p>

<h3>3. Not Getting Detailed Plans</h3>
<p>Vague plans lead to confusion and costly changes during construction. Invest in detailed architectural and structural drawings.</p>

<h3>4. Choosing the Cheapest Contractor</h3>
<p>The lowest quote often means corners will be cut. Choose value over price.</p>

<h3>5. Ignoring Future Needs</h3>
<p>Plan for future expansion, family growth, and aging in place when designing your home.</p>

<h3>6. Poor Material Choices</h3>
<p>Cheap materials may save money initially but lead to higher maintenance and replacement costs.</p>

<h3>7. Not Monitoring Construction</h3>
<p>Regular site visits ensure quality standards are maintained throughout construction.</p>

<h3>8. Neglecting Ventilation and Lighting</h3>
<p>Natural light and ventilation are often overlooked in design. They significantly impact livability.</p>

<h3>9. Rushing Decisions</h3>
<p>Take time to make decisions about design, materials, and fixtures. Rushed choices often lead to regrets.</p>

<h3>10. No Written Agreements</h3>
<p>Always have detailed written contracts covering scope, timeline, costs, and warranty terms.</p>"""
    },
    {
        "id": "blog-6",
        "title": "Modern Duplex House Design Ideas for Bhubaneswar",
        "slug": "modern-duplex-house-design-bhubaneswar",
        "excerpt": "Explore stunning duplex house designs perfect for Bhubaneswar's climate and lifestyle. Get inspired for your dream home.",
        "category": "Design Ideas",
        "tags": ["duplex", "house design", "modern", "bhubaneswar"],
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Modern Duplex House Design Ideas Bhubaneswar | Decorous",
        "meta_description": "Beautiful modern duplex house design ideas for Bhubaneswar. Explore contemporary designs suited for Odisha's climate.",
        "content": """<h2>Contemporary Duplex Designs for Modern Living</h2>
<p>Duplex houses offer the perfect blend of privacy and space efficiency. Here are design ideas that work perfectly for Bhubaneswar's climate and lifestyle.</p>

<h3>Climate-Responsive Design</h3>
<p>Bhubaneswar's tropical climate requires designs that maximize natural ventilation and protect from monsoon rains. Consider large windows with proper overhangs, cross-ventilation layouts, and covered outdoor spaces.</p>

<h3>Popular Duplex Layouts</h3>
<h4>3BHK Duplex (1,800-2,200 sqft)</h4>
<p>Ground floor: Living room, kitchen, one bedroom, dining<br>First floor: Master bedroom, second bedroom, family area</p>

<h4>4BHK Duplex (2,500-3,500 sqft)</h4>
<p>Ground floor: Living room, kitchen, guest bedroom, dining, utility<br>First floor: Master suite, two bedrooms, study, terrace</p>

<h3>Modern Design Elements</h3>
<ul>
<li>Open floor plans connecting living spaces</li>
<li>Double-height living rooms with feature walls</li>
<li>Indoor-outdoor connection with covered patios</li>
<li>Smart home integration</li>
<li>Energy-efficient design with solar provisions</li>
</ul>"""
    },
    {
        "id": "blog-7",
        "title": "Interior Design Trends in Odisha 2024",
        "slug": "interior-design-trends-odisha-2024",
        "excerpt": "Discover the latest interior design trends popular in Odisha. From modern minimalism to traditional fusion.",
        "category": "Interior Design",
        "tags": ["interior design", "trends", "odisha", "2024"],
        "image": "https://images.unsplash.com/photo-1580674287256-40141f08e9a5?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Interior Design Trends in Odisha 2024 | Latest Styles",
        "meta_description": "Latest interior design trends in Odisha 2024. Modern minimalism, traditional fusion, and sustainable design.",
        "content": """<h2>Interior Design Trends Shaping Odisha Homes</h2>
<p>Interior design in Odisha is evolving, blending modern aesthetics with traditional Odia elements. Here are the top trends for 2024.</p>

<h3>1. Modern Minimalism</h3>
<p>Clean lines, neutral colors, and clutter-free spaces define this popular style. Less furniture, more impact.</p>

<h3>2. Traditional Fusion</h3>
<p>Incorporating Odisha's rich artistic heritage - Pattachitra art, applique work, and traditional crafts - into contemporary settings.</p>

<h3>3. Sustainable Design</h3>
<p>Eco-friendly materials, energy-efficient lighting, and plants are becoming essential elements.</p>

<h3>4. Modular Solutions</h3>
<p>Modular kitchens, wardrobes, and furniture that maximize space efficiency are highly sought after.</p>

<h3>5. Natural Materials</h3>
<p>Wood, stone, and natural textures bring warmth and character to modern homes.</p>

<h3>6. Smart Homes</h3>
<p>Integrated lighting, climate control, and security systems are becoming standard in premium homes.</p>"""
    },
    {
        "id": "blog-8",
        "title": "Warehouse Construction Guide - Planning to Completion",
        "slug": "warehouse-construction-guide",
        "excerpt": "Complete guide to warehouse construction in Odisha. From planning and permits to construction and finishing.",
        "category": "Industrial",
        "tags": ["warehouse", "industrial", "construction guide"],
        "image": "https://images.unsplash.com/photo-1747085040719-55282cc206b9?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Warehouse Construction Guide Odisha | Planning to Completion",
        "meta_description": "Complete warehouse construction guide for Odisha. Planning, permits, construction, and costs explained.",
        "content": """<h2>Building Efficient Warehouses</h2>
<p>Warehouses are the backbone of logistics and manufacturing. This guide covers everything you need to know about warehouse construction in Odisha.</p>

<h3>Planning Your Warehouse</h3>
<p>Consider your storage needs, material handling requirements, future expansion, and compliance requirements before finalizing the design.</p>

<h3>Location Selection</h3>
<p>Key factors include road connectivity, labor availability, proximity to ports/railways, and land costs. Industrial areas in Khordha, Cuttack, and Jharsuguda are popular choices.</p>

<h3>Construction Options</h3>
<h4>Conventional Construction</h4>
<p>Traditional RCC construction offers durability but longer construction time.</p>

<h4>Pre-Engineered Buildings (PEB)</h4>
<p>PEB offers 30-40% faster construction, lower costs, and clear span interiors ideal for warehousing.</p>

<h3>Essential Features</h3>
<ul>
<li>Adequate clear height (typically 8-12 meters)</li>
<li>Loading docks and levelers</li>
<li>Proper floor load capacity</li>
<li>Fire safety systems</li>
<li>Ventilation and lighting</li>
<li>Security infrastructure</li>
</ul>"""
    },
    {
        "id": "blog-9",
        "title": "Advantages of Pre-Engineered Buildings (PEB)",
        "slug": "advantages-peb-buildings",
        "excerpt": "Discover why PEB construction is gaining popularity in Odisha. Cost savings, speed, and flexibility explained.",
        "category": "Industrial",
        "tags": ["peb", "pre-engineered", "industrial", "benefits"],
        "image": "https://images.unsplash.com/photo-1734555772444-469ee8b45914?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Advantages of Pre-Engineered Buildings PEB | Why Choose PEB",
        "meta_description": "Benefits of PEB construction. Faster, cheaper, and more flexible than conventional construction.",
        "content": """<h2>Why Pre-Engineered Buildings Are the Future</h2>
<p>Pre-Engineered Buildings (PEB) have revolutionized industrial and commercial construction. Here's why more businesses in Odisha are choosing PEB.</p>

<h3>Speed of Construction</h3>
<p>PEB structures can be erected 30-40% faster than conventional buildings. Components are manufactured off-site and assembled quickly on-site.</p>

<h3>Cost Efficiency</h3>
<p>Lower material costs, reduced labor requirements, and faster completion translate to significant savings.</p>

<h3>Design Flexibility</h3>
<p>PEB offers clear span interiors up to 90 meters wide, customizable lengths, and easy expansion options.</p>

<h3>Quality Control</h3>
<p>Factory manufacturing ensures consistent quality, precise specifications, and strict adherence to standards.</p>

<h3>Durability</h3>
<p>With proper maintenance, PEB structures last 50+ years. Galvanized components resist corrosion.</p>

<h3>Applications</h3>
<ul>
<li>Warehouses and distribution centers</li>
<li>Manufacturing facilities</li>
<li>Showrooms and retail spaces</li>
<li>Sports facilities and auditoriums</li>
<li>Agricultural buildings</li>
</ul>"""
    },
    {
        "id": "blog-10",
        "title": "Budget House Construction Tips for First-Time Builders",
        "slug": "budget-house-construction-tips",
        "excerpt": "Building on a budget? Learn smart strategies to construct a quality home without breaking the bank.",
        "category": "Construction Tips",
        "tags": ["budget", "first-time", "tips", "affordable"],
        "image": "https://images.unsplash.com/photo-1632516160994-b4463d4e19d2?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Budget House Construction Tips | Build Affordably",
        "meta_description": "Smart tips for budget house construction. Build quality homes affordably with these expert strategies.",
        "content": """<h2>Smart Strategies for Budget Construction</h2>
<p>Building a home on a budget doesn't mean compromising on quality. Here are strategies to maximize value without overspending.</p>

<h3>Plan Efficiently</h3>
<p>A well-planned, compact design is more cost-effective than sprawling layouts. Optimize every square foot.</p>

<h3>Choose Basic but Quality</h3>
<p>Opt for basic construction grade with quality materials. Upgrade finishes later when budget allows.</p>

<h3>Standardize Dimensions</h3>
<p>Standard sizes for doors, windows, and rooms reduce customization costs and material waste.</p>

<h3>Phase Your Construction</h3>
<p>Build the essential structure first. Add features like compound walls, landscaping, and additional rooms later.</p>

<h3>Buy Materials Wisely</h3>
<p>Purchase in bulk, compare prices, and time your purchases to avoid peak season premiums.</p>

<h3>Invest in Structure</h3>
<p>Never compromise on foundation and structure. These are impossible to upgrade later and affect safety.</p>

<h3>Where to Save</h3>
<ul>
<li>Simple roof designs over complex ones</li>
<li>Indian marble over imported</li>
<li>PVC doors for bathrooms</li>
<li>Standard fittings over designer pieces</li>
</ul>"""
    },
    {
        "id": "blog-11",
        "title": "Vastu Tips for House Construction in Odisha",
        "slug": "vastu-tips-house-construction-odisha",
        "excerpt": "Important Vastu considerations for your new home. Balance traditional wisdom with modern design.",
        "category": "Design Ideas",
        "tags": ["vastu", "house construction", "odisha", "traditional"],
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Vastu Tips for House Construction Odisha | Expert Guide",
        "meta_description": "Important Vastu tips for house construction in Odisha. Traditional wisdom for modern homes.",
        "content": """<h2>Vastu Shastra for Modern Homes</h2>
<p>Vastu Shastra, the ancient science of architecture, continues to influence home design in Odisha. Here are key principles to consider.</p>

<h3>Site Selection</h3>
<p>Prefer square or rectangular plots. Avoid T-shaped or irregular plots. North or east-facing plots are considered auspicious.</p>

<h3>Main Entrance</h3>
<p>The main door should ideally face north, east, or northeast. Avoid south-facing entrances if possible.</p>

<h3>Room Placement</h3>
<ul>
<li><strong>Master Bedroom:</strong> Southwest corner</li>
<li><strong>Kitchen:</strong> Southeast corner</li>
<li><strong>Pooja Room:</strong> Northeast corner</li>
<li><strong>Living Room:</strong> North or east</li>
<li><strong>Bathrooms:</strong> West or northwest</li>
</ul>

<h3>Modern Vastu Integration</h3>
<p>Modern architects can incorporate Vastu principles without compromising functionality. Work with experienced designers who understand both aspects.</p>"""
    },
    {
        "id": "blog-12",
        "title": "Understanding TMT Bars - A Homeowner's Guide",
        "slug": "understanding-tmt-bars-guide",
        "excerpt": "Everything you need to know about TMT bars - the backbone of your construction. Grades, quality, and selection tips.",
        "category": "Materials",
        "tags": ["tmt bars", "materials", "construction", "quality"],
        "image": "https://images.unsplash.com/photo-1628146023674-ede6049609b1?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "TMT Bars Guide for Homeowners | Quality & Selection",
        "meta_description": "Complete guide to TMT bars for construction. Understand grades, quality testing, and how to select the best TMT bars.",
        "content": """<h2>TMT Bars - The Structural Backbone</h2>
<p>TMT (Thermo-Mechanically Treated) bars are crucial for any construction. Understanding their grades and quality helps ensure structural safety.</p>

<h3>TMT Grades Explained</h3>
<h4>Fe 415</h4>
<p>Standard grade suitable for residential construction. Good balance of strength and ductility.</p>

<h4>Fe 500</h4>
<p>Higher strength grade recommended for multi-story buildings and areas with seismic activity.</p>

<h4>Fe 550</h4>
<p>Premium grade for heavy-duty construction and critical structures.</p>

<h3>Quality Checks</h3>
<ul>
<li>Check ISI mark certification</li>
<li>Verify brand and manufacturer</li>
<li>Look for consistent ribbing pattern</li>
<li>Check for rust resistance</li>
<li>Request mill test certificates</li>
</ul>

<h3>Recommended Brands</h3>
<p>Tata Tiscon, SAIL, Kamdhenu, Vizag Steel, and Jindal are among the trusted brands available in Odisha.</p>"""
    },
    {
        "id": "blog-13",
        "title": "Choosing the Right Cement for Your Construction",
        "slug": "choosing-right-cement-construction",
        "excerpt": "Different types of cement for different purposes. Guide to selecting the right cement for your project.",
        "category": "Materials",
        "tags": ["cement", "materials", "construction", "guide"],
        "image": "https://images.unsplash.com/photo-1632516160994-b4463d4e19d2?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Choosing Right Cement for Construction | Types & Uses",
        "meta_description": "Guide to different types of cement and their uses. Select the right cement for your construction project.",
        "content": """<h2>Cement Selection Guide</h2>
<p>Cement is the binding agent in construction. Different types serve different purposes.</p>

<h3>Types of Cement</h3>
<h4>OPC (Ordinary Portland Cement)</h4>
<p>Standard cement for general construction. Available in 33, 43, and 53 grades.</p>

<h4>PPC (Portland Pozzolana Cement)</h4>
<p>Better for plastering, tiling, and masonry. Offers better finish and resistance to chemical attacks.</p>

<h4>PSC (Portland Slag Cement)</h4>
<p>Ideal for mass construction and marine environments. Generates less heat during setting.</p>

<h3>Which to Use Where?</h3>
<ul>
<li><strong>Foundation & Columns:</strong> OPC 53 grade</li>
<li><strong>Slabs & Beams:</strong> OPC 43 or 53 grade</li>
<li><strong>Plastering:</strong> PPC</li>
<li><strong>Tiling:</strong> PPC or White cement</li>
</ul>

<h3>Trusted Brands in Odisha</h3>
<p>UltraTech, ACC, Ambuja, Dalmia, and OCL are widely available and trusted in Odisha.</p>"""
    },
    {
        "id": "blog-14",
        "title": "Waterproofing Solutions for Odisha's Climate",
        "slug": "waterproofing-solutions-odisha-climate",
        "excerpt": "Protect your home from monsoon damage. Comprehensive waterproofing guide for Odisha's challenging climate.",
        "category": "Construction Tips",
        "tags": ["waterproofing", "monsoon", "odisha", "protection"],
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Waterproofing Solutions for Odisha Climate | Expert Guide",
        "meta_description": "Waterproofing guide for Odisha homes. Protect from monsoon damage with these solutions.",
        "content": """<h2>Waterproofing for Odisha's Monsoons</h2>
<p>Odisha's heavy monsoons make waterproofing critical. Proper waterproofing prevents damage and maintains structural integrity.</p>

<h3>Critical Areas</h3>
<ul>
<li>Terrace and roof</li>
<li>Bathroom and kitchen</li>
<li>External walls</li>
<li>Basement (if any)</li>
<li>Foundation</li>
</ul>

<h3>Waterproofing Methods</h3>
<h4>Bituminous Coating</h4>
<p>Cost-effective solution for roofs and foundations. Applied as liquid and forms a protective layer.</p>

<h4>Cementitious Waterproofing</h4>
<p>Ideal for bathrooms and internal wet areas. Easy to apply and long-lasting.</p>

<h4>Polyurethane Waterproofing</h4>
<p>Premium solution for exposed terraces. Flexible and UV resistant.</p>

<h3>Prevention Tips</h3>
<ul>
<li>Ensure proper slope on terraces</li>
<li>Check drainage regularly</li>
<li>Inspect and maintain annually</li>
<li>Address cracks immediately</li>
</ul>"""
    },
    {
        "id": "blog-15",
        "title": "Kitchen Design Ideas for Indian Homes",
        "slug": "kitchen-design-ideas-indian-homes",
        "excerpt": "Modern kitchen designs suited for Indian cooking. Efficient layouts, storage solutions, and material choices.",
        "category": "Interior Design",
        "tags": ["kitchen", "design", "modular", "indian"],
        "image": "https://images.unsplash.com/photo-1580674287256-40141f08e9a5?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Kitchen Design Ideas for Indian Homes | Modern Solutions",
        "meta_description": "Modern kitchen design ideas for Indian cooking. Efficient layouts and storage solutions.",
        "content": """<h2>Designing Kitchens for Indian Lifestyles</h2>
<p>Indian kitchens have unique requirements. From heavy-duty cooking to extensive storage, designs must balance functionality and aesthetics.</p>

<h3>Popular Kitchen Layouts</h3>
<h4>L-Shaped</h4>
<p>Most popular for Indian homes. Efficient workflow and good storage options.</p>

<h4>U-Shaped</h4>
<p>Ideal for larger kitchens. Maximum counter space and storage.</p>

<h4>Parallel</h4>
<p>Great for narrow spaces. Two work zones for efficient cooking.</p>

<h3>Essential Features</h3>
<ul>
<li>Heavy-duty chimney for Indian cooking</li>
<li>Deep sink for large vessels</li>
<li>Ample counter space for prep work</li>
<li>Pull-out organizers for masalas</li>
<li>Dedicated storage for pressure cookers and utensils</li>
</ul>

<h3>Material Choices</h3>
<p>Granite or quartz countertops resist heat and stains. Marine plywood with laminate finish offers durability for cabinets.</p>"""
    },
    {
        "id": "blog-16",
        "title": "Flooring Options - Tiles vs Marble vs Granite",
        "slug": "flooring-options-tiles-marble-granite",
        "excerpt": "Compare popular flooring options for your home. Costs, durability, and maintenance of different materials.",
        "category": "Materials",
        "tags": ["flooring", "tiles", "marble", "granite"],
        "image": "https://images.unsplash.com/photo-1580674287256-40141f08e9a5?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Flooring Options Comparison | Tiles vs Marble vs Granite",
        "meta_description": "Compare flooring options for your home. Tiles, marble, and granite costs and benefits explained.",
        "content": """<h2>Choosing the Right Flooring</h2>
<p>Flooring significantly impacts your home's look and maintenance. Here's a comparison of popular options.</p>

<h3>Vitrified Tiles</h3>
<p><strong>Cost:</strong> ₹40-150/sqft<br>
<strong>Pros:</strong> Affordable, low maintenance, variety of designs<br>
<strong>Cons:</strong> Can look artificial, may crack under impact</p>

<h3>Marble</h3>
<p><strong>Cost:</strong> ₹80-500/sqft<br>
<strong>Pros:</strong> Premium look, cool surface, natural patterns<br>
<strong>Cons:</strong> Requires regular polishing, can stain, expensive</p>

<h3>Granite</h3>
<p><strong>Cost:</strong> ₹60-300/sqft<br>
<strong>Pros:</strong> Extremely durable, low maintenance, great for high-traffic areas<br>
<strong>Cons:</strong> Limited patterns, can feel hard</p>

<h3>Recommendation</h3>
<ul>
<li><strong>Living Room:</strong> Marble or premium tiles</li>
<li><strong>Bedroom:</strong> Wooden flooring or tiles</li>
<li><strong>Kitchen:</strong> Granite or anti-skid tiles</li>
<li><strong>Bathroom:</strong> Anti-skid ceramic tiles</li>
</ul>"""
    },
    {
        "id": "blog-17",
        "title": "Solar Panel Installation Guide for Homes in Odisha",
        "slug": "solar-panel-installation-guide-odisha",
        "excerpt": "Go green and save on electricity. Guide to solar panel installation for residential homes in Odisha.",
        "category": "Green Building",
        "tags": ["solar", "renewable", "energy", "green"],
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Solar Panel Installation Guide Odisha | Residential Solar",
        "meta_description": "Guide to solar panel installation in Odisha homes. Costs, subsidies, and benefits explained.",
        "content": """<h2>Harnessing Solar Energy in Odisha</h2>
<p>Odisha receives abundant sunlight, making solar energy an excellent investment for homeowners.</p>

<h3>Types of Solar Systems</h3>
<h4>On-Grid System</h4>
<p>Connected to the electricity grid. Excess power is exported and credited to your bill.</p>

<h4>Off-Grid System</h4>
<p>Independent with battery storage. Ideal for areas with unreliable power supply.</p>

<h4>Hybrid System</h4>
<p>Combines both approaches for maximum flexibility and backup.</p>

<h3>Installation Costs</h3>
<p>Average cost: ₹50,000-80,000 per kW before subsidies. Government subsidies can reduce costs by 20-40%.</p>

<h3>Benefits</h3>
<ul>
<li>Reduce electricity bills by 70-90%</li>
<li>25-year lifespan with minimal maintenance</li>
<li>Increase property value</li>
<li>Contribute to environmental sustainability</li>
</ul>"""
    },
    {
        "id": "blog-18",
        "title": "Home Loan Guide for First-Time Buyers in Odisha",
        "slug": "home-loan-guide-first-time-buyers",
        "excerpt": "Navigate the home loan process with confidence. Tips for getting the best rates and terms.",
        "category": "Finance",
        "tags": ["home loan", "finance", "first-time", "buyers"],
        "image": "https://images.unsplash.com/photo-1628146023674-ede6049609b1?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Home Loan Guide for First-Time Buyers Odisha",
        "meta_description": "Navigate home loans with confidence. Tips for getting best rates for first-time buyers.",
        "content": """<h2>Securing Your Home Loan</h2>
<p>A home loan makes your dream home achievable. Here's how to navigate the process.</p>

<h3>Eligibility Factors</h3>
<ul>
<li>Age (21-65 years typically)</li>
<li>Income and employment stability</li>
<li>Credit score (750+ preferred)</li>
<li>Existing financial obligations</li>
</ul>

<h3>Documentation Required</h3>
<ul>
<li>Identity and address proof</li>
<li>Income proof (salary slips/IT returns)</li>
<li>Property documents</li>
<li>Bank statements</li>
</ul>

<h3>Tips for Better Terms</h3>
<ol>
<li>Maintain a high credit score</li>
<li>Compare rates across banks</li>
<li>Negotiate processing fees</li>
<li>Consider shorter tenure for lower interest</li>
<li>Look for pre-approved offers</li>
</ol>

<h3>Current Interest Rates</h3>
<p>Home loan rates currently range from 8.5% to 10% depending on the lender and your profile.</p>"""
    },
    {
        "id": "blog-19",
        "title": "Luxury Villa Design Trends in Bhubaneswar",
        "slug": "luxury-villa-design-trends-bhubaneswar",
        "excerpt": "Explore the latest luxury villa design trends. Premium features, smart homes, and architectural excellence.",
        "category": "Design Ideas",
        "tags": ["luxury", "villa", "design", "bhubaneswar"],
        "image": "https://images.unsplash.com/photo-1766603636562-531bb3e1dda8?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Luxury Villa Design Trends Bhubaneswar | Premium Homes",
        "meta_description": "Latest luxury villa design trends in Bhubaneswar. Premium features for discerning homeowners.",
        "content": """<h2>Creating Luxury Living Spaces</h2>
<p>Luxury villas in Bhubaneswar are redefining premium living with innovative design and technology.</p>

<h3>Architectural Trends</h3>
<ul>
<li>Contemporary minimalist facades</li>
<li>Double-height living spaces</li>
<li>Indoor-outdoor living with glass walls</li>
<li>Private pools and landscaped gardens</li>
<li>Home theaters and entertainment rooms</li>
</ul>

<h3>Smart Home Features</h3>
<ul>
<li>Automated lighting and climate control</li>
<li>Integrated security systems</li>
<li>Voice-controlled appliances</li>
<li>Remote monitoring and control</li>
</ul>

<h3>Premium Materials</h3>
<ul>
<li>Imported Italian marble</li>
<li>European bathroom fixtures</li>
<li>Engineered hardwood flooring</li>
<li>Designer facade cladding</li>
</ul>"""
    },
    {
        "id": "blog-20",
        "title": "How to Get Building Plan Approval in Bhubaneswar",
        "slug": "building-plan-approval-bhubaneswar",
        "excerpt": "Complete guide to getting building plan approvals from BDA and BMC. Documents, process, and timeline.",
        "category": "Legal",
        "tags": ["approval", "bda", "bmc", "legal", "permits"],
        "image": "https://images.unsplash.com/photo-1628146023674-ede6049609b1?q=85&w=800&auto=format&fit=crop",
        "author": "Decorous Team",
        "meta_title": "Building Plan Approval Bhubaneswar | BDA BMC Guide",
        "meta_description": "Complete guide to building plan approval in Bhubaneswar. BDA and BMC process explained.",
        "content": """<h2>Navigating Building Approvals in Bhubaneswar</h2>
<p>Getting proper building approvals is essential for legal construction. Here's your guide to the process.</p>

<h3>Approval Authorities</h3>
<ul>
<li><strong>BDA (Bhubaneswar Development Authority):</strong> For areas under BDA jurisdiction</li>
<li><strong>BMC (Bhubaneswar Municipal Corporation):</strong> For municipal areas</li>
</ul>

<h3>Documents Required</h3>
<ul>
<li>Application form</li>
<li>Land ownership documents</li>
<li>Site plan and building plan</li>
<li>NOC from relevant departments</li>
<li>Structural design certificate</li>
<li>Fee receipts</li>
</ul>

<h3>Process Steps</h3>
<ol>
<li>Submit application with documents</li>
<li>Technical scrutiny</li>
<li>Site inspection</li>
<li>Approval issuance</li>
</ol>

<h3>Timeline</h3>
<p>Approvals typically take 30-45 days for residential buildings if all documents are complete.</p>

<h3>Common Issues</h3>
<ul>
<li>Incomplete documentation</li>
<li>Non-compliance with building bylaws</li>
<li>Encroachment on setbacks</li>
</ul>"""
    }
]

async def seed_database():
    """Seed the database with initial data"""
    print("Starting database seeding...")

    # Stamp real timestamps at seed time so the sitemap's <lastmod> reflects
    # when content actually entered the DB, instead of silently defaulting
    # to "today" (which would make every page look freshly changed on
    # every single sitemap request).
    now = datetime.now(timezone.utc)
    for doc in services_data + cities_data + testimonials_data + projects_data + blog_posts_data:
        doc.setdefault("created_at", now)
        doc.setdefault("updated_at", now)

    # Clear existing data
    await db.services.delete_many({})
    await db.cities.delete_many({})
    await db.testimonials.delete_many({})
    await db.projects.delete_many({})
    await db.blog_posts.delete_many({})

    # Insert services
    await db.services.insert_many(services_data)
    print(f"Inserted {len(services_data)} services")

    # Insert cities
    await db.cities.insert_many(cities_data)
    print(f"Inserted {len(cities_data)} cities")

    # Insert testimonials
    await db.testimonials.insert_many(testimonials_data)
    print(f"Inserted {len(testimonials_data)} testimonials")

    # Insert projects
    await db.projects.insert_many(projects_data)
    print(f"Inserted {len(projects_data)} projects")

    # Insert blog posts
    await db.blog_posts.insert_many(blog_posts_data)
    print(f"Inserted {len(blog_posts_data)} blog posts")

    print("Database seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_database())
