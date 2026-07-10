import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Users, Phone, Mail, MapPin, Calendar, Filter, Trash2, MessageCircle, CheckCircle,
  Clock, XCircle, RefreshCw, Briefcase, Star, Plus, Pencil, X, ImagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { fileToCompressedBase64 } from '@/lib/erp-api';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const emptyProjectForm = {
  title: '', category: '', location: '', area_sqft: '', completion_time: '',
  description: '', featured: false, imageUrl: '',
};

const emptyTestimonialForm = {
  name: '', location: '', project_type: '', rating: 5, content: '', imageUrl: '',
};

// Renders the noindex/nofollow head tag for every admin/ERP-style internal page.
// robots.txt is advisory; this is enforced at the page level so misbehaving crawlers
// that ignore robots.txt still see "do not index" on the rendered HTML.
const NoIndexHelmet = () => (
  <Helmet>
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
    <meta name="googlebot" content="noindex, nofollow" />
  </Helmet>
);

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('leads');
  const navigate = useNavigate();

  // Projects
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [uploadingProjectImage, setUploadingProjectImage] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  // Testimonials
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonialForm);
  const [editingTestimonialId, setEditingTestimonialId] = useState(null);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [uploadingTestimonialImage, setUploadingTestimonialImage] = useState(false);
  const [savingTestimonial, setSavingTestimonial] = useState(false);

  const adminAuth = { username: 'admin', password };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/leads`, {
        auth: {
          username: 'admin',
          password: password
        }
      });
      setLeads(response.data.leads);
      setStats(response.data.stats);
    } catch (error) {
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to fetch leads');
      }
    } finally {
      setLoading(false);
    }
  }, [password]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      toast.error('Failed to fetch projects');
    }
  }, []);

  const fetchTestimonials = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/testimonials`);
      setTestimonials(response.data);
    } catch (error) {
      toast.error('Failed to fetch testimonials');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
      fetchProjects();
      fetchTestimonials();
    }
  }, [isAuthenticated, fetchLeads, fetchProjects, fetchTestimonials]);

  const uploadImage = async (file, setUploading) => {
    setUploading(true);
    try {
      const b64 = await fileToCompressedBase64(file, { maxDim: 1600, quality: 0.8 });
      const response = await axios.post(`${API}/admin/upload-image`, {
        content_type: file.type || 'image/jpeg',
        data_base64: b64,
      }, { auth: adminAuth });
      return `${BACKEND_URL}${response.data.url}`;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Image upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleProjectImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, setUploadingProjectImage);
    if (url) setProjectForm((f) => ({ ...f, imageUrl: url }));
  };

  const handleTestimonialImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, setUploadingTestimonialImage);
    if (url) setTestimonialForm((f) => ({ ...f, imageUrl: url }));
  };

  const startAddProject = () => {
    setProjectForm(emptyProjectForm);
    setEditingProjectId(null);
    setShowProjectForm(true);
  };

  const startEditProject = (project) => {
    setProjectForm({
      title: project.title,
      category: project.category,
      location: project.location,
      area_sqft: String(project.area_sqft),
      completion_time: project.completion_time,
      description: project.description,
      featured: project.featured,
      imageUrl: project.images?.[0] || '',
    });
    setEditingProjectId(project.id);
    setShowProjectForm(true);
  };

  const submitProject = async (e) => {
    e.preventDefault();
    if (!projectForm.title || !projectForm.location || !projectForm.imageUrl) {
      toast.error('Title, location, and a photo are required');
      return;
    }
    setSavingProject(true);
    try {
      const payload = {
        title: projectForm.title,
        category: projectForm.category,
        location: projectForm.location,
        area_sqft: parseInt(projectForm.area_sqft, 10) || 0,
        completion_time: projectForm.completion_time,
        description: projectForm.description,
        featured: projectForm.featured,
        images: [projectForm.imageUrl],
      };
      if (editingProjectId) {
        await axios.put(`${API}/admin/projects/${editingProjectId}`, payload, { auth: adminAuth });
        toast.success('Project updated');
      } else {
        await axios.post(`${API}/admin/projects`, payload, { auth: adminAuth });
        toast.success('Project added');
      }
      setShowProjectForm(false);
      fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save project');
    } finally {
      setSavingProject(false);
    }
  };

  const deleteProject = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await axios.delete(`${API}/admin/projects/${projectId}`, { auth: adminAuth });
      toast.success('Project deleted');
      fetchProjects();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const startAddTestimonial = () => {
    setTestimonialForm(emptyTestimonialForm);
    setEditingTestimonialId(null);
    setShowTestimonialForm(true);
  };

  const startEditTestimonial = (testimonial) => {
    setTestimonialForm({
      name: testimonial.name,
      location: testimonial.location,
      project_type: testimonial.project_type,
      rating: testimonial.rating,
      content: testimonial.content,
      imageUrl: testimonial.image || '',
    });
    setEditingTestimonialId(testimonial.id);
    setShowTestimonialForm(true);
  };

  const submitTestimonial = async (e) => {
    e.preventDefault();
    if (!testimonialForm.name || !testimonialForm.content) {
      toast.error('Name and testimonial text are required');
      return;
    }
    setSavingTestimonial(true);
    try {
      const payload = {
        name: testimonialForm.name,
        location: testimonialForm.location,
        project_type: testimonialForm.project_type,
        rating: parseInt(testimonialForm.rating, 10) || 5,
        content: testimonialForm.content,
        image: testimonialForm.imageUrl || null,
      };
      if (editingTestimonialId) {
        await axios.put(`${API}/admin/testimonials/${editingTestimonialId}`, payload, { auth: adminAuth });
        toast.success('Testimonial updated');
      } else {
        await axios.post(`${API}/admin/testimonials`, payload, { auth: adminAuth });
        toast.success('Testimonial added');
      }
      setShowTestimonialForm(false);
      fetchTestimonials();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save testimonial');
    } finally {
      setSavingTestimonial(false);
    }
  };

  const deleteTestimonial = async (testimonialId) => {
    if (!window.confirm('Delete this testimonial?')) return;
    try {
      await axios.delete(`${API}/admin/testimonials/${testimonialId}`, { auth: adminAuth });
      toast.success('Testimonial deleted');
      fetchTestimonials();
    } catch (error) {
      toast.error('Failed to delete testimonial');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.get(`${API}/admin/leads`, {
        auth: {
          username: 'admin',
          password: password
        }
      });
      setIsAuthenticated(true);
      toast.success('Login successful');
    } catch (error) {
      toast.error('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      await axios.patch(`${API}/admin/leads/${leadId}`, 
        { status },
        {
          auth: {
            username: 'admin',
            password: password
          }
        }
      );
      toast.success(`Lead marked as ${status}`);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const deleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      await axios.delete(`${API}/admin/leads/${leadId}`, {
        auth: {
          username: 'admin',
          password: password
        }
      });
      toast.success('Lead deleted');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = filter === 'all' 
    ? leads 
    : leads.filter(lead => lead.status === filter);

  const whatsappNumber = '917008863329';

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <NoIndexHelmet />
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1a365d] text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={32} />
            </div>
            <h1 className="text-2xl font-bold text-[#1a365d]">Admin Dashboard</h1>
            <p className="text-slate-600 mt-2">Enter password to access lead management</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4"
              data-testid="admin-password"
            />
            <Button 
              type="submit" 
              className="w-full bg-[#1a365d] text-white hover:bg-[#0f2442]"
              disabled={loading}
              data-testid="admin-login-btn"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          
          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 text-slate-500 hover:text-[#1a365d] text-sm"
          >
            ← Back to Website
          </button>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      <NoIndexHelmet />
      {/* Header */}
      <div className="bg-[#1a365d] text-white py-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Decorous Admin</h1>
            <p className="text-white/70 text-sm">Leads, Projects &amp; Testimonials</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={fetchLeads}
              data-testid="refresh-btn"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => {
                setIsAuthenticated(false);
                setPassword('');
              }}
              data-testid="logout-btn"
            >
              Logout
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex gap-2 mt-4">
          {[
            { key: 'leads', label: 'Leads', icon: Users },
            { key: 'projects', label: 'Projects', icon: Briefcase },
            { key: 'testimonials', label: 'Testimonials', icon: Star },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-white text-[#1a365d]' : 'text-white/70 hover:bg-white/10'
              }`}
              data-testid={`admin-tab-${tab.key}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
      {activeTab === 'leads' && (
        <>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-slate-500 text-sm">Total Leads</p>
            <p className="text-3xl font-bold text-[#1a365d]">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-slate-500 text-sm">New</p>
            <p className="text-3xl font-bold text-blue-600">{stats.new}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <p className="text-slate-500 text-sm">Contacted</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.contacted}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-slate-500 text-sm">Converted</p>
            <p className="text-3xl font-bold text-green-600">{stats.converted}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center gap-4">
          <Filter size={20} className="text-slate-400" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48" data-testid="filter-select">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-slate-500 text-sm">
            Showing {filteredLeads.length} leads
          </span>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1a365d] mx-auto"></div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No leads found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-700">Lead</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Contact</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Details</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Source</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-slate-50" data-testid={`lead-row-${lead.id}`}>
                      <td className="p-4">
                        <p className="font-semibold text-[#1a365d]">{lead.name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(lead.created_at)}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="flex items-center gap-1 text-sm">
                          <Phone size={14} className="text-slate-400" />
                          {lead.phone}
                        </p>
                        {lead.email && (
                          <p className="flex items-center gap-1 text-sm text-slate-500">
                            <Mail size={14} className="text-slate-400" />
                            {lead.email}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        {lead.city && (
                          <p className="flex items-center gap-1 text-sm">
                            <MapPin size={14} className="text-slate-400" />
                            {lead.city}
                          </p>
                        )}
                        {lead.plot_size && (
                          <p className="text-sm text-slate-500">{lead.plot_size} sqft</p>
                        )}
                        {lead.construction_type && (
                          <p className="text-sm text-slate-500">{lead.construction_type}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm bg-slate-100 px-2 py-1 rounded">
                          {lead.source}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hi ${lead.name}! Thank you for your interest in Decorous. I'm reaching out regarding your construction inquiry.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                            title="WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>
                          <a
                            href={`tel:${lead.phone}`}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                            title="Call"
                          >
                            <Phone size={16} />
                          </a>
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'contacted')}
                            className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200"
                            title="Mark Contacted"
                          >
                            <Clock size={16} />
                          </button>
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'converted')}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                            title="Mark Converted"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'lost')}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                            title="Mark Lost"
                          >
                            <XCircle size={16} />
                          </button>
                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      {activeTab === 'projects' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1a365d]">Projects ({projects.length})</h2>
            <Button
              className="bg-[#F5A623] text-black hover:bg-[#e09612]"
              onClick={startAddProject}
              data-testid="add-project-btn"
            >
              <Plus size={16} className="mr-1" /> Add Project
            </Button>
          </div>

          {showProjectForm && (
            <form
              onSubmit={submitProject}
              className="bg-white p-6 rounded-xl shadow-sm mb-6 space-y-4"
              data-testid="project-form"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1a365d]">
                  {editingProjectId ? 'Edit Project' : 'New Project'}
                </h3>
                <button type="button" onClick={() => setShowProjectForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={projectForm.title}
                    onChange={(e) => setProjectForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g., Modern Duplex Villa"
                    className="mt-1"
                    data-testid="project-title-input"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={projectForm.category}
                    onChange={(e) => setProjectForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g., Luxury Homes"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Location *</Label>
                  <Input
                    value={projectForm.location}
                    onChange={(e) => setProjectForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g., Patia, Bhubaneswar"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Area (sqft)</Label>
                  <Input
                    type="number"
                    value={projectForm.area_sqft}
                    onChange={(e) => setProjectForm((f) => ({ ...f, area_sqft: e.target.value }))}
                    placeholder="e.g., 2500"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Completion Time</Label>
                  <Input
                    value={projectForm.completion_time}
                    onChange={(e) => setProjectForm((f) => ({ ...f, completion_time: e.target.value }))}
                    placeholder="e.g., 10 months"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label>Photo *</Label>
                <div className="flex items-center gap-4 mt-1">
                  {projectForm.imageUrl && (
                    <img src={projectForm.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-lg border" />
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#F5A623] text-sm text-slate-600">
                    <ImagePlus size={16} />
                    {uploadingProjectImage ? 'Uploading...' : projectForm.imageUrl ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleProjectImageChange} disabled={uploadingProjectImage} data-testid="project-image-input" />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="project-featured"
                  checked={projectForm.featured}
                  onCheckedChange={(checked) => setProjectForm((f) => ({ ...f, featured: !!checked }))}
                />
                <Label htmlFor="project-featured">Show on homepage (featured)</Label>
              </div>

              <Button type="submit" className="bg-[#1a365d] text-white hover:bg-[#0f2442]" disabled={savingProject || uploadingProjectImage} data-testid="project-save-btn">
                {savingProject ? 'Saving...' : editingProjectId ? 'Save Changes' : 'Add Project'}
              </Button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl shadow-sm overflow-hidden" data-testid={`admin-project-${project.id}`}>
                <div className="aspect-video bg-slate-100">
                  {project.images?.[0] && (
                    <img src={project.images[0]} alt={project.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-[#1a365d]">{project.title}</h3>
                      <p className="text-sm text-slate-500">{project.location}</p>
                    </div>
                    {project.featured && (
                      <span className="text-xs bg-[#F5A623]/20 text-[#8a5a00] px-2 py-1 rounded-full font-medium">Featured</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => startEditProject(project)} data-testid={`edit-project-${project.id}`}>
                      <Pencil size={14} className="mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => deleteProject(project.id)} data-testid={`delete-project-${project.id}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-slate-500 col-span-full text-center py-12">No projects yet — click "Add Project" to add your first one.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'testimonials' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1a365d]">Testimonials ({testimonials.length})</h2>
            <Button
              className="bg-[#F5A623] text-black hover:bg-[#e09612]"
              onClick={startAddTestimonial}
              data-testid="add-testimonial-btn"
            >
              <Plus size={16} className="mr-1" /> Add Testimonial
            </Button>
          </div>

          {showTestimonialForm && (
            <form
              onSubmit={submitTestimonial}
              className="bg-white p-6 rounded-xl shadow-sm mb-6 space-y-4"
              data-testid="testimonial-form"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1a365d]">
                  {editingTestimonialId ? 'Edit Testimonial' : 'New Testimonial'}
                </h3>
                <button type="button" onClick={() => setShowTestimonialForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Client Name *</Label>
                  <Input
                    value={testimonialForm.name}
                    onChange={(e) => setTestimonialForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1"
                    data-testid="testimonial-name-input"
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={testimonialForm.location}
                    onChange={(e) => setTestimonialForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g., Patia, Bhubaneswar"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Project Type</Label>
                  <Input
                    value={testimonialForm.project_type}
                    onChange={(e) => setTestimonialForm((f) => ({ ...f, project_type: e.target.value }))}
                    placeholder="e.g., 3BHK Duplex"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Rating</Label>
                  <Select value={String(testimonialForm.rating)} onValueChange={(v) => setTestimonialForm((f) => ({ ...f, rating: parseInt(v, 10) }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'Star' : 'Stars'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Testimonial Text *</Label>
                <Textarea
                  value={testimonialForm.content}
                  onChange={(e) => setTestimonialForm((f) => ({ ...f, content: e.target.value }))}
                  className="mt-1"
                  rows={3}
                  data-testid="testimonial-content-input"
                />
              </div>

              <div>
                <Label>Client Photo (optional)</Label>
                <div className="flex items-center gap-4 mt-1">
                  {testimonialForm.imageUrl && (
                    <img src={testimonialForm.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-full border" />
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#F5A623] text-sm text-slate-600">
                    <ImagePlus size={16} />
                    {uploadingTestimonialImage ? 'Uploading...' : testimonialForm.imageUrl ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleTestimonialImageChange} disabled={uploadingTestimonialImage} />
                  </label>
                </div>
              </div>

              <Button type="submit" className="bg-[#1a365d] text-white hover:bg-[#0f2442]" disabled={savingTestimonial || uploadingTestimonialImage} data-testid="testimonial-save-btn">
                {savingTestimonial ? 'Saving...' : editingTestimonialId ? 'Save Changes' : 'Add Testimonial'}
              </Button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-white p-6 rounded-xl shadow-sm" data-testid={`admin-testimonial-${testimonial.id}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#1a365d] rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                    {testimonial.image ? (
                      <img src={testimonial.image} alt={testimonial.name} className="w-full h-full object-cover" />
                    ) : (
                      testimonial.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a365d]">{testimonial.name}</p>
                    <p className="text-xs text-slate-500">{testimonial.project_type} · {testimonial.location}</p>
                  </div>
                </div>
                <div className="flex mb-2">
                  {Array.from({ length: testimonial.rating || 0 }).map((_, i) => (
                    <Star key={i} size={14} className="text-[#F5A623] fill-[#F5A623]" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 line-clamp-3">{testimonial.content}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => startEditTestimonial(testimonial)} data-testid={`edit-testimonial-${testimonial.id}`}>
                    <Pencil size={14} className="mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => deleteTestimonial(testimonial.id)} data-testid={`delete-testimonial-${testimonial.id}`}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {testimonials.length === 0 && (
              <p className="text-slate-500 col-span-full text-center py-12">No testimonials yet — click "Add Testimonial" to add your first one.</p>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminPage;
