import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeadForm from '@/components/forms/LeadForm';
import Seo from '@/components/Seo';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    try {
      const response = await axios.get(`${API}/blog/${slug}`);
      setPost(response.data);
      
      // Fetch related posts
      const relatedRes = await axios.get(`${API}/blog?category=${response.data.category}&limit=3`);
      setRelatedPosts(relatedRes.data.filter(p => p.slug !== slug));
    } catch (error) {
      console.error('Error fetching blog post:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a365d]"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1a365d] mb-4">Article Not Found</h2>
          <Link to="/blog">
            <Button>View All Articles</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 md:pb-0">
      <Seo
        path={`/blog/${post.slug}`}
        title={`${post.title} | Decorous Blog`}
        description={post.excerpt}
        image={post.image}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.excerpt,
          "image": post.image,
          "datePublished": post.created_at,
          "dateModified": post.updated_at || post.created_at,
          "author": {"@type": "Organization", "name": post.author || "Decorous"},
          "publisher": {
            "@type": "Organization",
            "name": "Decorous",
            "logo": {"@type": "ImageObject", "url": "https://decorous.in/og-image.jpg"}
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://decorous.in/blog/${post.slug}`
          },
          "articleSection": post.category,
          "keywords": (post.tags || []).join(", ")
        }}
      />
      {/* Hero */}
      <section className="relative py-20 md:py-32" data-testid="blog-post-header">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${post.image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a365d] via-[#1a365d]/80 to-[#1a365d]/60"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 md:px-8 text-center">
          <span className="inline-block bg-[#F5A623] text-black px-4 py-1 rounded-full text-sm font-medium mb-4">
            {post.category}
          </span>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{post.title}</h1>
          <div className="flex items-center justify-center gap-6 text-white/80">
            <span className="flex items-center gap-2">
              <Calendar size={16} />
              {formatDate(post.created_at)}
            </span>
            <span className="flex items-center gap-2">
              <User size={16} />
              {post.author}
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12" data-testid="blog-post-content">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-4 mb-8">
                <Link to="/blog" className="flex items-center gap-2 text-[#1a365d] hover:text-[#F5A623]">
                  <ArrowLeft size={20} />
                  Back to Blog
                </Link>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 text-slate-500 hover:text-[#1a365d] ml-auto"
                  data-testid="share-btn"
                >
                  <Share2 size={20} />
                  Share
                </button>
              </div>
              
              <article className="prose-decorous">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </article>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <p className="font-semibold text-[#1a365d] mb-3">Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="bg-slate-100 px-3 py-1 rounded-full text-sm text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-[#1a365d] mb-6">Related Articles</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {relatedPosts.slice(0, 2).map((relPost) => (
                      <Link 
                        key={relPost.id}
                        to={`/blog/${relPost.slug}`}
                        className="bg-slate-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                      >
                        <div className="aspect-video overflow-hidden">
                          <img 
                            src={relPost.image} 
                            alt={relPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-[#1a365d] group-hover:text-[#F5A623] line-clamp-2">
                            {relPost.title}
                          </h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-8">
                <LeadForm 
                  source={`blog_${slug}`}
                  title="Get Free Consultation"
                />
                
                <div className="p-6 bg-slate-50 rounded-xl">
                  <h4 className="font-bold text-[#1a365d] mb-4">Quick Links</h4>
                  <div className="space-y-3">
                    <Link to="/cost-calculator" className="block text-slate-600 hover:text-[#F5A623]">
                      → Cost Calculator
                    </Link>
                    <Link to="/services" className="block text-slate-600 hover:text-[#F5A623]">
                      → Our Services
                    </Link>
                    <Link to="/projects" className="block text-slate-600 hover:text-[#F5A623]">
                      → View Projects
                    </Link>
                    <Link to="/contact" className="block text-slate-600 hover:text-[#F5A623]">
                      → Contact Us
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPostPage;
