import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Unirse a sesión",
  description: "Ingresa a una sala de Qaskly y responde desde tu dispositivo.",
};

interface JoinLayoutProps {
  children: ReactNode;
}

export default function JoinLayout({ children }: JoinLayoutProps) {
  return children;
}
