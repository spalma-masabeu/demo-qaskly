"use client";

import { QRCodeSVG } from "qrcode.react";

interface JoinQrCodeProps {
  joinUrl: string;
  code: string;
  variant?: "default" | "stage";
  size?: number;
  className?: string;
}

const VARIANT_CLASSES = {
  default: {
    container:
      "border-gray-200 bg-white px-8 py-7 text-gray-500 shadow-sm md:w-auto md:min-w-[28rem]",
    qrFrame: "border-gray-100 bg-white shadow-sm",
    label: "text-gray-500",
    caption: "text-gray-500",
  },
  stage: {
    container:
      "border-white/15 bg-white/95 px-5 py-5 text-slate-500 shadow-2xl shadow-slate-950/20",
    qrFrame: "border-slate-200 bg-white shadow-sm",
    label: "text-slate-500",
    caption: "text-slate-600",
  },
} as const;

export function JoinQrCode({
  joinUrl,
  code,
  variant = "default",
  size = 360,
  className = "",
}: JoinQrCodeProps) {
  const classes = VARIANT_CLASSES[variant];

  return (
    <div
      className={[
        "flex w-full flex-col items-center gap-4 rounded-lg border",
        classes.container,
        className,
      ].join(" ")}
    >
      <p className={`text-sm font-bold uppercase tracking-wide ${classes.label}`}>
        QR
      </p>
      <div className={`rounded-lg border p-3 ${classes.qrFrame}`}>
        <QRCodeSVG
          value={joinUrl}
          size={size}
          level="M"
          marginSize={4}
          title={`Unirse a la sala ${code}`}
          className="h-auto max-w-full"
        />
      </div>
      <p className={`text-center text-sm font-medium ${classes.caption}`}>
        Escanea para entrar
      </p>
    </div>
  );
}
