import { NextRequest, NextResponse } from "next/server";
import {
    AuthenticationUnavailableError,
    authenticateUser,
} from "@/lib/authenticateUser";

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        const user = await authenticateUser(email, password);

        if (!user) {
            return NextResponse.json({ success: false, message: "Invalid email or password" }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            message: "Login successful",
            user,
        });
    } catch (error) {
        if (error instanceof AuthenticationUnavailableError) {
            return NextResponse.json(
                { success: false, message: "Authentication service unavailable" },
                { status: 503 },
            );
        }

        console.error("Login route failed:", error);
        return NextResponse.json(
            { success: false, message: "Unexpected login error" },
            { status: 500 },
        );
    }
}
