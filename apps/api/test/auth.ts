import type { INestApplication } from "@nestjs/common";
import request from "supertest";

export interface TestPresenter {
  authSubject: string;
  email: string;
  name?: string;
}

export const defaultPresenter: TestPresenter = {
  authSubject: "auth0|presenter-1",
  email: "presenter@example.com",
  name: "Presenter One"
};

export const otherPresenter: TestPresenter = {
  authSubject: "auth0|presenter-2",
  email: "other@example.com",
  name: "Other Presenter"
};

export function presenterAuthHeader(
  presenter: TestPresenter = defaultPresenter
): string {
  return Buffer.from(JSON.stringify(presenter), "utf8").toString("base64url");
}

export function withPresenter(
  testRequest: request.Test,
  presenter: TestPresenter = defaultPresenter
): request.Test {
  return testRequest.set(
    "x-test-presenter",
    presenterAuthHeader(presenter)
  );
}

export function apiRequest(app: INestApplication) {
  return request(app.getHttpServer());
}
