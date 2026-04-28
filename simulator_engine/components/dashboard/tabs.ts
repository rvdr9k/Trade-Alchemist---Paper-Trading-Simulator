export const dashboardTabs = [
  "Dashboard",
  "Portfolio",
  "Buy",
  "Sell",
  "Market Watch",
  "Transaction History",
  "Analysis",
] as const;

export type DashboardTab = (typeof dashboardTabs)[number];
