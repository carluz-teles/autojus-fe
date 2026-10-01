import { ApiError } from "@/lib/api/errors";

export function isUncertainCommandFailure(error: unknown) {
  return (
    error !== null &&
    error !== undefined &&
    (!(error instanceof ApiError) ||
      error.kind === "NETWORK" ||
      error.status >= 500)
  );
}
