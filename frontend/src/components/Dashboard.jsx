import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Users, BarChart3, Settings, FilePlus, 
  GitCompare, FileCheck, Receipt, Send, RefreshCw, 
  CheckCircle, List, DollarSign, UserCheck, ShieldAlert, 
  LogOut, Search, Plus, X, Building, Trash 
} from 'lucide-react';
import Notification from './Notification';

export default function Dashboard({ user, token, handleLogout }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [dbMode, setDbMode] = useState('Checking...');
  const [isHealthy, setIsHealthy] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Dashboard & Vendors states
  const [stats, setStats] = useState({
    activeRfqs: 12,
    pendingApprovals: 5,
    posAmountMonth: 230000.00,
    overdueInvoices: 3,
    recentPurchaseOrders: [],
    spendingTrends: []
  });
  
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  // Add Vendor Modal states
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('Constructions');
  const [vendorGst, setVendorGst] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [vendorStatus, setVendorStatus] = useState('Pending');
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);

  // RFQ Creation states
  const [rfqs, setRfqs] = useState([]);
  const [showCreateRfqForm, setShowCreateRfqForm] = useState(false);
  const [rfqStep, setRfqStep] = useState(1);
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqCategory, setRfqCategory] = useState('Furniture');
  const [rfqDeadline, setRfqDeadline] = useState('2025-06-15');
  const [rfqDescription, setRfqDescription] = useState('');
  const [rfqItems, setRfqItems] = useState([
    { item: 'Ergonomic chair', qty: 25, unit: 'NOS' },
    { item: 'Standing desks', qty: 10, unit: 'NOS' }
  ]);
  const [assignedVendors, setAssignedVendors] = useState(['Infra Supplies Pvt Ltd', 'Tech Core LTD']);
  const [selectedVendorToAdd, setSelectedVendorToAdd] = useState('');
  const [isSubmittingRfq, setIsSubmittingRfq] = useState(false);

  // Quotation Submission states
  const [quotations, setQuotations] = useState([]);
  const [showSubmitQuotationForm, setShowSubmitQuotationForm] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [bidItems, setBidItems] = useState([]);
  const [gstPercent, setGstPercent] = useState('18');
  const [noteTerms, setNoteTerms] = useState('Payment terms: 20 days net...');
  const [isSubmittingQuotation, setIsSubmittingQuotation] = useState(false);

  const navigate = useNavigate();

  // Dynamically filter tabs visible based on user role
  const getSidebarTabsForRole = () => {
    switch (user.role) {
      case 'Procurement Officer':
        return ['Dashboard', 'Vendors', "RFQ's", 'Approvals', 'Purchase orders', 'Invoices', 'Reports', 'Activity'];
      case 'Vendor':
        return ['Dashboard', 'Quotations', 'Purchase orders', 'Invoices', 'Activity'];
      case 'Manager / Approver':
        return ['Dashboard', 'Approvals', 'Purchase orders', 'Reports', 'Activity'];
      case 'Admin':
      default:
        return ['Dashboard', 'Vendors', "RFQ's", 'Quotations', 'Approvals', 'Purchase orders', 'Invoices', 'Reports', 'Activity'];
    }
  };

  // Fetch Connection status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/health');
        if (response.ok) {
          const data = await response.json();
          setDbMode(data.databaseMode);
          setIsHealthy(true);
        } else {
          setDbMode('Unknown');
          setIsHealthy(false);
        }
      } catch (err) {
        setDbMode('Offline');
        setIsHealthy(false);
      }
    };
    checkHealth();
  }, []);

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  // Fetch Vendors
  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      let url = 'http://localhost:5001/api/vendors';
      const params = [];
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (filterStatus && filterStatus !== 'All') params.push(`status=${encodeURIComponent(filterStatus)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
        if (data.length > 0 && !selectedVendorToAdd) {
          setSelectedVendorToAdd(data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch RFQs
  const fetchRfqs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/rfqs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRfqs(data);
        if (data.length > 0 && !selectedRfqId) {
          setSelectedRfqId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching RFQs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Quotations
  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/quotations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuotations(data);
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data depending on activeTab selection
  useEffect(() => {
    if (activeTab === 'Dashboard') {
      fetchStats();
    } else if (activeTab === 'Vendors') {
      fetchVendors();
    } else if (activeTab === "RFQ's") {
      fetchRfqs();
      fetchVendors(); // for assigning vendors list dropdown
    } else if (activeTab === 'Quotations') {
      fetchQuotations();
      fetchRfqs(); // for selecting RFQ to bid on
    }
  }, [activeTab, searchQuery, filterStatus]);

  // Handle selected RFQ pre-fill items in Quotations
  useEffect(() => {
    if (selectedRfqId) {
      const rfqObj = rfqs.find(r => r.id === selectedRfqId);
      if (rfqObj && rfqObj.items) {
        setBidItems(rfqObj.items.map(it => ({
          item: it.item,
          qty: it.qty,
          unit: it.unit || 'NOS',
          unit_price: 3500, // prefill demo pricing
          total: 25 * 3500,
          delivery_days: 7
        })));
      }
    }
  }, [selectedRfqId, rfqs]);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const onLogout = () => {
    handleLogout();
    navigate('/login');
  };

  const viewVendorDetails = (vendor) => {
    showToast(`Vendor Details: ${vendor.name} (${vendor.category}) | GST: ${vendor.gst_no} | Phone: ${vendor.contact_no}`, 'success');
  };

  // Save new vendor
  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName || !vendorCategory || !vendorGst || !vendorContact) {
      showToast('Please fill in all vendor fields.');
      return;
    }
    setIsSubmittingVendor(true);
    try {
      const response = await fetch('http://localhost:5001/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: vendorName,
          category: vendorCategory,
          gst_no: vendorGst,
          contact_no: vendorContact,
          status: vendorStatus
        })
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Vendor "${data.name}" added successfully!`);
        setShowAddVendorModal(false);
        setVendorName('');
        fetchVendors();
      } else {
        showToast(data.message || 'Error saving vendor.', 'error');
      }
    } catch (err) {
      showToast('Connection error to server.', 'error');
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  // Add line item to RFQ creation form
  const addRfqLineItem = () => {
    setRfqItems([...rfqItems, { item: '', qty: 1, unit: 'NOS' }]);
  };

  const removeRfqLineItem = (index) => {
    setRfqItems(rfqItems.filter((_, idx) => idx !== index));
  };

  const updateRfqLineItem = (index, field, value) => {
    const updated = [...rfqItems];
    updated[index][field] = value;
    setRfqItems(updated);
  };

  // Assign vendor to RFQ list
  const addVendorToRfq = () => {
    if (selectedVendorToAdd && !assignedVendors.includes(selectedVendorToAdd)) {
      setAssignedVendors([...assignedVendors, selectedVendorToAdd]);
    }
  };

  const removeVendorFromRfq = (vendorName) => {
    setAssignedVendors(assignedVendors.filter(v => v !== vendorName));
  };

  // Submit RFQ
  const handleSaveRfq = async (statusVal = 'Sent') => {
    if (!rfqTitle || !rfqDeadline) {
      showToast('Please specify RFQ Title and Deadline Date.');
      return;
    }
    setIsSubmittingRfq(true);
    try {
      const response = await fetch('http://localhost:5001/api/rfqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: rfqTitle,
          category: rfqCategory,
          deadline: rfqDeadline,
          description: rfqDescription,
          items: rfqItems,
          assigned_vendors: assignedVendors
        })
      });
      if (response.ok) {
        showToast(`RFQ "${rfqTitle}" saved as ${statusVal}!`);
        setShowCreateRfqForm(false);
        // Reset form
        setRfqTitle('');
        setRfqDescription('');
        setRfqItems([{ item: '', qty: 1, unit: 'NOS' }]);
        setRfqStep(1);
        fetchRfqs();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to submit RFQ', 'error');
      }
    } catch (err) {
      showToast('Network error while saving RFQ.', 'error');
    } finally {
      setIsSubmittingRfq(false);
    }
  };

  // Update Quotation Bid item field
  const updateBidItemValue = (index, field, value) => {
    const updated = [...bidItems];
    updated[index][field] = value;
    if (field === 'unit_price') {
      updated[index].total = updated[index].qty * parseFloat(value || 0);
    }
    setBidItems(updated);
  };

  // Calculate totals
  const subtotalAmount = bidItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const gstAmountVal = subtotalAmount * (parseFloat(gstPercent) || 18) / 100;
  const grandTotalAmount = subtotalAmount + gstAmountVal;

  // Submit Quotation
  const handleSubmitQuotation = async (statusVal = 'Submitted') => {
    if (!selectedRfqId) {
      showToast('Please select a valid RFQ target.');
      return;
    }
    const targetRfq = rfqs.find(r => r.id === selectedRfqId);
    if (!targetRfq) return;

    setIsSubmittingQuotation(true);
    try {
      const response = await fetch('http://localhost:5001/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rfq_id: selectedRfqId,
          rfq_title: targetRfq.title,
          vendor_name: `${user.first_name} ${user.last_name}`,
          items: bidItems,
          tax_gst_percent: parseFloat(gstPercent),
          note_terms: noteTerms,
          subtotal: subtotalAmount,
          gst_amount: gstAmountVal,
          grand_total: grandTotalAmount
        })
      });

      if (response.ok) {
        showToast(`Quotation submitted successfully!`);
        setShowSubmitQuotationForm(false);
        fetchQuotations();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to submit quotation.', 'error');
      }
    } catch (err) {
      showToast('Network error submitting quotation.', 'error');
    } finally {
      setIsSubmittingQuotation(false);
    }
  };

  // Get Sidebar icon
  const getSidebarIcon = (name) => {
    switch (name) {
      case 'Dashboard': return <BarChart3 size={18} />;
      case 'Vendors': return <Users size={18} />;
      case "RFQ's": return <FileText size={18} />;
      case 'Quotations': return <GitCompare size={18} />;
      case 'Approvals': return <CheckCircle size={18} />;
      case 'Purchase orders': return <FileCheck size={18} />;
      case 'Invoices': return <Receipt size={18} />;
      case 'Reports': return <BarChart3 size={18} />;
      case 'Activity': return <List size={18} />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <div className="dashboard-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Top Header bar */}
      <header className="dashboard-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="db-logo">
            <span className="logo-odoo">odoo</span> <span className="logo-bridge" style={{ fontSize: '1.25rem' }}>VendorBridge</span>
          </div>
          <span className="db-logo-sub">Enterprise Portal</span>
        </div>

        <div className="db-header-user">
          <div className="db-user-info">
            <div className="db-user-name">{user.first_name} {user.last_name}</div>
            <span className="badge badge-primary db-user-role-badge">{user.role}</span>
          </div>
          <img
            src={user.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=neutral'}
            alt="Avatar"
            className="db-user-avatar"
          />
          <button className="btn btn-logout flex-center" onClick={onLogout}>
            <LogOut size={16} />
            <span style={{ marginLeft: '4px' }}>Log Out</span>
          </button>
        </div>
      </header>

      {/* Main dashboard panel */}
      <div className="dashboard-main">
        {/* Left Navigation Sidebar panel */}
        <aside className="db-sidebar">
          <ul className="sidebar-nav-list">
            {getSidebarTabsForRole().map(tab => (
              <li 
                key={tab} 
                className={`sidebar-nav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab); setShowCreateRfqForm(false); setShowSubmitQuotationForm(false); }}
              >
                {getSidebarIcon(tab)}
                <span>{tab}</span>
              </li>
            ))}
          </ul>

          {/* Sidebar Profile Card at bottom */}
          <div className="glass-card sidebar-profile-card" style={{ marginTop: 'auto', padding: '16px' }}>
            <img
              src={user.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=neutral'}
              alt="Profile avatar"
              className="profile-avatar-large"
              style={{ width: '60px', height: '60px', border: '2px solid var(--color-primary-light)' }}
            />
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '2px' }}>{user.first_name}</h4>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{user.role}</span>
            </div>
            <div className="profile-meta-details" style={{ fontSize: '0.75rem', gap: '8px', paddingTop: '12px' }}>
              <div className="meta-item">
                <span className="meta-label">Email</span>
                <span className="meta-value" style={{ fontSize: '0.75rem' }}>{user.email}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Country</span>
                <span className="meta-value">{user.country || 'USA'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content workspace area */}
        <main className="db-content-area">
          
          {/* Welcome/Status Row */}
          <div className="welcome-hero" style={{ padding: '20px 30px' }}>
            <div className="welcome-text">
              <h2 style={{ fontSize: '1.6rem' }}>Welcome, {user.first_name}!</h2>
              <p style={{ fontSize: '0.9rem' }}>ERP connected in active workspace session as <strong>{user.role}</strong>.</p>
            </div>
            
            <div className={`connection-status-pill ${dbMode === 'In-Memory Fallback' || dbMode === 'Offline' ? 'mock' : ''}`}>
              <div className="status-dot"></div>
              <span>Database: {dbMode}</span>
            </div>
          </div>

          {/* ========================================================== */}
          {/* TAB 1: DASHBOARD MONITOR */}
          {/* ========================================================== */}
          {activeTab === 'Dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Metrics Section */}
              <div className="metrics-grid">
                <div className="glass-card metric-card">
                  <div>
                    <span className="metric-label">Active RFQ's</span>
                    <div className="metric-number">{stats.activeRfqs}</div>
                  </div>
                  <div className="action-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary-light)' }}>
                    <FileText size={22} />
                  </div>
                </div>

                <div className="glass-card metric-card">
                  <div>
                    <span className="metric-label">Pending Approvals</span>
                    <div className="metric-number">{stats.pendingApprovals}</div>
                  </div>
                  <div className="action-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
                    <CheckCircle size={22} />
                  </div>
                </div>

                <div className="glass-card metric-card">
                  <div>
                    <span className="metric-label">PO Spend this Month</span>
                    <div className="metric-number">
                      ${(stats.posAmountMonth / 1000).toFixed(0)}k
                    </div>
                  </div>
                  <div className="action-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                    <DollarSign size={22} />
                  </div>
                </div>

                <div className="glass-card metric-card">
                  <div>
                    <span className="metric-label">Overdue Invoices</span>
                    <div className="metric-number">{stats.overdueInvoices}</div>
                  </div>
                  <div className="action-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
                    <Receipt size={22} />
                  </div>
                </div>
              </div>

              {/* Bottom Columns (Recent POs & Trends Chart) */}
              <div className="dashboard-grid-2col">
                {/* Left Column: Recent POs Table */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 className="actions-section-title" style={{ marginBottom: '16px' }}>Recent Purchase Orders</h3>
                  <div className="table-wrapper">
                    <table className="activity-table">
                      <thead>
                        <tr>
                          <th>PO#</th>
                          <th>Vendor</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentPurchaseOrders.length > 0 ? (
                          stats.recentPurchaseOrders.map((po, idx) => (
                            <tr key={idx}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--text-primary)' }}>{po.po_number}</td>
                              <td>{po.vendor_name}</td>
                              <td>${parseFloat(po.amount).toLocaleString()}</td>
                              <td>
                                <span className={`badge ${
                                  po.status === 'Approved' ? 'badge-success' : po.status === 'Pending' ? 'badge-warning' : 'badge-danger'
                                }`}>
                                  {po.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent purchase orders.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Spending Trends Chart */}
                <div className="glass-card trends-chart-card" style={{ padding: '24px' }}>
                  <h3 className="actions-section-title" style={{ marginBottom: '16px' }}>Spending Trends (6 Months)</h3>
                  <div className="trends-chart-wrapper">
                    {stats.spendingTrends.length > 0 ? (
                      stats.spendingTrends.map((trend, idx) => (
                        <div key={idx} className="chart-bar-container">
                          <div 
                            className="chart-bar-fill" 
                            style={{ height: `${Math.max(15, (trend.amount / 250000) * 100)}%` }}
                          >
                            <span className="chart-bar-tooltip">${(trend.amount / 1000).toFixed(0)}k</span>
                          </div>
                          <span className="chart-bar-label">{trend.month}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-muted)', width: '100%', textAlign: 'center', padding: '40px 0' }}>No trend data loaded.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: VENDOR MANAGEMENT SCREEN */}
          {/* ========================================================== */}
          {activeTab === 'Vendors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="actions-section-title" style={{ fontSize: '1.5rem' }}>Vendors</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Manage supplier profiles and registrations</p>
                </div>
                <button 
                  onClick={() => setShowAddVendorModal(true)} 
                  className="btn btn-primary flex-center" 
                  style={{ gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Add Vendor</span>
                </button>
              </div>

              {/* Search bar & Filter tabs */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div className="input-container" style={{ flex: 1, minWidth: '250px' }}>
                    <Search className="input-icon" size={18} />
                    <input
                      type="text"
                      placeholder="Search bar ..... search vendor by name or category..."
                      className="form-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="filter-tabs-container">
                  {['All', 'Active', 'Pending', 'Blocked'].map(status => {
                    let count = 0;
                    if (status === 'All') count = vendors.length;
                    else count = vendors.filter(v => v.status === status).length;
                    
                    return (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`filter-tab ${filterStatus === status ? 'active' : ''}`}
                      >
                        {status} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Vendors Table */}
                <div className="table-wrapper">
                  {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                      <span>Loading vendors list...</span>
                    </div>
                  ) : (
                    <table className="activity-table">
                      <thead>
                        <tr>
                          <th>Vendor Name</th>
                          <th>Category</th>
                          <th>GST no.</th>
                          <th>Contact no.</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendors.length > 0 ? (
                          vendors.map((vendor, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{vendor.name}</td>
                              <td>{vendor.category}</td>
                              <td style={{ fontFamily: 'monospace' }}>{vendor.gst_no}</td>
                              <td>{vendor.contact_no}</td>
                              <td>
                                <span className={`badge ${
                                  vendor.status === 'Active' ? 'badge-success' : vendor.status === 'Pending' ? 'badge-warning' : 'badge-danger'
                                }`}>
                                  {vendor.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  onClick={() => viewVendorDetails(vendor)}
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No vendors found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 3: RFQ CREATION SCREEN (Procurement Officer Role) */}
          {/* ========================================================== */}
          {activeTab === "RFQ's" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {!showCreateRfqForm ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="actions-section-title" style={{ fontSize: '1.5rem' }}>Requests for Quotations</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Monitor and compile procurement RFQs</p>
                    </div>
                    {user.role === 'Procurement Officer' && (
                      <button onClick={() => setShowCreateRfqForm(true)} className="btn btn-primary flex-center" style={{ gap: '6px' }}>
                        <Plus size={16} />
                        <span>Create RFQ</span>
                      </button>
                    )}
                  </div>

                  <div className="glass-card" style={{ padding: '24px' }}>
                    <div className="table-wrapper">
                      <table className="activity-table">
                        <thead>
                          <tr>
                            <th>RFQ Title</th>
                            <th>Category</th>
                            <th>Deadline Date</th>
                            <th>Line Items Count</th>
                            <th>Vendors Assigned</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rfqs.length > 0 ? (
                            rfqs.map((rfq, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{rfq.title}</td>
                                <td>{rfq.category}</td>
                                <td>{rfq.deadline}</td>
                                <td>{rfq.items ? rfq.items.length : 0} items</td>
                                <td>{rfq.assigned_vendors ? rfq.assigned_vendors.join(', ') : 'None'}</td>
                                <td>
                                  <span className={`badge ${rfq.status === 'Sent' ? 'badge-success' : 'badge-warning'}`}>
                                    {rfq.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No active RFQs.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* RFQ Step Creation Form Wizard matching Wireframe */
                <div className="glass-card" style={{ padding: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h3 className="actions-section-title" style={{ fontSize: '1.5rem' }}>Create RFQ's</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>new request for quotation</p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setShowCreateRfqForm(false)}>Back to list</button>
                  </div>

                  {/* Step indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-flex', width: '32px', height: '32px', borderRadius: '50%', background: rfqStep >= 1 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</span>
                      <span style={{ color: rfqStep >= 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Details</span>
                    </div>
                    <div style={{ width: '60px', height: '2px', background: rfqStep >= 2 ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-flex', width: '32px', height: '32px', borderRadius: '50%', background: rfqStep >= 2 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</span>
                      <span style={{ color: rfqStep >= 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Line Items</span>
                    </div>
                    <div style={{ width: '60px', height: '2px', background: rfqStep >= 3 ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-flex', width: '32px', height: '32px', borderRadius: '50%', background: rfqStep >= 3 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</span>
                      <span style={{ color: rfqStep >= 3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Assign & Upload</span>
                    </div>
                  </div>

                  <div className="signup-grid">
                    {/* Left Column Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">RFQ's title*</label>
                        <input
                          type="text"
                          placeholder="Office Furniture procurement Q2"
                          className="form-input"
                          value={rfqTitle}
                          onChange={(e) => setRfqTitle(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <input
                          type="text"
                          placeholder="Furniture"
                          className="form-input"
                          value={rfqCategory}
                          onChange={(e) => setRfqCategory(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Deadline*</label>
                        <input
                          type="date"
                          className="form-input"
                          value={rfqDeadline}
                          onChange={(e) => setRfqDeadline(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                          placeholder="Ergonomic chairs and standing desks for 3rd floor"
                          className="form-input"
                          rows={4}
                          value={rfqDescription}
                          onChange={(e) => setRfqDescription(e.target.value)}
                          style={{ resize: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button onClick={() => handleSaveRfq('Sent')} className="btn btn-primary" disabled={isSubmittingRfq}>
                          Save & Send to Vendors
                        </button>
                        <button onClick={() => handleSaveRfq('Draft')} className="btn btn-secondary" style={{ border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }} disabled={isSubmittingRfq}>
                          Save as Draft
                        </button>
                      </div>
                    </div>

                    {/* Right Column wizard helper details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Step 2: Line Items details */}
                      <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontWeight: 'bold' }}>Line Items</span>
                          <button onClick={addRfqLineItem} className="btn btn-secondary flex-center" style={{ padding: '4px 10px', fontSize: '0.8rem', gap: '4px' }}>
                            <Plus size={14} /> add line item
                          </button>
                        </div>

                        <div className="table-wrapper">
                          <table className="activity-table" style={{ fontSize: '0.8rem' }}>
                            <thead>
                              <tr>
                                <th>Item Name</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {rfqItems.map((item, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-input"
                                      style={{ padding: '6px', fontSize: '0.8rem' }}
                                      value={item.item}
                                      onChange={(e) => updateRfqLineItem(idx, 'item', e.target.value)}
                                      placeholder="e.g. Ergonomic chair"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-input"
                                      style={{ padding: '6px', fontSize: '0.8rem', width: '60px' }}
                                      value={item.qty}
                                      onChange={(e) => updateRfqLineItem(idx, 'qty', parseInt(e.target.value) || 1)}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-input"
                                      style={{ padding: '6px', fontSize: '0.8rem', width: '60px' }}
                                      value={item.unit}
                                      onChange={(e) => updateRfqLineItem(idx, 'unit', e.target.value)}
                                    />
                                  </td>
                                  <td>
                                    <button onClick={() => removeRfqLineItem(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                                      <Trash size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Step 3: Assign Vendors & Attachments block */}
                      <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '12px' }}>ASSIGN VENDORS</div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                          {assignedVendors.map((v, i) => (
                            <span key={i} className="badge badge-primary flex-center" style={{ gap: '6px', padding: '6px 12px' }}>
                              {v}
                              <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeVendorFromRfq(v)} />
                            </span>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select 
                            className="form-input" 
                            style={{ flex: 1 }}
                            value={selectedVendorToAdd}
                            onChange={(e) => setSelectedVendorToAdd(e.target.value)}
                          >
                            {vendors.map((v, idx) => (
                              <option key={idx} value={v.name}>{v.name}</option>
                            ))}
                          </select>
                          <button onClick={addVendorToRfq} className="btn btn-secondary flex-center" style={{ gap: '4px' }}>
                            <Plus size={16} /> add vendor
                          </button>
                        </div>

                        <div style={{ fontWeight: 'bold', marginTop: '20px', marginBottom: '8px' }}>Attachments</div>
                        <div style={{ border: '1px dashed var(--glass-border)', padding: '20px', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Drag & drop files or click to upload
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 4: VENDOR QUOTATION SUBMISSION (Vendor Role) */}
          {/* ========================================================== */}
          {activeTab === 'Quotations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {!showSubmitQuotationForm ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="actions-section-title" style={{ fontSize: '1.5rem' }}>Submit Quotations</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Prepare and submit proposals for open RFQs</p>
                    </div>
                    {user.role === 'Vendor' && (
                      <button onClick={() => setShowSubmitQuotationForm(true)} className="btn btn-primary flex-center" style={{ gap: '6px' }}>
                        <Plus size={16} />
                        <span>Submit Quotation</span>
                      </button>
                    )}
                  </div>

                  <div className="glass-card" style={{ padding: '24px' }}>
                    <div className="table-wrapper">
                      <table className="activity-table">
                        <thead>
                          <tr>
                            <th>RFQ Target</th>
                            <th>Subtotal</th>
                            <th>GST Amount</th>
                            <th>Grand Total</th>
                            <th>Submitted By</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotations.length > 0 ? (
                            quotations.map((q, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{q.rfq_title}</td>
                                <td>${parseFloat(q.subtotal).toLocaleString()}</td>
                                <td>${parseFloat(q.gst_amount).toLocaleString()}</td>
                                <td style={{ fontWeight: 'bold', color: 'var(--color-primary-light)' }}>${parseFloat(q.grand_total).toLocaleString()}</td>
                                <td>{q.vendor_name}</td>
                                <td>
                                  <span className={`badge ${q.status === 'Submitted' ? 'badge-success' : 'badge-warning'}`}>
                                    {q.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No bids submitted.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* Quotation Submission Screen matching Wireframe */
                <div className="glass-card" style={{ padding: '30px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h3 className="actions-section-title" style={{ fontSize: '1.5rem' }}>Submit Quotations</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Respond to procurement requests</p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setShowSubmitQuotationForm(false)}>Back to list</button>
                  </div>

                  {/* Select RFQ Target dropdown */}
                  <div className="form-group" style={{ marginBottom: '24px', maxWidth: '500px' }}>
                    <label className="form-label" style={{ fontWeight: 'bold' }}>Select Target RFQ Request</label>
                    <select
                      className="form-input"
                      value={selectedRfqId}
                      onChange={(e) => setSelectedRfqId(e.target.value)}
                    >
                      <option value="">-- Choose RFQ --</option>
                      {rfqs.map((r, i) => (
                        <option key={i} value={r.id}>RFQ: {r.title} - deadline {r.deadline}</option>
                      ))}
                    </select>
                  </div>

                  {selectedRfqId ? (
                    <>
                      {/* RFQ Summary box */}
                      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>RFQ Summary</span>
                        <div style={{ marginTop: '8px', color: 'var(--text-primary)' }}>
                          {rfqs.find(r => r.id === selectedRfqId)?.items.map(it => `${it.item} * ${it.qty}`).join(', ')}
                          {` - category ${rfqs.find(r => r.id === selectedRfqId)?.category}`}
                        </div>
                      </div>

                      {/* Bid items Table */}
                      <h4 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Your Quotation</h4>
                      <div className="table-wrapper" style={{ marginBottom: '24px' }}>
                        <table className="activity-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Qty</th>
                              <th>Unit price</th>
                              <th>Total</th>
                              <th>Delivery (days)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bidItems.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.item}</td>
                                <td>{item.qty} {item.unit}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ padding: '6px', fontSize: '0.85rem', width: '100px' }}
                                    value={item.unit_price}
                                    onChange={(e) => updateBidItemValue(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                  />
                                </td>
                                <td style={{ fontWeight: 'bold' }}>${(item.total || 0).toLocaleString()}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ padding: '6px', fontSize: '0.85rem', width: '80px' }}
                                    value={item.delivery_days}
                                    onChange={(e) => updateBidItemValue(idx, 'delivery_days', parseInt(e.target.value) || 7)}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Calculations & GST grid */}
                      <div className="signup-grid" style={{ gap: '40px' }}>
                        <div>
                          <div className="form-group">
                            <label className="form-label">tax / GST %</label>
                            <input
                              type="text"
                              className="form-input"
                              style={{ maxWidth: '120px' }}
                              value={gstPercent}
                              onChange={(e) => setGstPercent(e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ marginTop: '16px' }}>
                            <label className="form-label">Note / terms</label>
                            <textarea
                              className="form-input"
                              rows={4}
                              value={noteTerms}
                              onChange={(e) => setNoteTerms(e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => handleSubmitQuotation('Submitted')} className="btn btn-primary" disabled={isSubmittingQuotation}>
                              Submit Quotation
                            </button>
                            <button onClick={() => handleSubmitQuotation('Draft')} className="btn btn-secondary" style={{ border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }} disabled={isSubmittingQuotation}>
                              Save Draft
                            </button>
                          </div>
                        </div>

                        {/* Subtotal summary card on right */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '360px', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-muted)' }}>
                              <span>Subtotal</span>
                              <span style={{ fontWeight: 'bold' }}>${subtotalAmount.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-muted)' }}>
                              <span>GST ({gstPercent}%)</span>
                              <span style={{ fontWeight: 'bold' }}>${gstAmountVal.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', fontSize: '1.15rem' }}>
                              <span>Grand Total</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--color-primary-light)' }}>${grandTotalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', padding: '20px' }}>Please select an RFQ target request to configure your quote.</div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 5+: OTHER TABS (UNDER DEVELOPMENT) */}
          {/* ========================================================== */}
          {activeTab !== 'Dashboard' && activeTab !== 'Vendors' && activeTab !== "RFQ's" && activeTab !== 'Quotations' && (
            <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
              <Building size={60} style={{ color: 'var(--color-primary-light)', margin: '0 auto 20px auto', opacity: 0.6 }} />
              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{activeTab} Module</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px auto' }}>
                This portal module is currently linked with the backend database but is locked during testing. Please use the available menus.
              </p>
              <button onClick={() => setActiveTab('Dashboard')} className="btn btn-primary">
                Return to Dashboard Overview
              </button>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================== */}
      {/* MODAL: ADD VENDOR FORM */}
      {/* ========================================================== */}
      {showAddVendorModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            
            <div className="modal-header">
              <h3 className="actions-section-title" style={{ fontSize: '1.25rem' }}>Add New Vendor</h3>
              <button className="btn-close" onClick={() => setShowAddVendorModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddVendorSubmit}>
              <div className="form-group">
                <label className="form-label">Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Components Ltd"
                  className="form-input"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  required
                >
                  <option value="Constructions">Constructions</option>
                  <option value="IT">IT</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Services">Services</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAICS1429B1Z0"
                  className="form-input"
                  value={vendorGst}
                  onChange={(e) => setVendorGst(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  className="form-input"
                  value={vendorContact}
                  onChange={(e) => setVendorContact(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={vendorStatus}
                  onChange={(e) => setVendorStatus(e.target.value)}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddVendorModal(false)} 
                  className="btn btn-secondary"
                  style={{ border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmittingVendor}
                >
                  {isSubmittingVendor ? 'Saving Vendor...' : 'Save Vendor'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

