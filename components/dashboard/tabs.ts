export const dashboardTabs = [
  "Dashboard",
  "Portfolio",
  "Buy",
  "Sell",
  "Market Watch",
  "Transaction History",
  "Charts",
] as const;

export type DashboardTab = (typeof dashboardTabs)[number];
