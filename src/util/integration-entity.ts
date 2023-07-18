import { IntegrationEntity, LoggedIntegrationEntity } from '../models';

export const isLoggedIntegrationEntity = (
  e: IntegrationEntity | LoggedIntegrationEntity,
): e is LoggedIntegrationEntity => {
  return 'logId' in e && typeof e.logId === 'string' && e.logId !== '';
};
export const isIntegrationEntity = (
  e: IntegrationEntity | LoggedIntegrationEntity,
): e is IntegrationEntity => !isLoggedIntegrationEntity(e);
