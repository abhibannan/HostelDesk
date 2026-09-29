import { Renter, Dashboard } from "../types";

export function getName(renter: Renter): string {
  if (renter.name) return renter.name;
  if (renter.fullName) return renter.fullName;
  if (renter.user?.name) return renter.user.name;
  if (renter.user?.fullName) return renter.user.fullName;
  const first = renter.user?.firstName ?? "";
  const last = renter.user?.lastName ?? "";
  return `${first} ${last}`.trim() || renter.email || renter.user?.email || "Renter";
}

export function getEmail(renter: Renter): string {
  return renter.email || renter.user?.email || "";
}

export function listFrom<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== "object") return [];
  const object = data as Record<string, unknown>;
  if (Array.isArray(object[key])) return object[key] as T[];
  if (Array.isArray(object.data)) return object.data as T[];
  if (Array.isArray(object.items)) return object.items as T[];
  return [];
}

export function dashboardFrom(data: unknown): Dashboard {
  const outer = data as Record<string, unknown> | null;
  const raw = (outer?.dashboard ?? data) as Record<string, unknown> | null;
  const value = raw || {};
  const number = (key: string) => Number(value[key] ?? 0);

  return {
    totalRooms: number("totalRooms"),
    activeRooms: number("activeRooms"),
    occupiedRooms: number("occupiedRooms"),
    availableRooms: number("availableRooms"),
    activeRenters: number("activeRenters"),
    totalFees: number("totalFees"),
    paidFees: number("paidFees"),
    pendingFees: number("pendingFees"),
    partiallyPaidFees: number("partiallyPaidFees"),
    overdueFees: number("overdueFees"),
    outstandingFees: number("outstandingFees"),
    totalPayments: number("totalPayments"),
    paidPayments: number("paidPayments"),
    pendingPayments: number("pendingPayments"),
    totalRepairRequests: number("totalRepairRequests"),
    submittedRepairs: number("submittedRepairs"),
    inProgressRepairs: number("inProgressRepairs"),
    resolvedRepairs: number("resolvedRepairs"),
    cancelledRepairs: number("cancelledRepairs"),
  };
}

export function money(value: number | undefined): string {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function statusLabel(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}
