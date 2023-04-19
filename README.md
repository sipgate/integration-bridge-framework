# sipgate Integration Bridge Framework

This is the sipgate Integration Bridge framework to integrate sipgate apps with external services. It provides a unified
way to connect apps to any provider of external data management, like contacts or calendar events.

## Developing locally

To test your changes to the integration-bridge framework locally, follow these steps:

* Run `npm run dev` in sipgate-integration-bridge repo
* Run `npm link @sipgate/integration-bridge` in *-integration-bridge-repo
* Add the following to your `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@sipgate/integration-bridge": ["node_modules/@sipgate/integration-bridge/src"]
      }
    }
  }
  ```

## Publishing a version
To publish a new framework version, simply create a new tag and push it:
```

npm version <minor|patch>
git push --follow-tags

```
This will automatically publish the package in the npm registry via the CI pipeline. 


## Bootstrapping a new bridge

If you want to bootstrap a new sipgate Integration Bridge you can use this repository: [integration-bridge-boilerplate](https://github.com/sipgate/integration-bridge-boilerplate)

## Installation

```shell
npm install @sipgate/integration-bridge
# or
yarn add @sipgate/integration-bridge
```

## Quick Start

The minimum adapter implements the `getContacts` method:

```js
const bridge = require("@sipgate/integration-bridge");
const fetch = require("node-fetch");

const {ServerError} = bridge;

const adapter = {
    getContacts: async ({apiKey, apiUrl}) => {
        // Fetch contacts using apiUrl and apiKey
        const response = await fetch(`${apiUrl}/api/contacts`, {
            headers: {Authorization: `Bearer ${apiKey}`},
        });

        if (response.status === 401) {
            throw new ServerError(401, "Unauthorized");
        }

        if (!response.ok) {
            throw new ServerError(500, "Could not fetch contacts");
        }

        // TODO: Convert contacts to the structure below
        const contacts = await response.json();
        return contacts;
    },
};

bridge.start(adapter);
```

Contacts are accepted in this format:

```js
{
    id: "abc123",
        // Provide either the full name or first and last name, not both
        name
:
    null, // or null
        firstName
:
    "Walter", // or null
        lastName
:
    "Geoffrey", // or null
        organization
:
    "Rocket Science Inc.", // or null
        contactUrl
:
    "http://myapp.com/contacts/abc123", // or null
        avatarUrl
:
    "http://myapp.com/avatar/abc123.png", // or null
        email
:
    "walter@example.com", // or null
        phoneNumbers
:
    [
        {
            label: "MOBILE", // or "WORK" or "HOME"
            phoneNumber: "+4915799912345"
        }
    ]
}
```

## Configuration

The sipgate Integration Bridge supports configuration through the following environment variables:

- `OAUTH2_REDIRECT_URL`: URL to redirect the user at the end of the OAuth2 flow
- `OAUTH2_IDENTIFIER`: Name of the Integration to identify credentials in uppercase e. g. "MY_CRM"
- `REDIS_URL`: URL of a Redis instance to cache responses, otherwise memory cache will be used
- `CACHE_DISABLED`: Disable caching
- `CACHE_REFRESH_INTERVAL`: Time a contact in cache is not refreshed (in seconds), only used if redis or memory cache is
  active
