import { useCallback, useRef, useState } from "react";
import { API_URL, parseJsonResponse as jsonResponse } from "../services/api";
import {
  Dashboard,
  EMPTY_DASHBOARD,
  Fee,
  Hostel,
  Notification,
  Payment,
  Renter,
  Repair,
  Room,
} from "../types";
import { dashboardFrom, listFrom } from "../utils/formatters";

export interface HostelDataState {
  dashboard: Dashboard;
  hostels: Hostel[];
  selectedHostelId: string;
  rooms: Room[];
  renters: Renter[];
  fees: Fee[];
  payments: Payment[];
  repairs: Repair[];
  notifications: Notification[];
  dataLoading: boolean;
  selectedHostel: Hostel | undefined;
  activeRenters: Renter[];
  activeRooms: Room[];
}

export interface HostelDataActions {
  setHostels: (h: Hostel[]) => void;
  setSelectedHostelId: (id: string) => void;
  setDashboard: (d: Dashboard) => void;
  setFees: (f: Fee[]) => void;
  setPayments: (p: Payment[]) => void;
  setRepairs: (r: Repair[]) => void;
  setNotifications: (n: Notification[]) => void;
  resetAllData: () => void;
  refreshAll: () => Promise<void>;
  refreshHostelData: (hostelId?: string) => Promise<void>;
  refreshDashboardOnly: () => Promise<void>;
  loadRenterData: (
    token: string,
    hostelId: string,
    userId: string,
    currentRenterSetter: (r: Renter | null) => void,
  ) => Promise<void>;
  /** Low-level authenticated request helper */
  request: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  setToken: (t: string | null) => void;
}

