import React from "react";

import { auth } from "@/auth";

const AdminPage = async () => {
  const session = await auth();
  return (
    <div>
      This is admin dashboard
      {JSON.stringify(session)}
    </div>
  );
};

export default AdminPage;
