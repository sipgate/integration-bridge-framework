export class RefreshError extends Error {
  public status: number;

  constructor(message?: string) {
    super(`Token Refresh Error${message ? `: ${message}` : ""}`);
    this.status = 407;
  }
}