export function useHostelData(): HostelDataState & HostelDataActions {
  const [token, setToken] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard>(EMPTY_DASHBOARD);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const refreshBusy = useRef(false);

  const selectedHostel = hostels.find((h) => h.id === selectedHostelId);
  const activeRenters = renters.filter(
    (r) => String(r.status || "ACTIVE").toUpperCase() === "ACTIVE",
  );
  const activeRooms = rooms.filter(
    (r) => String(r.status || "ACTIVE").toUpperCase() === "ACTIVE",
  );

  const request = useCallback(
    async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
      if (!token) throw new Error("You are not signed in.");
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await jsonResponse(response);
      if (!response.ok) {
        const message =
          data && typeof data === "object"
            ? (data as Record<string, unknown>).message
            : null;
        throw new Error(String(message || `Request failed: ${response.status}`));
      }
      return data as T;
    },
    [token],
  );

  const refreshDashboardOnly = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await jsonResponse(resp);
      if (resp.ok) setDashboard(dashboardFrom(data));
    } catch {
      // Keep existing dashboard on transient failure
    }
  }, [token]);

  const refreshHostelData = useCallback(
    async (hostelId = selectedHostelId) => {
      if (!token || !hostelId || refreshBusy.current) return;
      refreshBusy.current = true;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [roomData, renterData, feeData, paymentData, repairData, notifData] =
          await Promise.all([
            fetch(`${API_URL}/hostels/${hostelId}/rooms`, { headers }).then(jsonResponse),
            fetch(`${API_URL}/hostels/${hostelId}/renters`, { headers }).then(jsonResponse),
            fetch(`${API_URL}/hostels/${hostelId}/fees`, { headers }).then(jsonResponse),
            fetch(`${API_URL}/hostels/${hostelId}/payments`, { headers }).then(jsonResponse),
            fetch(`${API_URL}/hostels/${hostelId}/repairs`, { headers })
              .then(jsonResponse)
              .catch(() => ({ repairs: [] })),
            fetch(`${API_URL}/hostels/${hostelId}/notifications`, { headers })
              .then(jsonResponse)
              .catch(() => ({ notifications: [] })),
          ]);
        setRooms(listFrom<Room>(roomData, "rooms"));
        setRenters(listFrom<Renter>(renterData, "renters"));
        setFees(listFrom<Fee>(feeData, "fees"));
        setPayments(listFrom<Payment>(paymentData, "payments"));
        setRepairs(listFrom<Repair>(repairData, "repairs"));
        // Only show master broadcast docs in the admin notification feed
        const allNotifs = listFrom<Notification>(notifData, "notifications");
        const broadcastNotifs = allNotifs.filter(
          (n) => n.userId === "ALL" || n.entityType === "BROADCAST",
        );
        setNotifications(broadcastNotifs);
        await refreshDashboardOnly();
      } finally {
        refreshBusy.current = false;
      }
    },
    [token, selectedHostelId, refreshDashboardOnly],
  );

  const refreshAll = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      // Re-fetch hostels list so any newly added hostel appears immediately
      const hostelsData = await fetch(`${API_URL}/hostels`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(jsonResponse)
        .catch(() => null);
      if (hostelsData) {
        const fetchedHostels = listFrom<Hostel>(hostelsData, "hostels");
        setHostels(fetchedHostels);
        if (!selectedHostelId && fetchedHostels.length > 0) {
          setSelectedHostelId(fetchedHostels[0].id);
        }
      }

      if (selectedHostelId) {
        await refreshHostelData(selectedHostelId);
      }
    } finally {
      setDataLoading(false);
    }
  }, [token, selectedHostelId, refreshHostelData]);

  const loadRenterData = useCallback(
    async (
      idToken: string,
      hostelId: string,
      userId: string,
      currentRenterSetter: (r: Renter | null) => void,
    ) => {
      setDataLoading(true);
      const headers = { Authorization: `Bearer ${idToken}` };
      try {
        const [rentersData, paymentsData, repairsData, notifData] = await Promise.all([
          fetch(`${API_URL}/hostels/${hostelId}/renters`, { headers }).then(jsonResponse),
          fetch(`${API_URL}/hostels/${hostelId}/payments`, { headers }).then(jsonResponse),
          fetch(`${API_URL}/hostels/${hostelId}/my-repairs`, { headers })
            .then(jsonResponse)
            .catch(() => ({ repairs: [] })),
          fetch(`${API_URL}/notifications/me`, { headers })
            .then(jsonResponse)
            .catch(() =>
              fetch(`${API_URL}/hostels/${hostelId}/notifications`, { headers })
                .then(jsonResponse)
                .catch(() => ({ notifications: [] })),
            ),
        ]);

        const rentersList = listFrom<Renter>(rentersData, "renters");
        const myRenter =
          rentersList.find((r) => r.userId === userId || r.user?.id === userId) || null;
        currentRenterSetter(myRenter);

        if (myRenter) {
          const feesData = await fetch(
            `${API_URL}/hostels/${hostelId}/renters/${myRenter.id}/fees`,
            { headers },
          ).then(jsonResponse);
          setFees(listFrom<Fee>(feesData, "fees"));
        }

        const allPayments = listFrom<Payment>(paymentsData, "payments");
        const myPayments = myRenter
          ? allPayments.filter((p) => p.renterId === myRenter.id)
          : allPayments;
        setPayments(myPayments);
        setRepairs(listFrom<Repair>(repairsData, "repairs"));
        setNotifications(listFrom<Notification>(notifData, "notifications"));
      } catch (err) {
        console.error("Failed to load renter data:", err);
      } finally {
        setDataLoading(false);
      }
    },
    [],
  );

  const resetAllData = useCallback(() => {
    setDashboard(EMPTY_DASHBOARD);
    setHostels([]);
    setSelectedHostelId("");
    setRooms([]);
    setRenters([]);
    setFees([]);
    setPayments([]);
    setRepairs([]);
    setNotifications([]);
  }, []);

  return {
    dashboard,
    hostels,
    selectedHostelId,
    rooms,
    renters,
    fees,
    payments,
    repairs,
    notifications,
    dataLoading,
    selectedHostel,
    activeRenters,
    activeRooms,
    setHostels,
    setSelectedHostelId,
    setDashboard,
    setFees,
    setPayments,
    setRepairs,
    setNotifications,
    resetAllData,
    refreshAll,
    refreshHostelData,
    refreshDashboardOnly,
    loadRenterData,
    request,
    setToken,
  };
}
