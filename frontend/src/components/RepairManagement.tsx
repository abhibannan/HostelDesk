import { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";

const API_URL = "http://localhost:3000/api/v1";

export type Repair = {
  id: string;
  hostelId: string;
  renterId?: string;
  roomId?: string | null;
  bedId?: string | null;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  adminNotes?: string | null;
  assignedTo?: string | null;
  assignedRepairPersonId?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
};

export type RepairPerson = {
  id: string;
  hostelId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  specialty?: string;
  status: string;
  createdAt: string;
};

type Room = {
  id: string;
  roomNumber: string;
  floor?: string | null;
};

type Renter = {
  id: string;
  roomId: string;
  user?: {
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
  } | null;
};

type Props = {
  hostelId: string;
};

async function apiRequest(path: string, options: RequestInit = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You are not logged in");
  const token = await currentUser.getIdToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

const SPECIALTY_OPTIONS = [
  "General Maintenance",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Appliance / AC",
  "Masonry",
  "Pest Control",
];

export default function RepairManagement({ hostelId }: Props) {
  const [activeTab, setActiveTab] = useState<"requests" | "personnel">("requests");

  // Data states
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [repairPersons, setRepairPersons] = useState<RepairPerson[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal: Add Repair Request
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [newRoomId, setNewRoomId] = useState("");
  const [newRenterId, setNewRenterId] = useState("");
  const [savingRepair, setSavingRepair] = useState(false);

  // Modal: Edit Status / Notes / Assignment
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [editStatus, setEditStatus] = useState<"SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED">("IN_PROGRESS");
  const [editNotes, setEditNotes] = useState("");
  const [editAssignedPersonId, setEditAssignedPersonId] = useState("");
  const [updatingRepair, setUpdatingRepair] = useState(false);

  // Modal: Add Repair Person
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personPhone, setPersonPhone] = useState("");
  const [personSpecialty, setPersonSpecialty] = useState("General Maintenance");
  const [personPassword, setPersonPassword] = useState("Repair@123");
  const [savingPerson, setSavingPerson] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [hostelId]);

  async function loadAllData() {
    try {
      setLoading(true);
      setError("");

      const [repairsData, personsData, roomsData, rentersData] = await Promise.all([
        apiRequest(`/hostels/${hostelId}/repairs`).catch(() => ({ repairs: [] })),
        apiRequest(`/hostels/${hostelId}/repair-persons`).catch(() => ({ repairPersons: [] })),
        apiRequest(`/hostels/${hostelId}/rooms`).catch(() => ({ rooms: [] })),
        apiRequest(`/hostels/${hostelId}/renters`).catch(() => ({ renters: [] })),
      ]);

      setRepairs(repairsData.repairs || []);
      setRepairPersons(personsData.repairPersons || []);
      setRooms(roomsData.rooms || []);
      setRenters(rentersData.renters || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load repair data");
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  // Create Repair Request
  async function handleCreateRepair(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      setError("Title and description are required");
      return;
    }

    try {
      setSavingRepair(true);
      setError("");

      await apiRequest(`/hostels/${hostelId}/repairs`, {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          priority: newPriority,
          roomId: newRoomId || undefined,
          renterId: newRenterId || undefined,
        }),
      });

      setShowAddRepair(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("MEDIUM");
      setNewRoomId("");
      setNewRenterId("");
      showToast("Repair request created successfully!");
      await loadAllData();
    } catch (err: any) {
      setError(err?.message || "Failed to create repair request");
    } finally {
      setSavingRepair(false);
    }
  }

  // Update Repair Status / Notes / Assigned Person
  async function handleUpdateRepair(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRepair) return;

    try {
      setUpdatingRepair(true);
      setError("");

      const assignedPerson = repairPersons.find((p) => p.id === editAssignedPersonId);

      await apiRequest(`/hostels/${hostelId}/repairs/${editingRepair.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: editStatus,
          adminNotes: editNotes.trim() || undefined,
          assignedRepairPersonId: editAssignedPersonId || undefined,
          assignedTo: assignedPerson ? assignedPerson.name : undefined,
        }),
      });

      setEditingRepair(null);
      showToast("Repair ticket updated successfully!");
      await loadAllData();
    } catch (err: any) {
      setError(err?.message || "Failed to update repair request");
    } finally {
      setUpdatingRepair(false);
    }
  }

  // Add Repair Person
  async function handleAddRepairPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!personName.trim() || !personEmail.trim() || !personPhone.trim()) {
      setError("Name, email, and mobile number are required");
      return;
    }

    try {
      setSavingPerson(true);
      setError("");

      await apiRequest(`/hostels/${hostelId}/repair-persons`, {
        method: "POST",
        body: JSON.stringify({
          name: personName.trim(),
          email: personEmail.trim(),
          phone: personPhone.trim(),
          specialty: personSpecialty,
          password: personPassword.trim() || "Repair@123",
        }),
      });

      setShowAddPerson(false);
      setPersonName("");
      setPersonEmail("");
      setPersonPhone("");
      setPersonSpecialty("General Maintenance");
      setPersonPassword("Repair@123");
      showToast("Repair person added successfully! They can now log in using email or mobile number.");
      await loadAllData();
    } catch (err: any) {
      setError(err?.message || "Failed to add repair person");
    } finally {
      setSavingPerson(false);
    }
  }

  // Remove Repair Person
  async function handleRemoveRepairPerson(personId: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove ${name} from this hostel's repair personnel?`)) {
      return;
    }

    try {
      setError("");
      await apiRequest(`/hostels/${hostelId}/repair-persons/${personId}`, {
        method: "DELETE",
      });
      showToast(`Removed ${name} successfully`);
      await loadAllData();
    } catch (err: any) {
      setError(err?.message || "Failed to remove repair person");
    }
  }

  // Room & Renter lookup helpers
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.roomNumber])), [rooms]);
  const renterMap = useMemo(() => new Map(renters.map((r) => [r.id, r])), [renters]);

  // Filtered repairs
  const filteredRepairs = useMemo(() => {
    return repairs.filter((r) => {
      if (statusFilter !== "ALL" && (r.status || "SUBMITTED").toUpperCase() !== statusFilter) {
        return false;
      }
      if (priorityFilter !== "ALL" && (r.priority || "MEDIUM").toUpperCase() !== priorityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const roomNum = r.roomId ? roomMap.get(r.roomId)?.toLowerCase() || "" : "";
        const title = (r.title || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const assigned = (r.assignedTo || "").toLowerCase();
        return roomNum.includes(query) || title.includes(query) || desc.includes(query) || assigned.includes(query);
      }
      return true;
    });
  }, [repairs, statusFilter, priorityFilter, searchQuery, roomMap]);

  // KPI counts
  const countSubmitted = repairs.filter((r) => (r.status || "SUBMITTED") === "SUBMITTED").length;
  const countInProgress = repairs.filter((r) => r.status === "IN_PROGRESS").length;
  const countResolved = repairs.filter((r) => r.status === "RESOLVED").length;

  function getPriorityBadge(priority?: string) {
    const p = (priority || "MEDIUM").toUpperCase();
    let bg = "#e0e7ff";
    let text = "#4338ca";
    if (p === "URGENT") {
      bg = "#fee2e2";
      text = "#b91c1c";
    } else if (p === "HIGH") {
      bg = "#ffedd5";
      text = "#c2410c";
    } else if (p === "LOW") {
      bg = "#f3f4f6";
      text = "#4b5563";
    }
    return (
      <span
        style={{
          display: "inline-block",
          padding: "3px 8px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          background: bg,
          color: text,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {p}
      </span>
    );
  }

  function getStatusBadge(status?: string) {
    const s = (status || "SUBMITTED").toUpperCase();
    let bg = "#fef3c7";
    let text = "#92400e";
    let label = "Reported";
    if (s === "IN_PROGRESS") {
      bg = "#ede9fe";
      text = "#6d28d9";
      label = "In Progress";
    } else if (s === "RESOLVED") {
      bg = "#dcfce7";
      text = "#15803d";
      label = "Resolved";
    } else if (s === "CANCELLED") {
      bg = "#f3f4f6";
      text = "#6b7280";
      label = "Cancelled";
    }
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          background: bg,
          color: text,
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Notifications */}
      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: "#dcfce7", color: "#15803d", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {/* Sub Tabs Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #e5e7eb",
          marginBottom: 24,
          paddingBottom: 4,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setActiveTab("requests")}
            style={{
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              borderBottom: activeTab === "requests" ? "3px solid #4f46e5" : "3px solid transparent",
              background: "transparent",
              color: activeTab === "requests" ? "#4f46e5" : "#64748b",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Repair Requests ({repairs.length})
          </button>
          <button
            onClick={() => setActiveTab("personnel")}
            style={{
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              borderBottom: activeTab === "personnel" ? "3px solid #4f46e5" : "3px solid transparent",
              background: "transparent",
              color: activeTab === "personnel" ? "#4f46e5" : "#64748b",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Repair Personnel ({repairPersons.length})
          </button>
        </div>

        {activeTab === "requests" ? (
          <button
            className="primary-button"
            onClick={() => setShowAddRepair(true)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>+</span> New Repair Request
          </button>
        ) : (
          <button
            className="primary-button"
            onClick={() => setShowAddPerson(true)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>+</span> Add Repair Person
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>Loading repair details...</div>
      ) : activeTab === "requests" ? (
        /* ============================================================
           TAB 1: REPAIR REQUESTS
           ============================================================ */
        <div>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Total Requests</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{repairs.length}</div>
            </div>
            <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, color: "#d97706", fontWeight: 600 }}>Reported / Pending</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#d97706", marginTop: 4 }}>{countSubmitted}</div>
            </div>
            <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600 }}>In Progress</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#7c3aed", marginTop: 4 }}>{countInProgress}</div>
            </div>
            <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>Resolved</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>{countResolved}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Search by title, room, technician..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: "1 1 240px",
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 14,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Reported (Pending)</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Repairs List */}
          {filteredRepairs.length === 0 ? (
            <div style={{ background: "#fff", padding: 48, borderRadius: 12, textAlign: "center", color: "#64748b" }}>
              <h3>No repair requests found</h3>
              <p style={{ marginTop: 6, fontSize: 14 }}>
                {repairs.length === 0
                  ? "There are currently no repair requests submitted for this hostel."
                  : "No requests match the selected filters."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredRepairs.map((r) => {
                const roomNum = r.roomId ? roomMap.get(r.roomId) : null;
                const renter = r.renterId ? renterMap.get(r.renterId) : null;
                const renterName = renter?.user
                  ? `${renter.user.firstName} ${renter.user.lastName || ""}`.trim()
                  : null;

                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      padding: 20,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {roomNum && (
                          <span
                            style={{
                              background: "#e0e7ff",
                              color: "#3730a3",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            Room {roomNum}
                          </span>
                        )}
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{r.title}</h3>
                        {getPriorityBadge(r.priority)}
                        {getStatusBadge(r.status)}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setEditingRepair(r);
                            setEditStatus(r.status || "IN_PROGRESS");
                            setEditNotes(r.adminNotes || "");
                            setEditAssignedPersonId(r.assignedRepairPersonId || "");
                          }}
                          style={{ padding: "6px 14px", fontSize: 13 }}
                        >
                          Update / Assign
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: 0, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>{r.description}</p>

                    {/* Metadata strip */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 18,
                        fontSize: 13,
                        color: "#64748b",
                        borderTop: "1px solid #f1f5f9",
                        paddingTop: 10,
                      }}
                    >
                      {renterName && (
                        <div>
                          <strong>Reported By:</strong> {renterName} {renter?.user?.phone ? `(${renter.user.phone})` : ""}
                        </div>
                      )}
                      <div>
                        <strong>Date:</strong> {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                      {r.assignedTo && (
                        <div>
                          <strong>Assigned Technician:</strong>{" "}
                          <span style={{ color: "#4f46e5", fontWeight: 600 }}>{r.assignedTo}</span>
                        </div>
                      )}
                    </div>

                    {r.adminNotes && (
                      <div
                        style={{
                          background: "#f8fafc",
                          borderLeft: "3px solid #6366f1",
                          padding: "8px 12px",
                          borderRadius: "0 6px 6px 0",
                          fontSize: 13,
                          color: "#475569",
                        }}
                      >
                        <strong>Work / Admin Notes:</strong> {r.adminNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================
           TAB 2: REPAIR PERSONNEL
           ============================================================ */
        <div>
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 24,
              color: "#1e3a8a",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 22 }}>🔧</span>
            <div>
              <strong style={{ fontSize: 15 }}>Repair Personnel Portal Access</strong>
              <p style={{ margin: "4px 0 0", fontSize: 13.5, lineHeight: 1.5, color: "#1e40af" }}>
                When you add a repair technician below with their email and mobile number, they can log in using either their{" "}
                <strong>Email OR Mobile Number</strong> on the main login screen.
                <br />
                Upon login, they will be redirected <strong>strictly to their Repair Portal</strong> to view, start, and resolve maintenance jobs without any access to hostel financial or admin settings.
              </p>
            </div>
          </div>

          {repairPersons.length === 0 ? (
            <div style={{ background: "#fff", padding: 48, borderRadius: 12, textAlign: "center", color: "#64748b" }}>
              <h3>No repair personnel added yet</h3>
              <p style={{ marginTop: 6, fontSize: 14 }}>
                Add your technicians (plumbers, electricians, carpenters) so they can access their repair portal.
              </p>
              <button
                className="primary-button"
                onClick={() => setShowAddPerson(true)}
                style={{ marginTop: 14 }}
              >
                + Add First Repair Person
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {repairPersons.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    padding: 20,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 18,
                          }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{p.name}</h4>
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 4,
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              background: "#f1f5f9",
                              color: "#475569",
                            }}
                          >
                            {p.specialty || "General Maintenance"}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#15803d",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ACTIVE
                      </span>
                    </div>

                    <div style={{ fontSize: 13.5, color: "#475569", display: "flex", flexDirection: "column", gap: 6, margin: "14px 0" }}>
                      <div>
                        <strong>📧 Email:</strong> {p.email}
                      </div>
                      <div>
                        <strong>📱 Mobile:</strong> {p.phone}
                      </div>
                      <div>
                        <strong>📅 Added:</strong> {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="secondary-button"
                      onClick={() => handleRemoveRepairPerson(p.id, p.name)}
                      style={{ color: "#dc2626", borderColor: "#fecaca" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          MODAL: ADD REPAIR REQUEST
          ============================================================ */}
      {showAddRepair && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <h2>New Repair Request</h2>
            <p className="subtitle">Log a maintenance issue for this hostel.</p>

            <form onSubmit={handleCreateRepair}>
              <label>Title *</label>
              <input
                type="text"
                placeholder="e.g. Tap leaking in bathroom, AC not cooling"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />

              <label>Description *</label>
              <textarea
                rows={3}
                placeholder="Detailed description of the issue..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                required
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label>Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label>Room (Optional)</label>
                  <select
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                  >
                    <option value="">Select Room</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label>Renter (Optional)</label>
              <select
                value={newRenterId}
                onChange={(e) => setNewRenterId(e.target.value)}
              >
                <option value="">Select Renter</option>
                {renters.map((renter) => {
                  const name = renter.user
                    ? `${renter.user.firstName} ${renter.user.lastName || ""}`.trim()
                    : `Renter ${renter.id.slice(0, 6)}`;
                  const roomNum = renter.roomId ? roomMap.get(renter.roomId) : "";
                  return (
                    <option key={renter.id} value={renter.id}>
                      {name} {roomNum ? `(Room ${roomNum})` : ""}
                    </option>
                  );
                })}
              </select>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddRepair(false)}
                  disabled={savingRepair}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={savingRepair}>
                  {savingRepair ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: UPDATE STATUS & ASSIGN TECHNICIAN
          ============================================================ */}
      {editingRepair && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h2>Update Repair Ticket</h2>
            <p className="subtitle">{editingRepair.title}</p>

            <form onSubmit={handleUpdateRepair}>
              <label>Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
              >
                <option value="SUBMITTED">Reported / Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <label>Assign Repair Technician</label>
              <select
                value={editAssignedPersonId}
                onChange={(e) => setEditAssignedPersonId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {repairPersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.specialty || "Maintenance"})
                  </option>
                ))}
              </select>

              <label>Work / Resolution Notes</label>
              <textarea
                rows={3}
                placeholder="Enter updates, parts replaced, or technician remarks..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingRepair(null)}
                  disabled={updatingRepair}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={updatingRepair}>
                  {updatingRepair ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: ADD REPAIR PERSON
          ============================================================ */}
      {showAddPerson && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <h2>Add Repair Personnel</h2>
            <p className="subtitle">
              Register a technician who can log in to their dedicated Repairs Portal using their email or mobile number.
            </p>

            <form onSubmit={handleAddRepairPerson}>
              <label>Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@repair.com"
                    value={personEmail}
                    onChange={(e) => setPersonEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={personPhone}
                    onChange={(e) => setPersonPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <label>Specialty</label>
              <select
                value={personSpecialty}
                onChange={(e) => setPersonSpecialty(e.target.value)}
              >
                {SPECIALTY_OPTIONS.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>

              <label>Initial Password</label>
              <input
                type="text"
                value={personPassword}
                onChange={(e) => setPersonPassword(e.target.value)}
                placeholder="Default: Repair@123"
              />
              <span style={{ fontSize: 12, color: "#64748b", marginTop: -6, display: "block" }}>
                The technician will use this password alongside their email or mobile number to log in.
              </span>

              <div className="modal-actions" style={{ marginTop: 22 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddPerson(false)}
                  disabled={savingPerson}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={savingPerson}>
                  {savingPerson ? "Adding..." : "Add Repair Person"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
