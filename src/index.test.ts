import { Server } from "http";
import { start } from ".";
import { Adapter } from "./models";

const testAdapter: Adapter = {};

describe("Framework", () => {
  it("should start the server", async () => {
    const server: Server = start(testAdapter);
    expect(server).toBeDefined();
    server.close();
  });
});
