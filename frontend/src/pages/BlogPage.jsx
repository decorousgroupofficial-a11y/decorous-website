import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categories = ['All', 'Construction Cost', 'Construction Tips', 'Construction Guide', 'Design Ideas', 'Interior Design', 'Materials', 'Industrial'];

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/blog?limit=30`);
      setPosts(response.data);
      setFilteredPosts(response.data);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (category) => {
    setActiveCategory(category);
    if (category === 'All') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(p => p.category === category));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="pb-16 md:pb-0">
      {/* Page Header */}
      <section className="py-16 md:py-24 bg-[#1a365d] text-white" data-testid="blog-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">Construction Blog</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            Expert insights, tips, and guides on house construction, interior design, and building your dream home in Odisha.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 bg-white border-b sticky top-16 md:top-20 z-30" data-testid="blog-filter">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleFilter(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-[#1a365d] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid={`blog-filter-${category.toLowerCase().replace(' ', '-')}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16 bg-slate-50" data-testid="blog-grid">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-xl h-96 animate-pulse"></div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">No articles found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <Link 
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
                  data-testid={`blog-card-${post.slug}`}
                >
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <span className="text-[#F5A623] text-sm font-medium">{post.category}</span>
                    <h3 className="text-lg font-bold text-[#1a365d] mt-2 mb-3 line-clamp-2 group-hover:text-[#F5A623] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {post.author}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white" data-testid="blog-cta">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4">
            Ready to Start Building?
          </h2>
          <p className="text-slate-600 text-lg mb-8">
            Apply what you've learned. Get a free consultation from our experts.
          </p>
          <Link to="/contact">
            <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-12 px-8" data-testid="blog-cta-btn">
              Get Free Consultation
              <ArrowRight className="ml-2" size={16} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
