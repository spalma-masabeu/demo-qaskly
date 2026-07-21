import assert from "node:assert/strict";
import type request from "supertest";

export interface ExpectedErrorContract {
  code: string;
  message?: string;
}

export function assertErrorContract(
  response: request.Response,
  expected: ExpectedErrorContract
): void {
  assert.equal(response.body.code, expected.code);
  assert.equal(typeof response.body.message, "string");
  if (expected.message !== undefined) {
    assert.equal(response.body.message, expected.message);
  }
  if ("details" in response.body) {
    assert.notEqual(response.body.details, undefined);
  }
}
