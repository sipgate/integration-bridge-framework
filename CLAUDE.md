# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@sipgate/integration-bridge` — a shared Express-based framework that bridges sipgate to external CRMs and contact management systems. Individual bridges (e.g., `sipgate-integration-bridge`, `hubspot-integration-bridge`) depend on this package and implement the `Adapter` interface.

Published to npm as `@sipgate/integration-bridge`. Version bumps auto-publish. There is no staging or development environment — changes merged to main go live immediately.

## Commands

```bash
npm test                              # Run all Jest tests
npm test -- src/util/error.test.ts    # Run single test file
npm test -- --testNamePattern="name"  # Run tests matching pattern
npm run build                         # Test + clean + compile (for publishing)
npm run compile                       # TypeScript compilation only
npm run lint                          # ESLint
npm run format                        # Prettier
npm run dev                           # Build + npm link + watch (for local bridge development)
```

## Architecture

### Entry Point

`start(adapter, customRouters?, customRoutes?)` in `src/index.ts` — creates an Express server, registers middleware and routes, and wires the adapter into all controller endpoints.

### Adapter Interface (`src/models/adapter.model.ts`)

Bridges implement this interface. All methods are optional. Key groups:
- **Contacts:** `getContacts`, `createContact`, `updateContact`, `deleteContact`, `streamContacts` (async generator for PubSub streaming)
- **Auth:** `getToken` (refresh OAuth token), `isValidToken`, `handleOAuth2Callback`
- **Entities:** `getEntity`, `getEntitiesForContact` (deals, companies, tickets, etc.)
- **Call Logging:** `createOrUpdateCallLogForEntities`, `createCallLogForPhoneNumber`
- **Tasks:** `getTask`, `createFollowUp`

### Request Flow

1. `extractHeaderMiddleware` extracts `Config` from headers (`x-user-id`, `x-provider-key`, `x-provider-url`, `x-provider-locale`)
2. Controller calls the adapter method
3. Errors go through `throwAndDelegateError()` or are caught in controllers
4. `errorHandlerMiddleware` sends the response

### Error Handling (`src/util/error.ts`)

- `throwAndDelegateError()` maps HTTP status codes to `IntegrationErrorType` enum values
- Status `452` (`DELEGATE_TO_FRONTEND_CODE`) signals semantic errors to the frontend
- `IntegrationErrorType` enum in `src/models/integration-error.model.ts` defines error codes like `integration/refresh-error`, `integration/error/unavailable`, etc.
- Controllers suppress logging for `INTEGRATION_REFRESH_ERROR` (handled upstream by platypus)

### Contact Streaming

Uses Google Cloud PubSub. The adapter's `streamContacts()` returns an `AsyncGenerator<Contact[]>`. The controller publishes batches with ordering keys (`${userId}:${timestamp}`) and state messages (IN_PROGRESS, COMPLETE, FAILED).

### Token Management (`src/util/token-util.ts`)

`getFreshAccessToken()` caches tokens (Redis or in-memory LRU) with a default TTL of 59 minutes. Token updates are propagated via PubSub topic `PUBSUB_TOPIC_NAME_UPDATE_PROVIDER_KEY`.

### Caching (`src/cache/`)

Contact cache with Redis or memory storage. Background refresh (non-blocking) with configurable interval via `CACHE_REFRESH_INTERVAL` env var. Falls back to in-memory `LRUCache` if `REDIS_URL` is not set.

### Validation (`src/schemas/`)

Zod schemas validate contacts (required: `id`, `phoneNumbers`) and other inputs. Contact scopes: `PRIVATE`, `SHARED`, `INTERNAL`.

## Key Types

- **`Config`** — `{ userId, apiKey, apiUrl, locale }` extracted from request headers
- **`Contact`** — contact with phone numbers, email, organization, related entities
- **`ServerError`** — extends `Error` with `status` field
- **`IntegrationEntity`** — `{ id, type, source }` for CRM objects (deals, companies, etc.)
- **`CallEvent`** / **`CallEventWithIntegrationEntities`** — call log data

## Local Development with Bridges

```bash
# In this repo:
npm run dev          # builds, links, and watches

# In a bridge repo:
npm link @sipgate/integration-bridge
# Update tsconfig.json paths to point to: node_modules/@sipgate/integration-bridge/src
```
