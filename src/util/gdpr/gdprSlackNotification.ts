import { Request, Response, Router } from 'express';
import * as util from 'util';
import { IncomingWebhook } from '@slack/webhook';
import { CustomRouter, ServerError } from '../../models';

export function slackNotificationRoute(
  slackWebhookUrl: string,
  path: string,
): Router {
  const route = Router();
  route.post(path, async (req: Request, res: Response) => {
    try {
      const payloadStringified = JSON.stringify(req.body, null, 4);
      const host = req.headers.host;
      const message = `GDPR request: host ${host}, path ${path}\nRequest Payload:\n ${payloadStringified}`;
      console.log(message);
      const webhook = new IncomingWebhook(slackWebhookUrl);
      await webhook.send({ text: message });
      res.send();
    } catch (error: any) {
      const errorMessage = `Error in ${path}: ${util.inspect(error)}`;
      console.error(errorMessage);
      throw new ServerError(500, errorMessage);
    }
  });
  return route;
}

export function getGDPRSlackNotificationRouter(
  slackWebhookUrl: string,
): CustomRouter[] {
  const gdprRouter: CustomRouter[] = [
    {
      path: '/gdpr/',
      router: slackNotificationRoute(
        slackWebhookUrl,
        '/customers/data_request/',
      ),
    },
    {
      path: '/gdpr/',
      router: slackNotificationRoute(slackWebhookUrl, '/customers/redact/'),
    },
    {
      path: '/gdpr/',
      router: slackNotificationRoute(slackWebhookUrl, '/shop/redact/'),
    },
  ];
  return gdprRouter;
}
