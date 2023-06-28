import { PubSub } from "@google-cloud/pubsub";
import { errorLogger, infoLogger } from "../util";
import { PubSubContactsMessage } from "./pubsub-contacts-message.model";

export class PubSubClient {
  private client: PubSub;
  private topicName: string;

  constructor(topicName: string) {
    this.client = new PubSub();
    this.topicName = topicName;
  }

  async publishMessage(message: PubSubContactsMessage) {
    try {
      if (!this.topicName) {
        throw new Error("No pubsub topic name provided.");
      }

      const json = JSON.stringify(message);
      const dataBuffer = Buffer.from(json);
      const topic = this.client.topic(this.topicName);
      await topic.publishMessage({ data: dataBuffer });

      infoLogger(
        PubSubClient.name,
        `Published ${message.contacts.length} contacts for user ${message.userId} to topic ${this.topicName}`
      );
    } catch (error) {
      console.error(error);
      const message = (error as Error).message;
      errorLogger(PubSubClient.name, `Could not publish to pubsub: ${message}`);
    }
  }
}