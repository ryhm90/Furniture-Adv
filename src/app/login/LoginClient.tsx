"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";

function getAuthErrorMessage(error: string | null) {
  if (!error) {
    return null;
  }

  if (
    error === "CredentialsSignin" ||
    error === "Invalid email or password"
  ) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }

  if (
    error.includes("Authentication service unavailable") ||
    error.includes("Access denied for user") ||
    error.includes("ECONNREFUSED")
  ) {
    return "تعذر الاتصال بقاعدة بيانات تسجيل الدخول. تحقق من إعدادات MySQL أولاً.";
  }

  return "تعذر تسجيل الدخول حالياً.";
}

interface LoginClientProps {
  callbackUrl: string;
  error: string | null;
}

export default function LoginClient({
  callbackUrl,
  error,
}: LoginClientProps) {
  const searchError = getAuthErrorMessage(error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: true,
      });

      if (response?.error) {
        setSubmitError(getAuthErrorMessage(response.error));
      }
    } catch (signInError) {
      console.error("Sign-in failed:", signInError);
      setSubmitError("تعذر تسجيل الدخول حالياً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = submitError || searchError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white px-6 py-12 shadow-lg lg:px-8">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="رمال البرمجية"
                height={70}
                width={160}
                priority
              />
            </div>

            <p className="mt-5 text-center text-sm text-gray-500 font-[Alexandria]">
              نظام ادارة مبيعات الأثاث
            </p>

            <h1 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 font-[Alexandria]">
              تسجيل الدخول إلى حسابك
            </h1>

            {callbackUrl !== "/dashboard" ? (
              <p className="mt-3 text-center text-xs text-slate-500 font-[Alexandria]">
                بعد تسجيل الدخول سيتم تحويلك تلقائياً إلى الصفحة المطلوبة.
              </p>
            ) : null}
          </div>

          <div className="mx-auto mt-10 w-full max-w-sm">
            <form className="space-y-6" onSubmit={handleSignIn} method="POST">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-gray-900 font-[Alexandria]"
                >
                  البريد الإلكتروني
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 font-[Alexandria]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-gray-900 font-[Alexandria]"
                >
                  كلمة المرور
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 font-[Alexandria]"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 font-[Alexandria]"
                >
                  {isSubmitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                </button>
              </div>
            </form>

            {errorMessage ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 font-[Alexandria]">
                {errorMessage}
              </div>
            ) : null}

            <p className="mt-10 text-center text-sm text-gray-500 font-[Alexandria]">
              يتم إنشاء الحسابات من قبل المدير فقط.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
