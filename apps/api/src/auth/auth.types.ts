export interface PresenterIdentity {
  authProvider: "AUTH0";
  authSubject: string;
  email: string;
  name?: string;
}

export interface CurrentPresenter {
  id: string;
  authProvider: "AUTH0";
  authSubject: string;
  email: string;
  name: string | null;
  profession: string | null;
  birthday: Date | null;
  usagePurpose: string | null;
  role: "PRESENTER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
}

export interface PresenterRequest {
  headers: Record<string, string | string[] | undefined>;
  presenter?: CurrentPresenter;
}
