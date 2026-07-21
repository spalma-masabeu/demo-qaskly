import {
  createPublicKey,
  randomUUID,
  verify,
  type JsonWebKey
} from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CurrentPresenter,
  PresenterIdentity,
  PresenterRequest
} from "./auth.types.js";

@Injectable()
export class AuthService {
  private jwksCache: JsonWebKeySet | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async resolvePresenter(
    request: PresenterRequest
  ): Promise<CurrentPresenter | null> {
    const identity =
      this.extractTestPresenterIdentity(request) ??
      (await this.extractAuth0PresenterIdentity(request));
    if (identity === null) {
      return null;
    }

    return this.syncPresenter(identity);
  }

  private async extractAuth0PresenterIdentity(
    request: PresenterRequest
  ): Promise<PresenterIdentity | null> {
    const token = this.extractBearerToken(request);
    if (token === null) {
      return null;
    }

    const parsed = parseJwt(token);
    if (parsed === null || parsed.header.alg !== "RS256") {
      return null;
    }

    const jwks = await this.loadJwks();
    const jwk = jwks.keys.find((key) => key.kid === parsed.header.kid);
    if (jwk === undefined) {
      return null;
    }

    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    const signatureIsValid = verify(
      "RSA-SHA256",
      Buffer.from(parsed.signingInput),
      publicKey,
      Buffer.from(parsed.signature, "base64url")
    );
    if (!signatureIsValid) {
      return null;
    }

    const issuer = `https://${process.env.AUTH0_DOMAIN ?? ""}/`;
    const audience = process.env.AUTH0_AUDIENCE;
    const now = Math.floor(Date.now() / 1000);
    if (
      parsed.payload.iss !== issuer ||
      !payloadAudienceMatches(parsed.payload.aud, audience) ||
      typeof parsed.payload.sub !== "string" ||
      typeof parsed.payload.email !== "string" ||
      (typeof parsed.payload.exp === "number" && parsed.payload.exp <= now) ||
      (typeof parsed.payload.nbf === "number" && parsed.payload.nbf > now)
    ) {
      return null;
    }

    return {
      authProvider: "AUTH0",
      authSubject: parsed.payload.sub,
      email: parsed.payload.email,
      ...(typeof parsed.payload.name === "string"
        ? { name: parsed.payload.name }
        : {})
    };
  }

  private extractBearerToken(request: PresenterRequest): string | null {
    const header = request.headers.authorization;
    if (typeof header !== "string") {
      return null;
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || token === undefined || token.length === 0) {
      return null;
    }

    return token;
  }

  private async loadJwks(): Promise<JsonWebKeySet> {
    if (this.jwksCache !== null) {
      return this.jwksCache;
    }

    const jwksJson = process.env.AUTH0_JWKS_JSON;
    if (jwksJson !== undefined) {
      this.jwksCache = JSON.parse(jwksJson) as JsonWebKeySet;
      return this.jwksCache;
    }

    const domain = process.env.AUTH0_DOMAIN;
    if (domain === undefined || domain.length === 0) {
      return { keys: [] };
    }

    const response = await fetch(`https://${domain}/.well-known/jwks.json`);
    if (!response.ok) {
      return { keys: [] };
    }

    this.jwksCache = (await response.json()) as JsonWebKeySet;
    return this.jwksCache;
  }

  private extractTestPresenterIdentity(
    request: PresenterRequest
  ): PresenterIdentity | null {
    if (process.env.AUTH_TEST_BYPASS !== "true") {
      return null;
    }

    const header = request.headers["x-test-presenter"];
    if (typeof header !== "string") {
      return null;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(header, "base64url").toString("utf8")
      ) as Partial<PresenterIdentity>;

      if (
        typeof decoded.authSubject !== "string" ||
        typeof decoded.email !== "string"
      ) {
        return null;
      }

      return {
        authProvider: "AUTH0",
        authSubject: decoded.authSubject,
        email: decoded.email,
        ...(typeof decoded.name === "string" ? { name: decoded.name } : {})
      };
    } catch {
      return null;
    }
  }

  private async syncPresenter(
    identity: PresenterIdentity
  ): Promise<CurrentPresenter> {
    const rows = await this.prisma.$queryRaw<CurrentPresenter[]>`
      INSERT INTO "User" (
        "id",
        "authProvider",
        "authSubject",
        "email",
        "name",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${identity.authProvider}::"AuthProvider",
        ${identity.authSubject},
        ${identity.email},
        ${identity.name ?? null},
        NOW()
      )
      ON CONFLICT ("authProvider", "authSubject")
      DO UPDATE SET
        "email" = EXCLUDED."email",
        "name" = COALESCE("User"."name", EXCLUDED."name"),
        "updatedAt" = NOW()
      RETURNING
        "id",
        "authProvider",
        "authSubject",
        "email",
        "name",
        "profession",
        "birthday",
        "usagePurpose",
        "role",
        "createdAt",
        "updatedAt"
    `;

    return rows[0];
  }
}

interface JsonWebKeySet {
  keys: Auth0JsonWebKey[];
}

interface Auth0JsonWebKey extends JsonWebKey {
  kid?: string;
}

interface JwtHeader {
  alg: string;
  kid?: string;
}

interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  nbf?: number;
}

interface ParsedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  signingInput: string;
  signature: string;
}

function parseJwt(token: string): ParsedJwt | null {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (
    encodedHeader === undefined ||
    encodedPayload === undefined ||
    signature === undefined
  ) {
    return null;
  }

  try {
    return {
      header: JSON.parse(
        Buffer.from(encodedHeader, "base64url").toString("utf8")
      ) as JwtHeader,
      payload: JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8")
      ) as JwtPayload,
      signingInput: `${encodedHeader}.${encodedPayload}`,
      signature
    };
  } catch {
    return null;
  }
}

function payloadAudienceMatches(
  payloadAudience: string | string[] | undefined,
  expectedAudience: string | undefined
): boolean {
  if (expectedAudience === undefined || expectedAudience.length === 0) {
    return false;
  }

  if (Array.isArray(payloadAudience)) {
    return payloadAudience.includes(expectedAudience);
  }

  return payloadAudience === expectedAudience;
}
