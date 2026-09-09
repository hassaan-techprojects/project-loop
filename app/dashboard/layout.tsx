import { ReactNode } from "react";

import AppShell from "@/components/app-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return <AppShell>{children}</AppShell>;
}