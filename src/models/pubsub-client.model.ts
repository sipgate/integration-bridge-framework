import { PubSub } from "@google-cloud/pubsub";
import { PubSubContactsMessage } from "./pubsub-contacts-message.model";
import { ServerError } from "./server-error.model";

const PUBLISH_TIMEOUT = 10_000;
export class PubSubClient {
  private client: PubSub;
  private topicName: string;

  constructor(topicName: string) {
    this.client = new PubSub();
    this.topicName = topicName;
  }

  async publishMessage(message: PubSubContactsMessage) {
    if (!this.topicName) {
      throw new Error("No pubsub topic name provided.");
    }

    const timeout = (ms: number) =>
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new ServerError(
                500,
                "Could not publish message in time, did you forget to run gcloud auth application-default login?"
              )
            ),
          ms
        )
      );

    const json = JSON.stringify(message);
    const dataBuffer = Buffer.from(json);
    const topic = this.client.topic(this.topicName);

    await Promise.race([
      topic.publishMessage({ data: dataBuffer }),
      timeout(PUBLISH_TIMEOUT),
    ]);
  }
}
