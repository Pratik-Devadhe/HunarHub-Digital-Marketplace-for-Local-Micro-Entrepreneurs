import React, { useEffect, useState } from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import { api } from "../services/api";
import "./AdminPortal.css";

export default function AdminPortal({ showToast }) {
  const [activeTab, setActiveTab] = useState("entrepreneurs");

  const [dashboard, setDashboard] = useState(null);
  const [entrepreneurs, setEntrepreneurs] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const [loading, setLoading] = useState(true);

  // Complaint resolution
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");

  /* =========================================================
     FETCH ADMIN DATA
     ========================================================= */

  const fetchData = async () => {
    setLoading(true);

    try {
      const [dashRes, epRes, cmpRes] = await Promise.all([
        api
          .getAdminDashboard()
          .catch(() => ({ dashboard: {} })),

        api
          .getAdminEntrepreneurs()
          .catch(() => ({ entrepreneurs: [] })),

        api
          .getAdminComplaints()
          .catch(() => ({ complaints: [] })),
      ]);

      setDashboard(dashRes?.dashboard || {});
      setEntrepreneurs(epRes?.entrepreneurs || []);
      setComplaints(cmpRes?.complaints || []);
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
  }, []);

  /* =========================================================
     ENTREPRENEUR APPROVAL
     ========================================================= */

  const handleApprove = async (id) => {
    try {
      await api.approveEntrepreneur(id);

      showToast?.(
        "success",
        "Micro-entrepreneur verified and approved!"
      );

      await fetchData();
    } catch (error) {
      console.error("Approval error:", error);

      showToast?.(
        "error",
        error.message || "Approval failed"
      );
    }
  };

  /* =========================================================
     ENTREPRENEUR REJECTION
     ========================================================= */

  const handleReject = async (id) => {
    try {
      await api.rejectEntrepreneur(id);

      showToast?.(
        "info",
        "Entrepreneur application rejected."
      );

      await fetchData();
    } catch (error) {
      console.error("Rejection error:", error);

      showToast?.(
        "error",
        error.message || "Rejection failed"
      );
    }
  };

  /* =========================================================
     COMPLAINT RESOLUTION
     ========================================================= */

  const handleResolveComplaint = async (event) => {
    event.preventDefault();

    if (!selectedComplaint) {
      return;
    }

    if (!adminResponse.trim()) {
      showToast?.(
        "error",
        "Please enter resolution notes."
      );

      return;
    }

    try {
      await api.resolveComplaint(
        selectedComplaint.id,
        "RESOLVED",
        adminResponse.trim()
      );

      showToast?.(
        "success",
        "Complaint resolved successfully!"
      );

      setSelectedComplaint(null);
      setAdminResponse("");

      await fetchData();
    } catch (error) {
      console.error("Complaint resolution error:", error);

      showToast?.(
        "error",
        error.message || "Failed to resolve complaint"
      );
    }
  };

  /* =========================================================
     OPEN COMPLAINT MODAL
     ========================================================= */

  const openComplaintModal = (complaint) => {
    setSelectedComplaint(complaint);
    setAdminResponse("");
  };

  /* =========================================================
     CLOSE COMPLAINT MODAL
     ========================================================= */

  const closeComplaintModal = () => {
    setSelectedComplaint(null);
    setAdminResponse("");
  };

  /* =========================================================
     DASHBOARD STATS
     ========================================================= */

  const stats = dashboard || {};

  const totalUsers = stats.users?.count ?? 0;

  const approvedEntrepreneurs =
    stats.approved_entrepreneurs?.count ?? 0;

  const totalOrders =
    (stats.orders?.count ?? 0) +
    (stats.requests?.count ?? 0);

  const openComplaints =
    stats.complaints?.count ?? 0;

  /* =========================================================
     LOADING STATE
     ========================================================= */

  if (loading && !dashboard) {
    return (
      <div className="admin-portal-container">
        <div className="glass-panel admin-loading">
          <div className="admin-loading-spinner"></div>
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

            <Shield />

            <div>
              <h1 className="portal-title">
                System Admin Control Center
              </h1>

              <p className="portal-subtitle">
                Platform monitoring, entrepreneur verification
                & dispute management
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
          <RefreshCw
            className={loading ? "animate-spin" : ""}
            size={15}
          />

          <span>
            {loading
              ? "Refreshing..."
              : "Refresh Analytics"}
          </span>
        </button>

      </div>

      {/* =====================================================
          KPI ANALYTICS
          ===================================================== */}

      <div className="admin-kpi-grid">

        {/* TOTAL USERS */}

        <div className="glass-panel kpi-card">

          <span className="kpi-title">
            Total Users
          </span>

          <div className="kpi-number">
            {totalUsers}
          </div>

        </div>

        {/* APPROVED ENTREPRENEURS */}

        <div className="glass-panel kpi-card">

          <span className="kpi-title">
            Approved Artisans
          </span>

          <div className="kpi-number success">
            {approvedEntrepreneurs}
          </div>

        </div>

        {/* ORDERS + REQUESTS */}

        <div className="glass-panel kpi-card">

          <span className="kpi-title">
            Orders & Bookings
          </span>

          <div className="kpi-number info">
            {totalOrders}
          </div>

        </div>

        {/* COMPLAINTS */}

        <div className="glass-panel kpi-card">

          <span className="kpi-title">
            Disputes Open
          </span>

          <div className="kpi-number danger">
            {openComplaints}
          </div>

        </div>

      </div>

      {/* =====================================================
          TABS
          ===================================================== */}

      <div className="portal-tabs-row">

        <button
          type="button"
          onClick={() =>
            setActiveTab("entrepreneurs")
          }
          className={`portal-tab-btn ${
            activeTab === "entrepreneurs"
              ? "active"
              : ""
          }`}
        >
          🛡️ Entrepreneur Verification
          {" "}
          ({entrepreneurs.length})
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("complaints")
          }
          className={`portal-tab-btn ${
            activeTab === "complaints"
              ? "active"
              : ""
          }`}
        >
          ⚠️ Customer Complaints
          {" "}
          ({complaints.length})
        </button>

      </div>

      {/* =====================================================
          ENTREPRENEUR VERIFICATION TAB
          ===================================================== */}

      {activeTab === "entrepreneurs" && (

        <div className="verification-list">

          {entrepreneurs.length === 0 ? (

            <div className="glass-panel admin-empty-state">
              No entrepreneur applications found.
            </div>

          ) : (

            entrepreneurs.map((entrepreneur) => (

              <div
                key={entrepreneur.id}
                className="glass-panel verification-card"
              >

                {/* Entrepreneur Information */}

                <div className="verification-info">

                  <div className="verification-title-row">

                    <h3 className="verification-business-name">
                      {entrepreneur.business_name ||
                        "Unnamed Business"}
                    </h3>

                    <span
                      className={`badge ${
                        entrepreneur.verification_status ===
                        "APPROVED"
                          ? "badge-completed"
                          : entrepreneur.verification_status ===
                            "REJECTED"
                          ? "badge-rejected"
                          : "badge-pending"
                      }`}
                    >
                      {entrepreneur.verification_status ||
                        "PENDING"}
                    </span>

                  </div>

                  <p className="verification-meta">
                    Owner:{" "}
                    <strong>
                      {entrepreneur.full_name ||
                        "N/A"}
                    </strong>
                    {" • "}
                    {entrepreneur.email || "N/A"}
                  </p>

                  <p className="verification-meta">
                    Location:{" "}
                    {entrepreneur.city || "N/A"}
                    {entrepreneur.state
                      ? `, ${entrepreneur.state}`
                      : ""}
                  </p>

                  <p className="verification-meta">
                    Experience:{" "}
                    {entrepreneur.experience_years ??
                      0}{" "}
                    Years
                    {" • "}
                    Rating:{" "}
                    {entrepreneur.average_rating ??
                      "0.0"}{" "}
                    ⭐
                  </p>

                </div>

                {/* Actions */}

                <div className="verification-actions">

                  {entrepreneur.verification_status !==
                    "APPROVED" && (

                    <button
                      type="button"
                      onClick={() =>
                        handleApprove(
                          entrepreneur.id
                        )
                      }
                      className="btn-success"
                    >
                      <CheckCircle size={14} />

                      <span>
                        Approve
                      </span>
                    </button>

                  )}

                  {entrepreneur.verification_status !==
                    "REJECTED" && (

                    <button
                      type="button"
                      onClick={() =>
                        handleReject(
                          entrepreneur.id
                        )
                      }
                      className="btn-danger"
                    >
                      <XCircle size={14} />

                      <span>
                        Reject
                      </span>
                    </button>

                  )}

                </div>

              </div>

            ))

          )}

        </div>

      )}

      {/* =====================================================
          COMPLAINTS TAB
          ===================================================== */}

      {activeTab === "complaints" && (

        <div className="complaints-list">

          {complaints.length === 0 ? (

            <div className="glass-panel admin-empty-state">
              <AlertTriangle
                size={28}
                style={{
                  display: "block",
                  margin: "0 auto 0.75rem",
                  opacity: 0.5,
                }}
              />

              No active customer complaints.
            </div>

          ) : (

            complaints.map((complaint) => (

              <div
                key={complaint.id}
                className="glass-panel complaint-card"
              >

                {/* Complaint Header */}

                <div className="complaint-header">

                  <div className="complaint-info">

                    <h3 className="complaint-subject">
                      {complaint.subject ||
                        "Customer Complaint"}
                    </h3>

                    <p className="complaint-meta">
                      Customer ID: #
                      {complaint.customer_id ??
                        "N/A"}

                      {" • "}

                      Entrepreneur:{" "}
                      {complaint.business_name ||
                        `#${
                          complaint.entrepreneur_id ??
                          "N/A"
                        }`}
                    </p>

                  </div>

                  <span
                    className={`badge ${
                      complaint.status === "RESOLVED"
                        ? "badge-completed"
                        : complaint.status ===
                          "REJECTED"
                        ? "badge-rejected"
                        : "badge-pending"
                    }`}
                  >
                    {complaint.status ||
                      "PENDING"}
                  </span>

                </div>

                {/* Complaint Description */}

                <p className="complaint-description">
                  "{complaint.description ||
                    "No description provided."}"
                </p>

                {/* Admin Response */}

                {complaint.admin_response && (

                  <p className="complaint-response">
                    Admin Resolution Note:
                    {" "}
                    "{complaint.admin_response}"
                  </p>

                )}

                {/* Resolve Button */}

                {complaint.status !== "RESOLVED" && (

                  <div className="complaint-actions">

                    <button
                      type="button"
                      onClick={() =>
                        openComplaintModal(
                          complaint
                        )
                      }
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
          RESOLVE COMPLAINT MODAL
          ===================================================== */}

      {selectedComplaint && (

        <div
          className="modal-overlay-backdrop animate-fade-in"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeComplaintModal();
            }

          }}
        >

          <div className="glass-panel modal-dialog-card">

            {/* Modal Header */}

            <div>
              <h3 className="modal-dialog-title">
                Resolve Complaint #
                {selectedComplaint.id}
              </h3>

              <p className="modal-dialog-subtitle">
                Subject:{" "}
                {selectedComplaint.subject ||
                  "Customer Complaint"}
              </p>
            </div>

            {/* Form */}

            <form
              onSubmit={
                handleResolveComplaint
              }
              className="modal-form"
            >

              <textarea
                required
                rows={4}
                placeholder="Enter official resolution notes for customer..."
                value={adminResponse}
                onChange={(event) =>
                  setAdminResponse(
                    event.target.value
                  )
                }
              />

              {/* Actions */}

              <div className="modal-actions">

                <button
                  type="button"
                  onClick={
                    closeComplaintModal
                  }
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    !adminResponse.trim()
                  }
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