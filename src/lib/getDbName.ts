import { auth } from "@/auth";

export async function getDbName() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const dbName = session.user.database;
  if (!dbName) {
    throw new Error("No database specified in user session");
  }

  return dbName;
}
