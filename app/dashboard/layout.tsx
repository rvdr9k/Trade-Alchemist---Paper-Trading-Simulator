
import { PortfolioStrip } from "@/components/layout/portfolio-strip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PortfolioStrip />
    </>
  );
}
