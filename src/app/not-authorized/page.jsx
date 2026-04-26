"use client";
import AppShell from "../components/AppShell";

function NotAuthorizedPage() {
  return (
    <AppShell A="غير مخول">
      لا تملك صلاحية الوصول إلى هذه الصفحة.
    </AppShell>
  );
}

export default NotAuthorizedPage;
