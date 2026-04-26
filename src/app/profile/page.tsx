import { getServerSession } from "next-auth";
import React from "react";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";

const ProfilePage = async () => {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex items-center justify-center">
      <div className="bg-sky-700 text-slate-100 p-2 rounded shadow grid grid-cols-2 mt-9">
        <p>Name:</p>
        <p>{user.name}</p>
        <p>Email:</p>
        <p>{user.email}</p>
        <p>Role:</p>
        <p>{user.role}</p>
      </div>
    </div>
  );
};

export default ProfilePage;
