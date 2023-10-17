import { PubSub } from '@google-cloud/pubsub';
import { timeout } from '../../util/timeout';

const PUBLISH_TIMEOUT = 10_000;

export class PubSubClient<T> {
  private client: PubSub;
  private topicName: string;

  constructor(topicName: string) {
    this.client = new PubSub();
    this.topicName = topicName;
  }

  async publishMessage(message: T) {
    if (!this.topicName) {
      throw new Error('No pubsub topic name provided.');
    }

    const json = JSON.stringify(message);
    const dataBuffer = Buffer.from(json);
    const topic = this.client.topic(this.topicName);

    await Promise.race([
      topic.publishMessage({ data: dataBuffer }),
      timeout(
        PUBLISH_TIMEOUT,
        'Could not publish message in time. Did you forget to authenticate with GCP? (gcloud auth application-default login)',
      ),
    ]);
  }
}