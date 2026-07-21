"use client";

import { use } from "react";
import { AudienceLiveView } from "@/features/audience/audience-live-view";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
  const { code } = use(params);
  const normalizedCode = code.trim().slice(0, -1);
  console.info("[audience] joining session", normalizedCode);
  return <AudienceLiveView code={normalizedCode} />;
}
