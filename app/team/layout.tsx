import { ReactNode } from "react";

import AppShell from "@/components/app-shell";

type TeamLayoutProps = {
  children: ReactNode;
};

export default function TeamLayout({
  children,
}: TeamLayoutProps) {
  return <AppShell>{children}</AppShell>;
}