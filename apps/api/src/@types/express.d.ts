import "express"; // Import express types

import type { AccountTrustEntitlements } from "@podverse/helpers";

declare global {
  namespace Express {
    interface User {
      id: number;
      id_text: string;
      verified: boolean;
      entitlements?: AccountTrustEntitlements;
    }
    interface Request {
      user?: User;
    }
  }
}

// Exporting an empty module to make sure TypeScript treats this as a module
export {};
