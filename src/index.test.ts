import { Server } from "http";
import { start } from ".";
import { Adapter } from "./models";

const testAdapter: Adapter = {};

const { PORT_TEST: testPort = "8080" } = process.env;

describe("Framework", () => {
  it("should start the server", async () => {
    console.log(`Testing server on port ${testPort}`);
    const server: Server = start(testAdapter);
    expect(server).toBeDefined();
    server.close();
  });
});
