import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Phone, Mail, MapPin, Calendar, Filter, Trash2, MessageCircle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
    }
  }, [isAuthenticated, fetchLeads]);

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
      {/* Header */}
      <div className="bg-[#1a365d] text-white py-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Decorous Admin</h1>
            <p className="text-white/70 text-sm">Lead Management Dashboard</p>
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
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
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
      </div>
    </div>
  );
};

export default AdminPage;
