import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth } from "../firebase";

const API_URL = "http://localhost:3000/api/v1";

type Bed = {
  id: string;
  roomId: string;
  hostelId: string;
  bedNumber: string;
  status: string;
};

type Room = {
  id: string;
  hostelId: string;
  roomNumber: string;
  floor?: string | null;
  capacity: number;
  status: string;
  beds?: Bed[];
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

export default function RoomManagement({
  hostelId,
}: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showRoomForm, setShowRoomForm] =
    useState(false);

  const [showBedForm, setShowBedForm] =
    useState<string | null>(null);

  const [roomNumber, setRoomNumber] =
    useState("");

  const [floor, setFloor] = useState("");

  const [capacity, setCapacity] =
    useState("");

  const [bedNumber, setBedNumber] =
    useState("");

  const [savingRoom, setSavingRoom] =
    useState(false);

  const [savingBed, setSavingBed] =
    useState(false);

  const [search, setSearch] = useState("");

  async function loadRooms() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        `/hostels/${hostelId}/rooms`,
      );

      const roomList: Room[] =
        data.rooms ?? [];

      const detailedRooms =
        await Promise.all(
          roomList.map(async (room) => {
            try {
              const detail =
                await apiRequest(
                  `/hostels/${hostelId}/rooms/${room.id}`,
                );

              return detail.room ?? room;
            } catch {
              return room;
            }
          }),
        );

      setRooms(detailedRooms);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load rooms",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRooms();
  }, [hostelId]);

  const filteredRooms = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return rooms;
    }

    return rooms.filter((room) =>
      `${room.roomNumber} ${room.floor ?? ""}`
        .toLowerCase()
        .includes(value),
    );
  }, [rooms, search]);

  function resetRoomForm() {
    setRoomNumber("");
    setFloor("");
    setCapacity("");
  }

  function resetBedForm() {
    setBedNumber("");
  }

  async function handleCreateRoom(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    try {
      setSavingRoom(true);
      setError("");
      setSuccess("");

      if (!roomNumber.trim()) {
        throw new Error(
          "Room number is required",
        );
      }

      if (!capacity) {
        throw new Error(
          "Room capacity is required",
        );
      }

      const capacityNumber =
        Number(capacity);

      if (
        !Number.isInteger(capacityNumber) ||
        capacityNumber < 1
      ) {
        throw new Error(
          "Capacity must be a positive whole number",
        );
      }

      await apiRequest(
        `/hostels/${hostelId}/rooms`,
        {
          method: "POST",
          body: JSON.stringify({
            roomNumber:
              roomNumber.trim(),
            floor: floor.trim(),
            capacity: capacityNumber,
          }),
        },
      );

      setSuccess(
        "Room created successfully.",
      );

      resetRoomForm();
      setShowRoomForm(false);

      await loadRooms();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create room",
      );
    } finally {
      setSavingRoom(false);
    }
  }

  async function handleCreateBed(
    event: React.FormEvent,
    roomId: string,
  ) {
    event.preventDefault();

    try {
      setSavingBed(true);
      setError("");
      setSuccess("");

      if (!bedNumber.trim()) {
        throw new Error(
          "Bed number is required",
        );
      }

      await apiRequest(
        `/hostels/${hostelId}/rooms/${roomId}/beds`,
        {
          method: "POST",
          body: JSON.stringify({
            bedNumber:
              bedNumber.trim(),
          }),
        },
      );

      setSuccess(
        "Bed added successfully.",
      );

      resetBedForm();
      setShowBedForm(null);

      await loadRooms();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add bed",
      );
    } finally {
      setSavingBed(false);
    }
  }

  function getBedClass(status: string) {
    switch (status) {
      case "AVAILABLE":
        return "available";

      case "OCCUPIED":
        return "occupied";

      case "MAINTENANCE":
        return "maintenance";

      default:
        return "inactive";
    }
  }

  function getRoomOccupancy(
    room: Room,
  ) {
    const beds = room.beds ?? [];

    const occupied = beds.filter(
      (bed) =>
        bed.status === "OCCUPIED",
    ).length;

    const total =
      room.capacity || beds.length;

    return {
      occupied,
      total,
      available: beds.filter(
        (bed) =>
          bed.status === "AVAILABLE",
      ).length,
    };
  }

  if (loading) {
    return (
      <section className="module-page">
        <div className="page-heading">
          <div>
            <h1>Rooms & Beds</h1>
            <p>
              Manage rooms and bed availability.
            </p>
          </div>
        </div>

        <div className="loading-state">
          Loading rooms...
        </div>
      </section>
    );
  }

  return (
    <section className="module-page">
      <div className="page-heading">
        <div>
          <h1>Rooms & Beds</h1>
          <p>
            Manage rooms, beds and occupancy.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setError("");
            setSuccess("");
            setShowRoomForm(
              !showRoomForm,
            );
          }}
        >
          {showRoomForm
            ? "Close"
            : "+ Add Room"}
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

      {showRoomForm && (
        <div className="module-form-card">
          <div className="section-heading">
            <div>
              <h2>Add New Room</h2>
              <p>
                Create a room before adding beds.
              </p>
            </div>
          </div>

          <form
            className="form-grid"
            onSubmit={handleCreateRoom}
          >
            <div className="form-field">
              <label>
                Room Number
              </label>

              <input
                value={roomNumber}
                onChange={(event) =>
                  setRoomNumber(
                    event.target.value,
                  )
                }
                placeholder="Example: 101"
              />
            </div>

            <div className="form-field">
              <label>
                Floor
              </label>

              <input
                value={floor}
                onChange={(event) =>
                  setFloor(
                    event.target.value,
                  )
                }
                placeholder="Example: Ground Floor"
              />
            </div>

            <div className="form-field">
              <label>
                Capacity
              </label>

              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(event) =>
                  setCapacity(
                    event.target.value,
                  )
                }
                placeholder="Example: 2"
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={savingRoom}
              >
                {savingRoom
                  ? "Creating..."
                  : "Create Room"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  resetRoomForm();
                  setShowRoomForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="module-toolbar">
        <div>
          <strong>
            {rooms.length}
          </strong>{" "}
          room
          {rooms.length !== 1
            ? "s"
            : ""}
        </div>

        <input
          className="search-input"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Search rooms..."
        />
      </div>

      {filteredRooms.length === 0 ? (
        <div className="empty-state">
          <h3>
            {rooms.length === 0
              ? "No rooms yet"
              : "No matching rooms"}
          </h3>

          <p>
            {rooms.length === 0
              ? "Create your first room to start managing beds."
              : "Try a different room number or floor."}
          </p>
        </div>
      ) : (
        <div className="room-grid">
          {filteredRooms.map(
            (room) => {
              const occupancy =
                getRoomOccupancy(
                  room,
                );

              const beds =
                room.beds ?? [];

              return (
                <article
                  className="room-card"
                  key={room.id}
                >
                  <div className="room-card-header">
                    <div>
                      <span className="room-label">
                        ROOM
                      </span>

                      <h2>
                        {room.roomNumber}
                      </h2>

                      <p>
                        {room.floor ||
                          "Floor not set"}
                      </p>
                    </div>

                    <span
                      className={`status-badge ${
                        room.status ===
                        "ACTIVE"
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="room-stats">
                    <div>
                      <span>
                        Occupied
                      </span>

                      <strong>
                        {
                          occupancy.occupied
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Available
                      </span>

                      <strong>
                        {
                          occupancy.available
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Capacity
                      </span>

                      <strong>
                        {
                          occupancy.total
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="room-beds-header">
                    <div>
                      <h3>
                        Beds
                      </h3>

                      <span>
                        {beds.length}{" "}
                        configured
                      </span>
                    </div>

                    <button
                      className="small-button"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        resetBedForm();

                        setShowBedForm(
                          showBedForm ===
                            room.id
                            ? null
                            : room.id,
                        );
                      }}
                    >
                      + Add Bed
                    </button>
                  </div>

                  {showBedForm ===
                    room.id && (
                    <form
                      className="bed-form"
                      onSubmit={(
                        event,
                      ) =>
                        handleCreateBed(
                          event,
                          room.id,
                        )
                      }
                    >
                      <input
                        value={
                          bedNumber
                        }
                        onChange={(
                          event,
                        ) =>
                          setBedNumber(
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Bed number, e.g. A"
                      />

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          savingBed
                        }
                      >
                        {savingBed
                          ? "Adding..."
                          : "Add"}
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setShowBedForm(
                            null,
                          )
                        }
                      >
                        Cancel
                      </button>
                    </form>
                  )}

                  <div className="bed-list">
                    {beds.length ===
                    0 ? (
                      <div className="no-beds">
                        No beds configured
                        yet.
                      </div>
                    ) : (
                      beds.map(
                        (bed) => (
                          <div
                            className={`bed-item ${getBedClass(
                              bed.status,
                            )}`}
                            key={
                              bed.id
                            }
                          >
                            <div className="bed-icon">
                              🛏
                            </div>

                            <div className="bed-info">
                              <strong>
                                Bed{" "}
                                {
                                  bed.bedNumber
                                }
                              </strong>

                              <span>
                                {
                                  bed.status
                                }
                              </span>
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}