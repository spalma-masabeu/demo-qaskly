import { domainErrors } from "./domain-errors.js";

export interface OwnedResource {
  ownerId: string;
}

export function isResourceOwner(
  presenterId: string,
  resource: OwnedResource | null | undefined
): resource is OwnedResource {
  return resource?.ownerId === presenterId;
}

export function assertResourceOwner(
  presenterId: string,
  resource: OwnedResource | null | undefined
): void {
  const ownerId = resource?.ownerId;
  if (ownerId !== presenterId) {
    throw domainErrors.forbiddenOwnerAction({
      presenterId,
      ownerId
    });
  }
}
