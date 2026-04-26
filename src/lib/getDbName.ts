// src/lib/getDbName.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function getDbName() {
  // 1. Fetch the session
  const session = await getServerSession(authOptions);

  // 2. Check if user is authenticated
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // 3. Extract the per-user DB name
  const dbName = session.user.database;
  if (!dbName) {
    throw new Error("No database specified in user session");
  }

  // 4. Return the DB name for use elsewhere
  return dbName;
}
