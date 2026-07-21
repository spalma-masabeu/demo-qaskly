import { randomInt } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const codeLength = 6;

@Injectable()
export class SessionCodeService {
  constructor(private readonly prisma: PrismaService) {}

  async createUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = this.generateCode();
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "LiveSession"
        WHERE "code" = ${code}
        LIMIT 1
      `;
      if (rows[0] === undefined) {
        return code;
      }
    }

    throw new Error("Could not generate a unique session code");
  }

  joinUrlForCode(code: string): string {
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    return `${frontendUrl.replace(/\/$/, "")}/join/${code}`;
  }

  private generateCode(): string {
    let code = "";
    for (let index = 0; index < codeLength; index += 1) {
      code += codeAlphabet[randomInt(codeAlphabet.length)];
    }
    return code;
  }
}
