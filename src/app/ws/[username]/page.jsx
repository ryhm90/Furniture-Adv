import WholesaleCustomerPortal from "./WholesaleCustomerPortal";

export const metadata = {
  title: "كشف حساب الجملة",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function WholesaleCustomerPage({
  params,
}) {
  const { username } = await params;

  return <WholesaleCustomerPortal username={username} />;
}
