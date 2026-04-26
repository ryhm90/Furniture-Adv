import PublicSalesRequestPortal from "./PublicSalesRequestPortal";

export const metadata = {
  title: "إرسال طلب مبيعات",
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

export default async function PublicSalesRequestPage({
  params,
}) {
  const { dbName } = await params;

  return <PublicSalesRequestPortal dbName={dbName} />;
}
