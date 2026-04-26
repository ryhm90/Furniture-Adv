import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/mysql";

import { requireRole, toAuthorizationResponse } from "@/lib/serverAuth";

async function executeQuery(query: string, values: any[]) {
    const db = await pool.getConnection();
    try {
        const [result] = await db.execute(query, values);
        return result;
    } finally {
        db.release();
    }
}


export async function GET() {

    try {
        await requireRole(["Manager"]);
        const db = await pool.getConnection();

        const query = "SELECT * FROM users";
        const [rows] = await db.execute(query, []);

        db.release();

        return NextResponse.json(rows);
    } catch (error) {
        const authResponse = toAuthorizationResponse(error);
        if (authResponse) {
            return authResponse;
        }
        return NextResponse.json(
            {
                message: "An unexpected error occurred"
            },
            { status: 500 }
        );
    }
    }
export async function PUT(request: NextRequest) {
    try {
        await requireRole(["Manager"]);
        const { id, email,name,type } = await request.json();

        const query =
        "UPDATE users SET name = ?,email = ?,type = ? WHERE id = ?";
        const values = [name,email,type, id];

        await executeQuery(query, values);

        return NextResponse.json({ message: "success", status: 200 });
    } catch (error) {
        const authResponse = toAuthorizationResponse(error);
        if (authResponse) {
            return authResponse;
        }
        return NextResponse.json(
            { message: "An unexpected error occurred", status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await requireRole(["Manager"]);
        const { id } = await request.json();

        const query = "DELETE FROM users WHERE id = ?";
        const values = [id];

        await executeQuery(query, values);

        return NextResponse.json({ message: "success", status: 200 });
    } catch (error) {
        const authResponse = toAuthorizationResponse(error);
        if (authResponse) {
            return authResponse;
        }
        return NextResponse.json(
            { message: "An unexpected error occurred", status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireRole(["Manager"]);
        const { name, email, type } = await request.json();

        const query =
        "INSERT INTO users (name,email,type) VALUES (?,?,?)";
        const values = [name, email, type];

        await executeQuery(query, values);

        return NextResponse.json({ message: "success", status: 200 });
    } catch (error) {
        const authResponse = toAuthorizationResponse(error);
        if (authResponse) {
            return authResponse;
        }
        return NextResponse.json(
            { message: "An unexpected error occurred", status: 500 }
        );
    }
}
    
