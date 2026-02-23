# Fix: INTEGRATION_REFRESH_ERROR triggers too broadly

## Context

Integrations are being permanently set to `authenticationRequired = true` by false positives. When project-platypus receives `integration/refresh-error` from a bridge, it disables the integration until the user manually re-authenticates via OAuth.

**Evidence from logs (2026-02-18):** The sipgate OAuth server returned a transient **500 Internal Server Error** with `"unknown_error"` during token refresh. The sipgate bridge's catch-all in `getAndRefreshToken()` classified this as `INTEGRATION_REFRESH_ERROR`. Platypus set `authenticationRequired = true`. The next day, the user's contact streaming was skipped — the integration was permanently broken until manual re-auth.

**Root cause:** Neither the sipgate bridge nor the framework distinguish between "refresh token is genuinely invalid" and "transient error during refresh/API call".

---

## Fix 1: sipgate-integration-bridge — `getAndRefreshToken()` catch block

**File:** `sipgate-integration-bridge/src/index.ts` (lines 101-114)

**Problem:** Catches ALL errors and throws `INTEGRATION_REFRESH_ERROR`, including transient 500s, network timeouts, and `unknown_error` from the OAuth server.

**Fix:** Inspect the `@hapi/boom` error object (used by `simple-oauth2`) to determine the actual cause. Only throw `INTEGRATION_REFRESH_ERROR` for `invalid_grant` — the standard OAuth2 code for "refresh token is expired/revoked/invalid". All other errors get a generic `ServerError(500, ...)` which platypus will NOT interpret as a reason to set `authenticationRequired`.

**Error object structure** (from `simple-oauth2` / `@hapi/wreck` / `@hapi/boom`):
- `err.data.payload.error` — the OAuth2 error code (`"invalid_grant"`, `"unknown_error"`, etc.)
- `err.output.payload.statusCode` — the HTTP status (400, 500, etc.)
- `err.isServer` — `true` for 500+, `false` for 400-499

---

## Fix 2: integration-bridge-framework — `throwAndDelegateError()` 401 mapping (TODO)

**File:** `integration-bridge-framework/src/util/error.ts` (line 49)

**Problem:** Maps ALL HTTP 401 responses from CRM API calls to `INTEGRATION_REFRESH_ERROR`. A 401 from an API endpoint (e.g. `/v2/contacts`) after a fresh token refresh is not a refresh token issue — it's likely a permission/scope problem.

**Fix:** Change 401 to use `INTEGRATION_UNAUTHORIZED_ERROR` (already defined in the enum but never used):

```typescript
case 401:
  errorType = IntegrationErrorType.INTEGRATION_UNAUTHORIZED_ERROR;
  break;
```

**Impact on all bridges:** This change affects every bridge using the framework. Since platypus only triggers `authenticationRequired` for `integration/refresh-error`, changing to `integration/unauthorized-error` means API-level 401s will no longer disable integrations. The error still reaches platypus/frontend as HTTP 452 — just with a different type string.

**Impact on framework controller:** The controller currently skips error logging for `INTEGRATION_REFRESH_ERROR`. With this change, 401 errors from API calls will be logged normally — which is desirable since they represent real issues worth investigating.

---

## Audit: Bridges that rely on the 401 → INTEGRATION_REFRESH_ERROR mapping

Changing the framework's 401 mapping (Fix 2) would break bridges that deliberately manufacture a 401 to signal genuine `invalid_grant` / auth errors. Full audit of all `*-integration-bridge` repos below.

### Affected: manufacture 401 for `invalid_grant` → flow through `throwAndDelegateError`

These bridges would **stop triggering re-auth** for real token failures if we change the mapping.

#### google-integration-bridge

**File:** `google-integration-bridge/src/index.ts` (repeated in every adapter method)

Creates `ServerError(401, INTEGRATION_REFRESH_ERROR)` for `invalid_grant` and `unauthorized_client`, then passes it into `throwAndDelegateError()`:

