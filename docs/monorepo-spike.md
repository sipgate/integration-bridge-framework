## Dedicated Bridges Monorepo

Instead of absorbing bridge code into the platypus NestJS monorepo, this approach consolidates all ~57 bridge repos + the `@sipgate/integration-bridge` framework into a **single new monorepo** while keeping each bridge as its own deployable service.

### What changes

- All ~57 bridge repos + framework → one monorepo (e.g. `integration-bridges`)
- The framework becomes a local workspace package instead of an npm dependency
- Shared dependency management via workspaces (npm/pnpm/yarn workspaces, or Nx/Turborepo)
- One Renovate config, one CI pipeline definition (with per-bridge build targets)

### What stays the same

- **project-platypus doesn't change at all** — no `BridgeService` changes, no profile YAML changes, no deployment changes
- Each bridge remains its own HTTP service with its own `bridgeUrl`, Dockerfile, and k8s deployment
- The bridge REST contract is identical

### Directory Structure

```
integration-bridges/                  # NEW monorepo
├── package.json                      # Workspace root
├── packages/
│   └── integration-bridge-framework/ # @sipgate/integration-bridge as local package
│       ├── package.json
│       └── src/
├── bridges/
│   ├── hubspot/
│   │   ├── package.json              # depends on framework via workspace:*
│   │   ├── Dockerfile
│   │   └── src/
│   ├── google/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/
│   ├── salesforce/
│   │   └── ...
│   └── ... (57 bridges)
├── .github/
│   └── workflows/                    # Shared CI/CD, per-bridge build targets
├── renovate.json                     # Single Renovate config
└── turbo.json / nx.json              # Build orchestration (optional)
```

### Gradual Migration

1. Create the new monorepo with the framework as a workspace package
2. Move bridges one at a time from their individual repos into `bridges/<name>/`
3. Update each bridge's `package.json` to reference the framework via `workspace:*` instead of a versioned npm dependency
4. Set up CI/CD to build only affected bridges on changes (path-based triggers or Turborepo/Nx affected detection)
5. No changes needed in project-platypus at any point

### Comparison with Approach C

| Aspect | Approach C (into platypus) | Approach D (bridges monorepo) |
|--------|--------------------------|-------------------------------|
| **Shared dependency tree** | Single `package.json` | Workspace-level deduplication |
| **Single pipeline** | One build, one image | One repo, but ~57 Docker images |
| **Deployment topology** | 1 service replaces 57 | Still 57 services |
| **Renovate/security updates** | One PR, one deploy | One PR, but 57 builds to verify |
| **Framework changes** | Local code, instant | Local workspace, instant |
| **Platypus changes needed** | Profile YAML `bridgeUrl` updates | None |
| **Migration risk** | Medium — new routing layer | Low — just reorganizing repos |
| **Operational overhead** | Reduced (1 pod set) | Same (57 pod sets) |
| **k8s resource cost** | Lower | Same |
| **Fault isolation** | Shared process — one bad adapter can affect all | Perfect — each bridge isolated |
| **Blast radius of framework change** | All at once (single deploy) | Can be staged across 57 deploys |

### Shared Infrastructure Templates

A major advantage of the bridges monorepo is the ability to **deduplicate infrastructure config** that is currently copy-pasted across 57 repos:

**Dockerfile** — All bridges likely use a near-identical Dockerfile. In the monorepo, this becomes a single parameterized template:

```dockerfile
# Shared Dockerfile at the repo root
ARG BRIDGE_NAME
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/integration-bridge-framework ./packages/integration-bridge-framework
COPY bridges/${BRIDGE_NAME} ./bridges/${BRIDGE_NAME}
RUN pnpm install --frozen-lockfile && pnpm --filter ${BRIDGE_NAME} build

FROM node:20-alpine
COPY --from=builder /app/bridges/${BRIDGE_NAME}/dist ./dist
ENTRYPOINT ["node", "dist/main.js"]
```

**k8s manifests** — Deployment, Service, Ingress, NetworkPolicy, and HPA are ~95% identical across bridges. These become a shared **Helm chart** or **kustomize base** with per-bridge overlays:

```
infrastructure/
├── helm-chart/                       # Shared chart for all bridges
│   ├── Chart.yaml
│   ├── values.yaml                   # Defaults (resource limits, health checks, labels)
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── networkpolicy.yaml
│       └── hpa.yaml
├── overlays/
│   ├── hubspot/
│   │   └── values.yaml               # Only bridge name, image tag, OAuth env vars
│   ├── google/
│   │   └── values.yaml
│   └── ...
```

**CI/CD workflows** — One reusable GitHub Actions workflow with the bridge name as a parameter, replacing 57 nearly identical workflow files:

```yaml
# .github/workflows/build-bridge.yml (reusable)
on:
  workflow_call:
    inputs:
      bridge-name:
        required: true
        type: string

# .github/workflows/hubspot.yml
jobs:
  build:
    uses: ./.github/workflows/build-bridge.yml
    with:
      bridge-name: hubspot
```

Combined with path-based triggers or Turborepo/Nx affected detection, only changed bridges get built and deployed.

### When Approach D is the better fit

- The primary pain is **dependency maintenance and security updates**, not operational overhead
- The team values **fault isolation** (one buggy bridge can't crash others)
- There's concern about **resource sizing** a single process for all 57 integrations
- A **lower-risk migration** is preferred (no new routing layer, no platypus changes)
- Individual bridges need to be **scaled independently** based on their traffic
- There is significant **infrastructure boilerplate duplication** across bridge repos (Dockerfiles, k8s manifests, CI/CD workflows) that can be templated
