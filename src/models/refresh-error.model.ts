export class RefreshError extends Error {
  public status: number;

  constructor() {
    super(`Invalid integration refresh token`);
    this.status = 400;
  }
}