```typescript
const errorMessage = errAny.response.data.error;
if (
    errorMessage == 'invalid_grant' ||
    errorMessage == 'unauthorized_client'
) {
    error = new ServerError(401, IntegrationErrorType.INTEGRATION_REFRESH_ERROR);
}
throwAndDelegateError(error, 'getContacts', config.apiKey, 'Error in get contacts.');
```

#### pipedrive-integration-bridge

**File:** `pipedrive-integration-bridge/src/utils/error.util.ts`

`handleExpectedPipedriveErrors()` returns `ServerError(401, ...)` for `invalid_grant`, which then flows into `throwAndDelegateError()`:

```typescript
if (
    error.response?.data.error === 'invalid_grant' ||
    error.response?.status === 402
) {
    return new ServerError(401, 'invalid grant');
}
```

#### salesforce-integration-bridge

**File:** `salesforce-integration-bridge/src/util/error.util.ts`

Synthetically sets `code: '401'` on the error for `invalid_grant` before passing into `throwAndDelegateError()`:

```typescript
if (error.name === 'invalid_grant') {
    throwAndDelegateError(
        { ...error, code: '401' },
        source, config.apiKey, logMessage
    );
}
```

#### salesforce-lignotrend-integration-bridge

**File:** `salesforce-lignotrend-integration-bridge/src/util/error.util.ts` — same pattern as salesforce.

#### kommo-integration-bridge

**File:** `kommo-integration-bridge/src/kommo/api.auth.ts`

Throws `ServerError(401, ...)` for `invalid_code` during token refresh:

```typescript
if (data?.error && data?.error === "invalid_code") throw new ServerError(401, "Invalid Code");
```

#### zoho-integration-bridge

**File:** `zoho-integration-bridge/src/zoho/api.auth.ts`

Same pattern — `ServerError(401, ...)` for `invalid_code`:

```typescript
if (data.error === 'invalid_code') {
    throw new ServerError(401, 'Invalid Code');
}
```

#### microsoftdynamics-integration-bridge

**File:** `microsoftdynamics-integration-bridge/src/customer/api.auth.ts`

Same pattern:

```typescript
if (data?.error && data?.error === "invalid_code") throw new ServerError(401, "Invalid Code");
```

### Not affected: bypass `throwAndDelegateError` for refresh errors

These bridges throw `INTEGRATION_REFRESH_ERROR` directly and would **continue working** after the framework change.

| Bridge | Pattern | File |
|--------|---------|------|
| **sipgate** | `DelegateToFrontedError(INTEGRATION_REFRESH_ERROR)` | `src/index.ts` |
| **odoo** | `DelegateToFrontedError(INTEGRATION_REFRESH_ERROR)` | `src/odoo/jsonrpc.ts` |
| **hubspot** | `ServerError(400, INTEGRATION_REFRESH_ERROR)` thrown directly | `src/utils/error.util.ts` |
| **weclapp** | `ServerError(400, INTEGRATION_REFRESH_ERROR)` thrown directly | `src/util/error.util.ts` |
| **outlook** | `ServerError(400, INTEGRATION_REFRESH_ERROR)` returned for `invalid_grant` | `src/util.ts` |

### Edge case: zohodesk-integration-bridge

Throws `ServerError(401, 'Could not get access token')` directly (not through `throwAndDelegateError`) when `getFreshAccessToken()` returns null. This doesn't go through the framework's status-code mapping, but it does produce an HTTP 401 response.

---

### Consequence

7 bridges depend on the framework mapping 401 → `INTEGRATION_REFRESH_ERROR` to trigger re-auth in platypus. Changing the mapping to `INTEGRATION_UNAUTHORIZED_ERROR` without updating these bridges would silently break re-auth for real token failures.

### Rollout options

1. **Fix bridges first, then framework** — Update all 7 affected bridges to throw `DelegateToFrontedError(INTEGRATION_REFRESH_ERROR)` directly for `invalid_grant`/`invalid_code`, bypassing the status-code mapping. Then safely change the framework's 401 mapping. Requires coordinated deploys.
2. **New framework mechanism** — Keep 401 → `INTEGRATION_REFRESH_ERROR` but provide a way for bridges to distinguish API-level 401s from token-level 401s (e.g. a different error class or a flag).
