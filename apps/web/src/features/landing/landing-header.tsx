"use client";

import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ROUTES } from "@/lib/routes";

// Session codes are 6 chars from this alphabet (no ambiguous I/O/0/1).
const CODE_ALPHABET = /[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;
const CODE_LENGTH = 6;

function sanitizeCode(raw: string): string {
  return (raw.toUpperCase().match(CODE_ALPHABET) ?? [])
    .join("")
    .slice(0, CODE_LENGTH);
}

export function LandingHeader() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ready = code.length === CODE_LENGTH;

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    router.push(ROUTES.JOIN(code));
  };

  return (
    <header
      className={`sticky top-0 z-toast w-full transition-colors duration-300 ${
        scrolled
          ? "border-b border-primary/10 bg-white/80 shadow-brand-sm backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        {/* Brand */}
        <Link
          href={ROUTES.HOME}
          className="flex shrink-0 items-center gap-2 font-heading text-lg font-extrabold tracking-tight text-gray-900"
          aria-label="Qaskly — inicio"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-brand-sm">
            <Zap className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Qaskly</span>
        </Link>

        {/* Center: join a live session by code */}
        <form
          onSubmit={handleJoin}
          className="mx-auto flex w-full max-w-md flex-1 items-center"
          aria-label="Unirse a una sesión por código"
        >
          <div
            className={`flex w-full items-center gap-2 rounded-full border bg-white/70 py-1 pl-4 pr-1 backdrop-blur transition-colors duration-200 focus-within:border-primary focus-within:bg-white ${
              scrolled ? "border-gray-200" : "border-white/60 shadow-brand-sm"
            }`}
          >
            <label htmlFor="join-code" className="sr-only">
              Código de sala
            </label>
            <span
              aria-hidden="true"
              className="hidden text-xs font-semibold uppercase tracking-widest text-primary sm:inline"
            >
              Unirse
            </span>
            <input
              id="join-code"
              value={code}
              onChange={(event) => setCode(sanitizeCode(event.target.value))}
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Código de sala"
              maxLength={CODE_LENGTH}
              className="min-w-0 flex-1 bg-transparent font-heading text-sm font-bold uppercase tracking-[0.25em] text-gray-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:shadow-none focus-visible:shadow-none"
            />
            <button
              type="submit"
              disabled={!ready}
              aria-label="Entrar a la sesión"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white transition-all duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>

        {/* Right: auth actions */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link
            href={ROUTES.LOGIN}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition-colors duration-200 hover:text-primary"
          >
            Iniciar sesión
          </Link>
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
          >
            Comenzar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
