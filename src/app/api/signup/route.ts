import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql"; // Ensure this exports a MySQL connection pool
import { hash } from "bcryptjs";
import { z } from "zod";

import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const allowedRoles = [
  "Manager",
  "Accountant",
  "Sellor",
  "Affiliate",
  "Provider",
  "SECRETARY",
  "DOCTOR",
  "Owner",
  "Customer",
] as const;

const signupSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(allowedRoles),
  salary: z.union([z.string(), z.number()]).optional(),
  bonus: z.union([z.string(), z.number()]).optional(),
});

async function executeQuery(query: string, values: any[]): Promise<any> {
  const db = await pool.getConnection();
  try {
    const [result] = await db.execute(query, values);
    return result;
  } finally {
    db.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const database = getDbNameFromSession(session);
    const pageName = session.user.pageName?.trim() || null;

    const parsed = await signupSchema.parseAsync(await request.json());
    const { name, email, password, role } = parsed;
    const salary =
      typeof parsed.salary === "string" ? parsed.salary.replace(/,/g, "") : parsed.salary;
    const bonus =
      typeof parsed.bonus === "string" ? parsed.bonus.replace(/,/g, "") : parsed.bonus;

    // Check if the user already exists
    const queryCheck = "SELECT * FROM user WHERE email = ?";
    const existingUsers = await executeQuery(queryCheck, [email]);

    if (existingUsers.length > 0) {
      return NextResponse.json({ success: false, message: "User already exists" }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Define conditional insertion for salary and bonus based on role
    let queryInsert;
    let values;

    // Only include salary and bonus for specified roles
    if (["Manager", "Accountant", "Sellor"].includes(role)) {
      queryInsert =
        "INSERT INTO user (name, email, password, role, salary, bonus, `database`, pageName) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      values = [name, email, hashedPassword, role, salary || 0, bonus || 0, database, pageName];
    } else {
      queryInsert =
        "INSERT INTO user (name, email, password, role, `database`, pageName) VALUES (?, ?, ?, ?, ?, ?)";
      values = [name, email, hashedPassword, role, database, pageName];
    }

    // Insert the new user into the database
    await executeQuery(queryInsert, values);

    return NextResponse.json({ success: true, message: "User created successfully" }, { status: 201 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid signup payload",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: false, message: "Unable to create user" }, { status: 500 });
  }
}
