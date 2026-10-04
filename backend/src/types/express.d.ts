import type { DecodedIdToken } from "firebase-admin/auth";
import type { AuthUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
      authUser?: AuthUser;
    }
  }
}

export { };
