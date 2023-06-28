import { PubSub } from "@google-cloud/pubsub";
import { PubSubContactsMessage } from "./pubsub-contacts-message.model";

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

    const json = JSON.stringify(message);
    const dataBuffer = Buffer.from(json);
    const topic = this.client.topic(this.topicName);
    await topic.publishMessage({ data: dataBuffer });
  }
}
