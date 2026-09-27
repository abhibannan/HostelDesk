export type UserRole = "SUPER_ADMIN" | "ADMIN" | "RENTER";
export type UserStatus = "ACTIVE" | "DISABLED";

export interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}
