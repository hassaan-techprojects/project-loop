import { ReactNode } from "react";

import AppShell from "@/components/app-shell";

type FeedbackLayoutProps = {
  children: ReactNode;
};

export default function FeedbackLayout({
  children,
}: FeedbackLayoutProps) {
  return <AppShell>{children}</AppShell>;
}