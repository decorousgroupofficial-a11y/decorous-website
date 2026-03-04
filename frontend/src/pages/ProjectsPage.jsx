import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categories = ['All', 'Luxury Homes', 'Commercial Buildings', 'Interior Projects', 'Warehouses'];

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
      setFilteredProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (category) => {
    setActiveCategory(category);
    if (category === 'All') {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(projects.filter(p => p.category === category));
    }
  };

  return (
    <div className="pb-16 md:pb-0">
      {/* Page Header */}
      <section className="py-16 md:py-24 bg-[#1a365d] text-white" data-testid="projects-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">Our Projects</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            Explore our portfolio of completed construction projects across Odisha.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="py-8 bg-white border-b sticky top-16 md:top-20 z-30" data-testid="projects-filter">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleFilter(category)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-[#1a365d] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid={`filter-${category.toLowerCase().replace(' ', '-')}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-16 bg-slate-50" data-testid="projects-grid">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-xl h-80 animate-pulse"></div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">No projects found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
                  data-testid={`project-${project.id}`}
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img 
                      src={project.images[0]} 
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-[#F5A623] text-black px-3 py-1 rounded-full text-sm font-medium">
                        {project.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[#1a365d] mb-2">{project.title}</h3>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span>📍 {project.location}</span>
                      <span>📐 {project.area_sqft} sqft</span>
                      <span>⏱️ {project.completion_time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white" data-testid="projects-cta">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4">
            Want to See Your Project Here?
          </h2>
          <p className="text-slate-600 text-lg mb-8">
            Let's build something amazing together. Contact us for a free consultation.
          </p>
          <Link to="/contact">
            <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-12 px-8" data-testid="projects-cta-btn">
              Start Your Project
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ProjectsPage;
