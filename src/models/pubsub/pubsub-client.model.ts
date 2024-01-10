import { PubSub } from '@google-cloud/pubsub';
import { context, propagation } from '@opentelemetry/api';
import { timeout } from '../../util/timeout';

const PUBLISH_TIMEOUT = 10_000;

export class PubSubClient<T> {
  private client: PubSub;
  private topicName: string;

  constructor(topicName: string) {
    this.client = new PubSub({
      apiEndpoint: 'europe-west3-pubsub.googleapis.com:443',
    });
    this.topicName = topicName;
  }

  async publishMessage(message: T, orderingKey?: string) {
    if (!this.topicName) {
      throw new Error('No pubsub topic name provided.');
    }

    propagation.inject(context.active(), message);

    const json = JSON.stringify(message);
    const dataBuffer = Buffer.from(json);
    const topic = this.client.topic(this.topicName, {
      messageOrdering: orderingKey !== undefined,
    });

    await Promise.race([
      topic.publishMessage({ data: dataBuffer, orderingKey }),
      timeout(
        PUBLISH_TIMEOUT,
        'Could not publish message in time. Did you forget to authenticate with GCP? (gcloud auth application-default login)',
      ),
    ]);
  }
}
