import LoginClient from "./LoginClient";

interface LoginPageProps {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <LoginClient
      callbackUrl={resolvedSearchParams?.callbackUrl || "/dashboard"}
      error={resolvedSearchParams?.error || null}
    />
  );
}
