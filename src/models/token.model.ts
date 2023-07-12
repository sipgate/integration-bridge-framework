export type Token = {
  refresh_token: string;
  access_token: string;
};

export type TokenWithStatus = Token & { isPending: boolean };
