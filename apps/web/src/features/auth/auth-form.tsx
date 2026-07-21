"use client";

import { type FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AuthMode, buildLoginUrl, isValidEmail } from "./auth-actions";

interface AuthFormProps {
  initialMode?: AuthMode;
}

const COPY: Record<
  AuthMode,
  { title: string; cta: string; toggleHint: string; toggleCta: string }
> = {
  signin: {
    title: "Inicia sesión",
    cta: "Continuar con el correo",
    toggleHint: "¿No tienes cuenta?",
    toggleCta: "Crear cuenta",
  },
  signup: {
    title: "Crea tu cuenta",
    cta: "Crear cuenta con el correo",
    toggleHint: "¿Ya tienes cuenta?",
    toggleCta: "Iniciar sesión",
  },
};

export function AuthForm({ initialMode = "signin" }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const copy = COPY[mode];

  function toggleMode() {
    setMode((current) => (current === "signin" ? "signup" : "signin"));
    setError(undefined);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    // Hand off to the Auth0 hosted email OTP flow.
    window.location.assign(buildLoginUrl(email, mode));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {copy.title}
        </h1>
        <p className="text-sm text-gray-500">
          Te enviaremos un código de un solo uso a tu correo. Qaskly no usa
          contraseñas.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" required>
          Correo electrónico
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error}
          disabled={submitting}
        />
      </div>

      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {!submitting && <Mail className="h-4 w-4" aria-hidden="true" />}
        {copy.cta}
      </Button>

      <p className="text-center text-sm text-gray-500">
        {copy.toggleHint}{" "}
        <button
          type="button"
          onClick={toggleMode}
          className="cursor-pointer font-semibold text-primary hover:text-primary-hover"
        >
          {copy.toggleCta}
        </button>
      </p>
    </form>
  );
}
