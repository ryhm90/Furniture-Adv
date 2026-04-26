
'use server'

import { signIn, signOut } from "@/auth";

export async function doSocialLogin(formData) {
    const action = formData.get('action');
    await signIn(action, { redirectTo: "/appointments" });
}

export async function doLogout() {
  await signOut({ redirectTo: "http://158.220.125.130:3000/" });
}

export async function doCredentialLogin(formData) {

  try {
    const response = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    return response;
  } catch (err) {
    throw err;
  }
}