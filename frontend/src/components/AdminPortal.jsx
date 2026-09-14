import React, { useEffect, useState, useMemo } from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Tag,
  Package,
  BarChart2,
  Plus,
  Trash2,
  Edit2,
  Award,
  UserCheck,
  PhoneCall,
  Briefcase,
  Clock,
  TrendingUp,
  DollarSign,
  Layers,
  Search,
  Printer
} from "lucide-react";

import { api } from "../services/api";
import "./AdminPortal.css";

export default function AdminPortal({ showToast }) {
  const [activeTab, setActiveTab] = useState("entrepreneurs");

  // Core Data States
  const [dashboard, setDashboard] = useState(null);
  const [entrepreneurs, setEntrepreneurs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [orders, setOrders] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [analytics, setAnalytics] = useState({});

  const [loading, setLoading] = useState(true);

  // Complaint resolution modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintStatus, setComplaintStatus] = useState("RESOLVED");
  const [adminResponse, setAdminResponse] = useState("");
  const [complaintFilter, setComplaintFilter] = useState("ALL");

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    id: null,
    name: "",
    description: "",
    image_url: "",
    is_active: true,
  });

  // Skill modal
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [skillFormData, setSkillFormData] = useState({
    category_id: "",
    name: "",
    description: "",
  });

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");

  const [orderTypeFilter, setOrderTypeFilter] = useState("ALL");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");

  /* =========================================================
     FETCH ADMIN DATA
     ========================================================= */

  const fetchData = async () => {
    setLoading(true);

    try {
      const [
        dashRes,
        epRes,
        cmpRes,
        ordRes,
        reqRes,
        catRes,
        sklRes,
        anlRes,
      ] = await Promise.all([
        api.getAdminDashboard().catch(() => ({ dashboard: {} })),
        api.getAdminEntrepreneurs().catch(() => ({ entrepreneurs: [] })),
        api.getAdminComplaints().catch(() => ({ complaints: [] })),
        api.getAdminOrders().catch(() => ({ orders: [] })),
        api.getAdminServiceRequests().catch(() => ({ requests: [] })),
        api.getCategories().catch(() => ({ categories: [] })),
        api.getSkills().catch(() => ({ skills: [] })),
        api.getAdminAnalytics().catch(() => ({ analytics: {} })),
      ]);

      setDashboard(dashRes?.dashboard || {});
      setEntrepreneurs(epRes?.entrepreneurs || []);
      setComplaints(cmpRes?.complaints || []);
      setOrders(ordRes?.orders || []);
      setServiceRequests(reqRes?.requests || []);
      setCategories(catRes?.categories || []);
      setSkills(sklRes?.skills || []);
      setAnalytics(anlRes?.analytics || {});
    } catch (error) {
      console.error("Admin dashboard error:", error);
      showToast?.(
        "error",
        error.message || "Failed to fetch admin dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     ENTREPRENEUR APPROVAL & BADGE MANAGEMENT
     ========================================================= */

  const handleApprove = async (id) => {
    try {
      await api.approveEntrepreneur(id);
      showToast?.("success", "Micro-entrepreneur verified and approved!");
      setEntrepreneurs((prev) =>
        prev.map((ep) =>
          ep.id === id ? { ...ep, verification_status: "APPROVED" } : ep
        )
      );
    } catch (error) {
      console.error("Approval error:", error);
      showToast?.("error", error.message || "Approval failed");
    }
  };

  const handleReject = async (id) => {
    try {
      await api.rejectEntrepreneur(id);
      showToast?.("info", "Entrepreneur application rejected.");
      setEntrepreneurs((prev) =>
        prev.map((ep) =>
          ep.id === id ? { ...ep, verification_status: "REJECTED" } : ep
        )
      );
    } catch (error) {
      console.error("Rejection error:", error);
      showToast?.("error", error.message || "Rejection failed");
    }
  };

  const handleToggleBadge = async (entrepreneurId, badgeKey, currentValue) => {
    try {
      const updatedValue = !currentValue;
      await api.updateVerificationBadges(entrepreneurId, {
        [badgeKey]: updatedValue,
      });

      setEntrepreneurs((prev) =>
        prev.map((ep) =>
          ep.id === entrepreneurId ? { ...ep, [badgeKey]: updatedValue } : ep
        )
      );

      const labelMap = {
        is_identity_verified: "Identity Verification",
        is_phone_verified: "Phone Verification",
        is_artisan_verified: "Master Artisan Badge",
        is_business_verified: "Business Registration Badge",
      };

      showToast?.(
        "success",
        `${labelMap[badgeKey] || "Badge"} ${
          updatedValue ? "Enabled" : "Disabled"
        }`
      );
    } catch (error) {
      console.error("Badge toggle error:", error);
      showToast?.("error", error.message || "Failed to update badge");
    }
  };

  /* =========================================================
     CATEGORY CRUD
     ========================================================= */

  const openAddCategoryModal = () => {
    setCategoryFormData({
      id: null,
      name: "",
      description: "",
      image_url: "",
      is_active: true,
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category) => {
    setCategoryFormData({
      id: category.id,
      name: category.name || "",
      description: category.description || "",
      image_url: category.image_url || "",
      is_active: category.is_active ?? true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) {
      showToast?.("error", "Category name is required");
      return;
    }

    try {
      if (categoryFormData.id) {
        await api.updateCategory(categoryFormData.id, categoryFormData);
        showToast?.("success", `Category "${categoryFormData.name}" updated`);
      } else {
        await api.createCategory(categoryFormData);
        showToast?.("success", `Category "${categoryFormData.name}" created`);
      }

      setIsCategoryModalOpen(false);
      const catRes = await api.getCategories();
      setCategories(catRes?.categories || []);
    } catch (error) {
      console.error("Save category error:", error);
      showToast?.("error", error.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete category "${categoryName}"? This will delete associated skills.`
      )
    ) {
      return;
    }

    try {
      await api.deleteCategory(categoryId);
      showToast?.("info", `Category "${categoryName}" deleted`);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setSkills((prev) => prev.filter((s) => s.category_id !== categoryId));
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId("");
      }
    } catch (error) {
      console.error("Delete category error:", error);
      showToast?.("error", error.message || "Failed to delete category");
    }
  };

  /* =========================================================
     SKILL CRUD
     ========================================================= */

  const openAddSkillModal = (catId = "") => {
    setSkillFormData({
      category_id: catId || (categories[0]?.id ? String(categories[0].id) : ""),
      name: "",
      description: "",
    });
    setIsSkillModalOpen(true);
  };

  const handleSaveSkill = async (e) => {
    e.preventDefault();
    if (!skillFormData.name.trim() || !skillFormData.category_id) {
      showToast?.("error", "Skill name and category are required");
      return;
    }

    try {
      await api.createSkill({
        category_id: Number(skillFormData.category_id),
        name: skillFormData.name.trim(),
        description: skillFormData.description?.trim() || null,
      });

      showToast?.("success", `Skill "${skillFormData.name}" added`);
      setIsSkillModalOpen(false);
      const sklRes = await api.getSkills();
      setSkills(sklRes?.skills || []);
    } catch (error) {
      console.error("Save skill error:", error);
      showToast?.("error", error.message || "Failed to save skill");
    }
  };

  const handleDeleteSkill = async (skillId, skillName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete skill "${skillName}"?`
      )
    ) {
      return;
    }

    try {
      await api.deleteSkill(skillId);
      showToast?.("info", `Skill "${skillName}" deleted`);
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch (error) {
      console.error("Delete skill error:", error);
      showToast?.("error", error.message || "Failed to delete skill");
    }
  };

  /* =========================================================
     COMPLAINT RESOLUTION
     ========================================================= */

  const handleResolveComplaint = async (event) => {
    event.preventDefault();
    if (!selectedComplaint) return;

    if (!adminResponse.trim()) {
      showToast?.("error", "Please enter resolution notes.");
      return;
    }

    try {
      await api.resolveComplaint(
        selectedComplaint.id,
        complaintStatus,
        adminResponse.trim()
      );

      showToast?.(
        "success",
        `Complaint marked as ${complaintStatus}!`
      );

      setSelectedComplaint(null);
      setAdminResponse("");

      const cmpRes = await api.getAdminComplaints();
      setComplaints(cmpRes?.complaints || []);
    } catch (error) {
      console.error("Complaint resolution error:", error);
      showToast?.(
        "error",
        error.message || "Failed to resolve complaint"
      );
    }
  };

  const openComplaintModal = (complaint) => {
    setSelectedComplaint(complaint);
    setComplaintStatus("RESOLVED");
    setAdminResponse(complaint.admin_response || "");
  };

  const closeComplaintModal = () => {
    setSelectedComplaint(null);
    setAdminResponse("");
  };

  /* =========================================================
     MEMOIZED FILTERED DATA
     ========================================================= */

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) =>
      c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  // Filtered Skills
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchCat =
        !selectedCategoryId || String(s.category_id) === String(selectedCategoryId);
      const matchSearch =
        !skillSearch ||
        s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
        (s.category_name &&
          s.category_name.toLowerCase().includes(skillSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [skills, selectedCategoryId, skillSearch]);

  // Unified Transactions (Orders + Service Requests)
  const unifiedTransactions = useMemo(() => {
    const list = [];

    if (orderTypeFilter === "ALL" || orderTypeFilter === "ORDERS") {
      orders.forEach((o) => {
        list.push({
          id: o.id,
          sourceType: "ORDER",
          displayId: `ORD-${o.id}`,
          status: o.status || "PENDING",
          customer_name: o.customer_name || `Customer #${o.customer_id}`,
          business_name: o.business_name || "Platform Store",
          title: `Product Order #${o.id}`,
          amount: parseFloat(o.total_amount || 0),
          created_at: o.created_at,
          details: o.shipping_address || "Standard delivery",
          payment_status: o.payment_status || "PENDING",
        });
      });
    }

    if (orderTypeFilter === "ALL" || orderTypeFilter === "REQUESTS") {
      serviceRequests.forEach((r) => {
        list.push({
          id: r.id,
          sourceType: "REQUEST",
          displayId: `REQ-${r.id}`,
          status: r.status || "PENDING",
          customer_name: r.customer_name || `Customer #${r.customer_id}`,
          business_name: r.business_name || `Artisan #${r.entrepreneur_id}`,
          title: r.service_title || "Custom Service Request",
          amount: parseFloat(r.final_price || r.estimated_price || 0),
          created_at: r.created_at,
          details: r.address || "Direct client location",
          preferred_date: r.preferred_date,
          payment_status: r.status === "COMPLETED" ? "PAID" : "PENDING",
        });
      });
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return list.filter((item) => {
      const matchStatus =
        orderStatusFilter === "ALL" ||
        item.status.toUpperCase() === orderStatusFilter.toUpperCase();
      const query = orderSearchQuery.toLowerCase();
      const matchSearch =
        !query ||
        item.displayId.toLowerCase().includes(query) ||
        item.customer_name.toLowerCase().includes(query) ||
        item.business_name.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  }, [orders, serviceRequests, orderTypeFilter, orderStatusFilter, orderSearchQuery]);

  // Filtered Complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (complaintFilter === "OPEN") {
        return c.status === "OPEN" || c.status === "UNDER_REVIEW";
      }
      if (complaintFilter === "RESOLVED") {
        return c.status === "RESOLVED" || c.status === "REJECTED";
      }
      return true;
    });
  }, [complaints, complaintFilter]);

  /* =========================================================
     DASHBOARD STATS
     ========================================================= */

  const stats = dashboard || {};
  const totalUsers = stats.users?.count ?? 0;
  const approvedEntrepreneurs = stats.approved_entrepreneurs?.count ?? 0;
  const totalOrdersCount =
    (stats.orders?.count ?? orders.length) +
    (stats.requests?.count ?? serviceRequests.length);
  const openComplaintsCount = complaints.filter(
    (c) => c.status === "OPEN" || c.status === "UNDER_REVIEW"
  ).length;

  /* =========================================================
     LOADING STATE
     ========================================================= */

  if (loading && !dashboard) {
    return (
      <div className="admin-portal-container">
        <div className="glass-panel admin-loading">
          <div className="admin-loading-spinner"></div>
          <p style={{ marginTop: "1rem" }}>Loading Admin Control Center...</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN COMPONENT
     ========================================================= */

  return (
    <div className="admin-portal-container">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <div className="glass-panel admin-header">
        <div>
          <div className="admin-title-group">
            <Shield size={28} />
            <div>
              <h1 className="portal-title">System Admin Control Center</h1>
              <p className="portal-subtitle">
                Platform governance, entrepreneur verification, categories &
                skills, orders monitoring & dispute resolution
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={15} />
          <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
        </button>
      </div>

      {/* =====================================================
          KPI ANALYTICS
          ===================================================== */}
      <div className="admin-kpi-grid">
        <div className="glass-panel kpi-card">
          <span className="kpi-title">Total Users</span>
          <div className="kpi-number">{totalUsers}</div>
        </div>

        <div className="glass-panel kpi-card">
          <span className="kpi-title">Approved Artisans</span>
          <div className="kpi-number success">{approvedEntrepreneurs}</div>
        </div>

        <div className="glass-panel kpi-card">
          <span className="kpi-title">Total Transactions</span>
          <div className="kpi-number info">{totalOrdersCount}</div>
        </div>

        <div className="glass-panel kpi-card">
          <span className="kpi-title">Disputes Open</span>
          <div className="kpi-number danger">{openComplaintsCount}</div>
        </div>
      </div>

      {/* =====================================================
          TABS
          ===================================================== */}
      <div className="portal-tabs-row">
        <button
          type="button"
          onClick={() => setActiveTab("entrepreneurs")}
          className={`portal-tab-btn ${
            activeTab === "entrepreneurs" ? "active" : ""
          }`}
        >
          <UserCheck size={16} style={{ display: "inline", marginRight: "6px" }} />
          Artisans & Verification ({entrepreneurs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`portal-tab-btn ${
            activeTab === "categories" ? "active" : ""
          }`}
        >
          <Tag size={16} style={{ display: "inline", marginRight: "6px" }} />
          Categories & Skills ({categories.length}/{skills.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`portal-tab-btn ${
            activeTab === "orders" ? "active" : ""
          }`}
        >
          <Package size={16} style={{ display: "inline", marginRight: "6px" }} />
          Orders & Bookings ({orders.length + serviceRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("complaints")}
          className={`portal-tab-btn ${
            activeTab === "complaints" ? "active" : ""
          }`}
        >
          <AlertTriangle size={16} style={{ display: "inline", marginRight: "6px" }} />
          Customer Complaints ({complaints.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`portal-tab-btn ${
            activeTab === "analytics" ? "active" : ""
          }`}
        >
          <BarChart2 size={16} style={{ display: "inline", marginRight: "6px" }} />
          Platform Analytics & Reports
        </button>
      </div>

      {/* =====================================================
          TAB 1: ENTREPRENEUR VERIFICATION & BADGE MANAGEMENT
          ===================================================== */}
      {activeTab === "entrepreneurs" && (
        <div className="verification-list">
          <div className="tab-control-banner">
            <div>
              <h3 className="section-title">Micro-Entrepreneur Verification</h3>
              <p className="section-subtitle">
                Review artisan credentials and toggle individual verification trust badges.
              </p>
            </div>
          </div>

          {entrepreneurs.length === 0 ? (
            <div className="glass-panel admin-empty-state">
              No entrepreneur applications found.
            </div>
          ) : (
            entrepreneurs.map((entrepreneur) => (
              <div
                key={entrepreneur.id}
                className="glass-panel verification-card-v2"
              >
                <div className="verification-card-main">
                  <div className="verification-info">
                    <div className="verification-title-row">
                      <h3 className="verification-business-name">
                        {entrepreneur.business_name || "Unnamed Business"}
                      </h3>
                      <span
                        className={`badge ${
                          entrepreneur.verification_status === "APPROVED"
                            ? "badge-completed"
                            : entrepreneur.verification_status === "REJECTED"
                            ? "badge-rejected"
                            : "badge-pending"
                        }`}
                      >
                        {entrepreneur.verification_status || "PENDING"}
                      </span>
                    </div>

                    <p className="verification-meta">
                      Owner:{" "}
                      <strong>{entrepreneur.full_name || "N/A"}</strong>
                      {" • "}
                      {entrepreneur.email || "N/A"}
                      {" • "}
                      {entrepreneur.phone || "No phone"}
                    </p>

                    <p className="verification-meta">
                      Location: {entrepreneur.city || "N/A"}
                      {entrepreneur.state ? `, ${entrepreneur.state}` : ""}
                      {" • "}
                      Experience: {entrepreneur.experience_years ?? 0} Years
                      {" • "}
                      Rating: {entrepreneur.average_rating ?? "0.0"} ⭐ (
                      {entrepreneur.total_reviews ?? 0} reviews)
                    </p>

                    {/* Trust Badges Interactive Manager */}
                    <div className="trust-badges-panel">
                      <span className="trust-badges-label">
                        Trust & Skill Badges:
                      </span>
                      <div className="badges-toggles-grid">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleBadge(
                              entrepreneur.id,
                              "is_identity_verified",
                              entrepreneur.is_identity_verified
                            )
                          }
                          className={`badge-toggle-btn ${
                            entrepreneur.is_identity_verified ? "active" : ""
                          }`}
                          title="Toggle National/Govt ID verification"
                        >
                          <UserCheck size={13} />
                          <span>
                            Govt ID:{" "}
                            {entrepreneur.is_identity_verified
                              ? "Verified ✓"
                              : "Unverified"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleBadge(
                              entrepreneur.id,
                              "is_phone_verified",
                              entrepreneur.is_phone_verified
                            )
                          }
                          className={`badge-toggle-btn ${
                            entrepreneur.is_phone_verified ? "active" : ""
                          }`}
                          title="Toggle Phone OTP Verification"
                        >
                          <PhoneCall size={13} />
                          <span>
                            Phone:{" "}
                            {entrepreneur.is_phone_verified
                              ? "Verified ✓"
                              : "Unverified"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleBadge(
                              entrepreneur.id,
                              "is_artisan_verified",
                              entrepreneur.is_artisan_verified
                            )
                          }
                          className={`badge-toggle-btn ${
                            entrepreneur.is_artisan_verified ? "active" : ""
                          }`}
                          title="Toggle Master Artisan Skill Badge"
                        >
                          <Award size={13} />
                          <span>
                            Master Craft:{" "}
                            {entrepreneur.is_artisan_verified
                              ? "Verified ✓"
                              : "Unverified"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleBadge(
                              entrepreneur.id,
                              "is_business_verified",
                              entrepreneur.is_business_verified
                            )
                          }
                          className={`badge-toggle-btn ${
                            entrepreneur.is_business_verified ? "active" : ""
                          }`}
                          title="Toggle Registered Small Business / MSME Badge"
                        >
                          <Briefcase size={13} />
                          <span>
                            Business Reg:{" "}
                            {entrepreneur.is_business_verified
                              ? "Verified ✓"
                              : "Unverified"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="verification-actions">
                    {entrepreneur.verification_status !== "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => handleApprove(entrepreneur.id)}
                        className="btn-success"
                      >
                        <CheckCircle size={14} />
                        <span>Approve Artisan</span>
                      </button>
                    )}

                    {entrepreneur.verification_status !== "REJECTED" && (
                      <button
                        type="button"
                        onClick={() => handleReject(entrepreneur.id)}
                        className="btn-danger"
                      >
                        <XCircle size={14} />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* =====================================================
          TAB 2: CATEGORIES & SKILLS MANAGEMENT
          ===================================================== */}
      {activeTab === "categories" && (
        <div className="categories-skills-container">
          {/* Header Controls */}
          <div className="glass-panel cat-skills-header">
            <div>
              <h3 className="section-title">Trade Categories & Skills</h3>
              <p className="section-subtitle">
                Configure platform trades (Cobbler, Potter (Kumhar), Tailor,
                Artisan, Small vendor) and their sub-skills.
              </p>
            </div>
            <div className="header-actions-row">
              <button
                type="button"
                onClick={openAddCategoryModal}
                className="btn-primary"
              >
                <Plus size={15} />
                <span>Add Category</span>
              </button>
              <button
                type="button"
                onClick={() => openAddSkillModal(selectedCategoryId)}
                className="btn-secondary"
              >
                <Plus size={15} />
                <span>Add Skill</span>
              </button>
            </div>
          </div>

          <div className="cat-skills-grid">
            {/* Categories Column */}
            <div className="glass-panel cat-column">
              <div className="column-header">
                <h4>Categories ({filteredCategories.length})</h4>
                <div className="search-mini-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="categories-list">
                <div
                  className={`category-item-card ${
                    selectedCategoryId === "" ? "selected-cat" : ""
                  }`}
                  onClick={() => setSelectedCategoryId("")}
                >
                  <div className="cat-item-content">
                    <Layers size={18} className="cat-icon" />
                    <div>
                      <div className="cat-name">All Categories</div>
                      <div className="cat-sub">{skills.length} skills total</div>
                    </div>
                  </div>
                </div>

                {filteredCategories.map((cat) => {
                  const catSkills = skills.filter(
                    (s) => String(s.category_id) === String(cat.id)
                  );
                  const isSelected = String(selectedCategoryId) === String(cat.id);

                  return (
                    <div
                      key={cat.id}
                      className={`category-item-card ${
                        isSelected ? "selected-cat" : ""
                      }`}
                      onClick={() => setSelectedCategoryId(cat.id)}
                    >
                      <div className="cat-item-content">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="cat-thumb"
                          />
                        ) : (
                          <Tag size={18} className="cat-icon" />
                        )}
                        <div>
                          <div className="cat-name">{cat.name}</div>
                          <div className="cat-sub">
                            {catSkills.length} skills
                          </div>
                        </div>
                      </div>

                      <div
                        className="cat-item-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditCategoryModal(cat)}
                          className="btn-icon-tiny"
                          title="Edit Category"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="btn-icon-tiny danger"
                          title="Delete Category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skills Column */}
            <div className="glass-panel skills-column">
              <div className="column-header">
                <div>
                  <h4>
                    Skills & Services (
                    {filteredSkills.length})
                  </h4>
                  <span className="column-subtitle">
                    {selectedCategoryId
                      ? `Showing skills for category: ${
                          categories.find((c) => String(c.id) === String(selectedCategoryId))?.name || "Selected"
                        }`
                      : "Showing all registered trade skills"}
                  </span>
                </div>
                <div className="search-mini-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search skills..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                  />
                </div>
              </div>

              {filteredSkills.length === 0 ? (
                <div className="admin-empty-state">
                  No skills found. Click "Add Skill" to create one.
                </div>
              ) : (
                <div className="skills-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Skill Name</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSkills.map((skill) => (
                        <tr key={skill.id}>
                          <td>
                            <strong>{skill.name}</strong>
                          </td>
                          <td>
                            <span className="badge badge-cat">
                              {skill.category_name ||
                                categories.find(
                                  (c) => String(c.id) === String(skill.category_id)
                                )?.name ||
                                `Category #${skill.category_id}`}
                            </span>
                          </td>
                          <td className="skill-desc-cell">
                            {skill.description || "—"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSkill(skill.id, skill.name)
                              }
                              className="btn-icon-tiny danger"
                              title="Delete Skill"
                            >
                              <Trash2 size={14} />
                            </button>
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
      )}

      {/* =====================================================
          TAB 3: ORDERS & BOOKINGS MONITORING
          ===================================================== */}
      {activeTab === "orders" && (
        <div className="admin-monitoring-container">
          {/* Controls Bar */}
          <div className="glass-panel monitoring-filters-panel">
            <div className="filter-group-row">
              {/* Type Filter */}
              <div className="pill-toggle-group">
                <button
                  type="button"
                  onClick={() => setOrderTypeFilter("ALL")}
                  className={`pill-toggle-btn ${
                    orderTypeFilter === "ALL" ? "active" : ""
                  }`}
                >
                  All Transactions ({orders.length + serviceRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderTypeFilter("ORDERS")}
                  className={`pill-toggle-btn ${
                    orderTypeFilter === "ORDERS" ? "active" : ""
                  }`}
                >
                  📦 Products ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderTypeFilter("REQUESTS")}
                  className={`pill-toggle-btn ${
                    orderTypeFilter === "REQUESTS" ? "active" : ""
                  }`}
                >
                  🛠️ Services ({serviceRequests.length})
                </button>
              </div>

              {/* Status Filter */}
              <div className="pill-toggle-group">
                {[
                  "ALL",
                  "PENDING",
                  "CONFIRMED",
                  "IN_PROGRESS",
                  "PROCESSING",
                  "COMPLETED",
                  "CANCELLED",
                ].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`pill-toggle-btn ${
                      orderStatusFilter === st ? "active" : ""
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="search-bar-full">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search by ID, customer name, business name, or service..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Transactions List */}
          {unifiedTransactions.length === 0 ? (
            <div className="glass-panel admin-empty-state">
              No orders or bookings match the current filter criteria.
            </div>
          ) : (
            <div className="monitoring-cards-grid">
              {unifiedTransactions.map((item) => (
                <div key={`${item.sourceType}-${item.id}`} className="glass-panel order-admin-card">
                  <div className="order-card-header">
                    <div className="order-id-group">
                      <span
                        className={`type-tag ${
                          item.sourceType === "ORDER" ? "type-product" : "type-service"
                        }`}
                      >
                        {item.sourceType === "ORDER"
                          ? "📦 Product Order"
                          : "🛠️ Service Booking"}
                      </span>
                      <strong className="item-id">#{item.displayId}</strong>
                    </div>

                    <span
                      className={`badge ${
                        item.status === "COMPLETED"
                          ? "badge-completed"
                          : item.status === "CANCELLED" || item.status === "REJECTED"
                          ? "badge-rejected"
                          : "badge-pending"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <h4 className="item-title">{item.title}</h4>

                  <div className="order-details-grid">
                    <div>
                      <span className="detail-lbl">Customer</span>
                      <div className="detail-val">{item.customer_name}</div>
                    </div>
                    <div>
                      <span className="detail-lbl">Artisan / Business</span>
                      <div className="detail-val">{item.business_name}</div>
                    </div>
                    <div>
                      <span className="detail-lbl">Total Value</span>
                      <div className="detail-val price-val">
                        ₹{item.amount.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="detail-lbl">Payment Status</span>
                      <div className="detail-val payment-status">
                        {item.payment_status}
                      </div>
                    </div>
                  </div>

                  <div className="order-footer-info">
                    <div className="meta-text">
                      <Clock size={12} style={{ display: "inline", marginRight: "4px" }} />
                      {new Date(item.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {item.details && (
                      <div className="address-text" title={item.details}>
                        📍 {item.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          TAB 4: CUSTOMER COMPLAINTS & DISPUTE RESOLUTION
          ===================================================== */}
      {activeTab === "complaints" && (
        <div className="complaints-list">
          {/* Status Filter */}
          <div className="glass-panel complaints-controls">
            <div className="pill-toggle-group">
              <button
                type="button"
                onClick={() => setComplaintFilter("ALL")}
                className={`pill-toggle-btn ${
                  complaintFilter === "ALL" ? "active" : ""
                }`}
              >
                All Complaints ({complaints.length})
              </button>
              <button
                type="button"
                onClick={() => setComplaintFilter("OPEN")}
                className={`pill-toggle-btn ${
                  complaintFilter === "OPEN" ? "active" : ""
                }`}
              >
                ⚠️ Open / Pending (
                {
                  complaints.filter(
                    (c) => c.status === "OPEN" || c.status === "UNDER_REVIEW"
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setComplaintFilter("RESOLVED")}
                className={`pill-toggle-btn ${
                  complaintFilter === "RESOLVED" ? "active" : ""
                }`}
              >
                ✓ Resolved / Closed (
                {
                  complaints.filter(
                    (c) => c.status === "RESOLVED" || c.status === "REJECTED"
                  ).length
                }
                )
              </button>
            </div>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="glass-panel admin-empty-state">
              <AlertTriangle
                size={28}
                style={{
                  display: "block",
                  margin: "0 auto 0.75rem",
                  opacity: 0.5,
                }}
              />
              No customer complaints found for this filter.
            </div>
          ) : (
            filteredComplaints.map((complaint) => (
              <div
                key={complaint.id}
                className="glass-panel complaint-card"
              >
                <div className="complaint-header">
                  <div className="complaint-info">
                    <h3 className="complaint-subject">
                      {complaint.subject || "Customer Complaint"}
                    </h3>
                    <p className="complaint-meta">
                      Complaint ID: #{complaint.id}
                      {" • "}
                      Customer ID: #{complaint.customer_id ?? "N/A"}
                      {" • "}
                      Artisan ID: #{complaint.entrepreneur_id ?? "N/A"}
                      {" • "}
                      Date:{" "}
                      {new Date(complaint.created_at).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  <span
                    className={`badge ${
                      complaint.status === "RESOLVED"
                        ? "badge-completed"
                        : complaint.status === "REJECTED"
                        ? "badge-rejected"
                        : "badge-pending"
                    }`}
                  >
                    {complaint.status || "PENDING"}
                  </span>
                </div>

                <p className="complaint-description">
                  "{complaint.description || "No description provided."}"
                </p>

                {complaint.admin_response && (
                  <div className="complaint-response">
                    <strong>Admin Resolution Note:</strong>
                    <p style={{ margin: "0.25rem 0 0" }}>{complaint.admin_response}</p>
                    {complaint.resolved_at && (
                      <span className="resolved-time">
                        Resolved on{" "}
                        {new Date(complaint.resolved_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                    )}
                  </div>
                )}

                {complaint.status !== "RESOLVED" && (
                  <div className="complaint-actions">
                    <button
                      type="button"
                      onClick={() => openComplaintModal(complaint)}
                      className="btn-primary"
                    >
                      Resolve Dispute
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* =====================================================
          TAB 5: PLATFORM ANALYTICS & REPORTS
          ===================================================== */}
      {activeTab === "analytics" && (
        <div className="analytics-tab-container">
          <div className="glass-panel analytics-top-panel">
            <div>
              <h3 className="section-title">Platform Performance & Business Intelligence</h3>
              <p className="section-subtitle">
                Macro metrics, sales trends, quality ratings, and community impact.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-secondary"
            >
              <Printer size={15} />
              <span>Print / Export Summary</span>
            </button>
          </div>

          {/* Deep Analytics Metrics */}
          <div className="analytics-metrics-grid">
            <div className="glass-panel metric-card">
              <div className="metric-header">
                <span className="metric-label">Average Rating</span>
                <Award size={18} className="metric-icon-amber" />
              </div>
              <div className="metric-value">
                {analytics.ratings?.average_rating ?? "4.9"} ⭐
              </div>
              <div className="metric-subtext">
                Across {analytics.ratings?.total_reviews ?? 0} verified customer reviews
              </div>
            </div>

            <div className="glass-panel metric-card">
              <div className="metric-header">
                <span className="metric-label">Average Order Value</span>
                <DollarSign size={18} className="metric-icon-cyan" />
              </div>
              <div className="metric-value">
                ₹{parseFloat(analytics.average_customer_order_value || 0).toFixed(2)}
              </div>
              <div className="metric-subtext">
                Gross transaction average across completed orders
              </div>
            </div>

            <div className="glass-panel metric-card">
              <div className="metric-header">
                <span className="metric-label">Active Catalogs</span>
                <Layers size={18} className="metric-icon-emerald" />
              </div>
              <div className="metric-value">
                {(dashboard.products?.count ?? 0) + (dashboard.services?.count ?? 0)}
              </div>
              <div className="metric-subtext">
                {dashboard.products?.count ?? 0} handcrafted products & {dashboard.services?.count ?? 0} service offerings
              </div>
            </div>

            <div className="glass-panel metric-card">
              <div className="metric-header">
                <span className="metric-label">Registered Artisans</span>
                <UserCheck size={18} className="metric-icon-purple" />
              </div>
              <div className="metric-value">
                {dashboard.entrepreneurs?.count ?? entrepreneurs.length}
              </div>
              <div className="metric-subtext">
                {dashboard.approved_entrepreneurs?.count ?? 0} approved with trust badges
              </div>
            </div>
          </div>

          {/* Monthly Sales Breakdown Table */}
          <div className="glass-panel analytics-section-card">
            <h4 className="section-card-title">
              <TrendingUp size={18} style={{ display: "inline", marginRight: "6px" }} />
              Monthly Sales & Order Volume Trends
            </h4>

            {(!analytics.monthly_sales || analytics.monthly_sales.length === 0) ? (
              <div className="admin-empty-state">
                No historical sales records recorded yet.
              </div>
            ) : (
              <div className="skills-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Completed Orders</th>
                      <th>Gross Sales Volume (₹)</th>
                      <th>Platform Commission (0%)</th>
                      <th>Artisans Take-Home (100%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.monthly_sales.map((m, idx) => {
                      const salesVal = parseFloat(m.sales || 0);
                      return (
                        <tr key={idx}>
                          <td>
                            <strong>
                              {new Date(m.month).toLocaleDateString("en-IN", {
                                month: "long",
                                year: "numeric",
                              })}
                            </strong>
                          </td>
                          <td>{m.orders} orders</td>
                          <td style={{ color: "#34d399", fontWeight: "700" }}>
                            ₹{salesVal.toFixed(2)}
                          </td>
                          <td style={{ color: "#94a3b8" }}>
                            ₹0.00 (Free)
                          </td>
                          <td style={{ color: "#fcd34d", fontWeight: "700" }}>
                            ₹{salesVal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Core Categories Coverage Card */}
          <div className="glass-panel analytics-section-card">
            <h4 className="section-card-title">
              <Tag size={18} style={{ display: "inline", marginRight: "6px" }} />
              Core Trade Coverage & Catalog Distribution
            </h4>
            <div className="category-coverage-grid">
              {categories.map((cat) => {
                const countSkills = skills.filter((s) => String(s.category_id) === String(cat.id)).length;
                return (
                  <div key={cat.id} className="coverage-pill-card">
                    <span className="coverage-cat-name">{cat.name}</span>
                    <span className="coverage-cat-count">{countSkills} skills</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: ADD / EDIT CATEGORY
          ===================================================== */}
      {isCategoryModalOpen && (
        <div
          className="modal-overlay-backdrop animate-fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCategoryModalOpen(false);
          }}
        >
          <div className="glass-panel modal-dialog-card">
            <h3 className="modal-dialog-title">
              {categoryFormData.id ? "Edit Trade Category" : "Add New Category"}
            </h3>
            <p className="modal-dialog-subtitle">
              Categories group micro-entrepreneur trades like Cobbler, Potter (Kumhar), Tailor, Artisan, Small vendor.
            </p>

            <form onSubmit={handleSaveCategory} className="modal-form">
              <div>
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Cobbler, Potter (Kumhar), Tailor"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the craft / trade..."
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="form-label">Icon / Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={categoryFormData.image_url}
                  onChange={(e) =>
                    setCategoryFormData((prev) => ({
                      ...prev,
                      image_url: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: ADD SKILL
          ===================================================== */}
      {isSkillModalOpen && (
        <div
          className="modal-overlay-backdrop animate-fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsSkillModalOpen(false);
          }}
        >
          <div className="glass-panel modal-dialog-card">
            <h3 className="modal-dialog-title">Add Sub-Skill / Specialty</h3>
            <p className="modal-dialog-subtitle">
              Add specific craftsmanship skills to help customers filter and search.
            </p>

            <form onSubmit={handleSaveSkill} className="modal-form">
              <div>
                <label className="form-label">Trade Category *</label>
                <select
                  required
                  value={skillFormData.category_id}
                  onChange={(e) =>
                    setSkillFormData((prev) => ({
                      ...prev,
                      category_id: e.target.value,
                    }))
                  }
                >
                  <option value="" disabled>Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Skill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sole Replacement, Terracotta Sculpture, Kurta Stitching"
                  value={skillFormData.name}
                  onChange={(e) =>
                    setSkillFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of this technique or service..."
                  value={skillFormData.description}
                  onChange={(e) =>
                    setSkillFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsSkillModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: RESOLVE COMPLAINT
          ===================================================== */}
      {selectedComplaint && (
        <div
          className="modal-overlay-backdrop animate-fade-in"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeComplaintModal();
          }}
        >
          <div className="glass-panel modal-dialog-card">
            <div>
              <h3 className="modal-dialog-title">
                Resolve Complaint #{selectedComplaint.id}
              </h3>
              <p className="modal-dialog-subtitle">
                Subject: {selectedComplaint.subject || "Customer Complaint"}
              </p>
            </div>

            <form onSubmit={handleResolveComplaint} className="modal-form">
              <div>
                <label className="form-label">Resolution Status</label>
                <select
                  value={complaintStatus}
                  onChange={(e) => setComplaintStatus(e.target.value)}
                >
                  <option value="RESOLVED">Resolved (Issue Addressed)</option>
                  <option value="UNDER_REVIEW">Under Review / Investigation</option>
                  <option value="REJECTED">Rejected / Ineligible</option>
                </select>
              </div>

              <div>
                <label className="form-label">Official Resolution Notes *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter detailed resolution notes for customer and artisan records..."
                  value={adminResponse}
                  onChange={(event) => setAdminResponse(event.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeComplaintModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!adminResponse.trim()}
                  className="btn-primary"
                >
                  Submit Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}