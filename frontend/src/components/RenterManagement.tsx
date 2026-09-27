import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth } from "../firebase";

const API_URL = "http://localhost:3000/api/v1";

type Room = {
  id: string;
  roomNumber: string;
  floor?: string | null;
  status: string;
};

type Renter = {
  id: string;
  hostelId: string;
  roomId: string;
  joiningDate: string;
  monthlyFee: number;
  securityDeposit: number;
  status: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  room?: {
    roomNumber: string;
    floor?: string | null;
  } | null;
};

type Props = {
  hostelId: string;
};

async function apiRequest(
  path: string,
  options: RequestInit = {},
) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You are not logged in");
  }

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
    throw new Error(
      data?.message || "Something went wrong",
    );
  }

  return data;
}

export default function RenterManagement({
  hostelId,
}: Props) {
  const [renters, setRenters] = useState<Renter[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [roomId, setRoomId] = useState("");

  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [monthlyFee, setMonthlyFee] = useState("");
  const [securityDeposit, setSecurityDeposit] =
    useState("");

  const filteredRenters = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return renters;
    }

    return renters.filter((renter) => {
      const name =
        `${renter.user?.firstName ?? ""} ${renter.user?.lastName ?? ""}`;

      return (
        name.toLowerCase().includes(value) ||
        renter.user?.email
          ?.toLowerCase()
          .includes(value) ||
        renter.user?.phone
          ?.toLowerCase()
          .includes(value) ||
        renter.room?.roomNumber
          ?.toLowerCase()
          .includes(value)
      );
    });
  }, [renters, search]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [renterData, roomData] =
        await Promise.all([
          apiRequest(`/hostels/${hostelId}/renters`),
          apiRequest(`/hostels/${hostelId}/rooms`),
        ]);

      setRenters(renterData.renters ?? []);
      setRooms(roomData.rooms ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load renters",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [hostelId]);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRoomId("");
    setJoiningDate(
      new Date().toISOString().slice(0, 10),
    );
    setMonthlyFee("");
    setSecurityDeposit("");
  }

  function closeForm() {
    if (saving) return;

    resetForm();
    setShowForm(false);
    setError("");
  }

  async function handleCreateRenter(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!firstName.trim()) {
        throw new Error("First name is required");
      }

      if (!email.trim()) {
        throw new Error("Email is required");
      }

      if (!phone.trim()) {
        throw new Error("Phone number is required");
      }

      if (password.length < 6) {
        throw new Error(
          "Password must contain at least 6 characters",
        );
      }

      if (!roomId) {
        throw new Error("Please select a room");
      }

      if (!monthlyFee) {
        throw new Error("Monthly fee is required");
      }

      await apiRequest(
        `/hostels/${hostelId}/renters/create-account`,
        {
          method: "POST",
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
            roomId,
            joiningDate,
            monthlyFee: Number(monthlyFee),
            securityDeposit: Number(
              securityDeposit || 0,
            ),
          }),
        },
      );

      setSuccess(
        "Renter account created and room assigned successfully.",
      );

      resetForm();
      setShowForm(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create renter",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="renter-management">
      <div className="page-heading renter-heading">
        <div>
          <h1>Renters</h1>
          <p>
            Manage renter accounts and room assignments.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setError("");
            setSuccess("");
            setShowForm(true);
          }}
        >
          + Add Renter
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {success && (
        <div className="success-banner">
          {success}
        </div>
      )}

      {showForm && (
        <div className="renter-form-card">
          <div className="section-heading">
            <div>
              <h2>Add Renter</h2>
              <p>
                Create the renter's login and assign a room.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={closeForm}
              disabled={saving}
            >
              Close
            </button>
          </div>

          <form
            className="renter-form"
            onSubmit={handleCreateRenter}
          >
            <div className="form-grid">
              <label>
                First name *
                <input
                  value={firstName}
                  onChange={(e) =>
                    setFirstName(e.target.value)
                  }
                  placeholder="First name"
                />
              </label>

              <label>
                Last name
                <input
                  value={lastName}
                  onChange={(e) =>
                    setLastName(e.target.value)
                  }
                  placeholder="Last name"
                />
              </label>

              <label>
                Email *
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="renter@example.com"
                />
              </label>

              <label>
                Phone *
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="Phone number"
                />
              </label>

              <label>
                Login password *
                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                />
              </label>

              <label>
                Joining date *
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) =>
                    setJoiningDate(e.target.value)
                  }
                />
              </label>

              <label>
                Room *
                <select
                  value={roomId}
                  onChange={(e) =>
                    setRoomId(e.target.value)
                  }
                >
                  <option value="">
                    Select room
                  </option>

                  {rooms
                    .filter(
                      (room) =>
                        room.status === "ACTIVE",
                    )
                    .map((room) => (
                      <option
                        key={room.id}
                        value={room.id}
                      >
                        Room {room.roomNumber}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Monthly fee *
                <input
                  type="number"
                  min="0"
                  value={monthlyFee}
                  onChange={(e) =>
                    setMonthlyFee(e.target.value)
                  }
                  placeholder="0"
                />
              </label>

              <label>
                Security deposit
                <input
                  type="number"
                  min="0"
                  value={securityDeposit}
                  onChange={(e) =>
                    setSecurityDeposit(e.target.value)
                  }
                  placeholder="0"
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Creating..."
                  : "Create Renter"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="renter-toolbar">
        <input
          className="search-input"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search renters..."
        />

        <div className="renter-count">
          {filteredRenters.length} renter
          {filteredRenters.length === 1 ? "" : "s"}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          Loading renters...
        </div>
      ) : filteredRenters.length === 0 ? (
        <div className="empty-state">
          <h3>No renters found</h3>
          <p>
            Add your first renter using the button above.
          </p>
        </div>
      ) : (
        <div className="renter-grid">
          {filteredRenters.map((renter) => {
            const fullName =
              `${renter.user?.firstName ?? ""} ${renter.user?.lastName ?? ""}`.trim() ||
              "Unnamed renter";

            return (
              <article
                className="renter-card"
                key={renter.id}
              >
                <div className="renter-card-top">
                  <div className="renter-avatar">
                    {fullName.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3>{fullName}</h3>

                    <span
                      className={`status-badge ${
                        renter.status === "ACTIVE"
                          ? "status-active"
                          : "status-inactive"
                      }`}
                    >
                      {renter.status}
                    </span>
                  </div>
                </div>

                <div className="renter-details">
                  <div>
                    <span>Email</span>
                    <strong>
                      {renter.user?.email || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>
                      {renter.user?.phone || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Room</span>
                    <strong>
                      {renter.room?.roomNumber
                        ? `Room ${renter.room.roomNumber}`
                        : "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Monthly fee</span>
                    <strong>
                      ₹
                      {Number(
                        renter.monthlyFee,
                      ).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div>
                    <span>Joined</span>
                    <strong>
                      {renter.joiningDate || "—"}
                    </strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}