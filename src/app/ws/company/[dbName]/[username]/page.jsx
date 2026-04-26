import WholesaleCustomerPortal from "../../../components/WholesaleCustomerPortal";

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

export default async function WholesaleCustomerDbPage({
  params,
}) {
  const { dbName, username } = await params;

  return <WholesaleCustomerPortal dbName={dbName} username={username} />;
}
