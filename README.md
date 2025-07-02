# App Starter

This monorepo serves as a starter template for building new applications using a modern, scalable tech stack. It provides a unified structure for managing multiple services and packages, streamlining development, testing, and deployment workflows.

The template is designed for rapid internal development and seamless deployment to AWS, making it easy to bootstrap new projects with best practices and essential integrations out of the box.

---

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Setup](#setup)
  - [1. Install Dependencies](#1-install-dependencies)
  - [2. Run the Initialization Script](#2-run-the-initialization-script)
- [Running Locally](#running-locally)
  - [Start All Apps](#start-all-apps)
- [Deployment](#deployment)
  - [Deploy to AWS](#deploy-to-aws)
  - [Continuous Integration & Delivery](#continuous-integration--delivery)
    - [Current Workflow (Rapid Development)](#current-workflow-rapid-development)
    - [Proposed Workflow (Larger Projects)](#proposed-workflow-larger-projects)
- [Helper Tasks](#helper-tasks)
- [Testing](#testing)
  - [Backend](#backend)
  - [Web](#web)
    - [Basic Tests](#basic-tests)
    - [E2E Tests](#e2e-tests)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---

## Features

This starter template comes pre-configured with a robust set of features to accelerate development and ensure production readiness:

- **Analytics:** Integrated with Posthog for product analytics and user behavior tracking.
- **Error Tracking:** Centralized error monitoring using Posthog.
- **Authentication:** Built-in authentication powered by Better Auth.
- **Database:** Supabase for scalable, hosted Postgres and real-time data.
- **Backend:** Serverless backend managed with SST, deployed to AWS.
- **Web Frontend:** Next.js for fast, modern web applications.
- **Documentation:** [Fumadocs](https://fumadocs.org/) for building a documentation site (optional, see below).
- **Continuous Integration:** Automated testing and deployment via GitHub Actions.
- **Alerts:** Slack integration for real-time notifications and alerts.
- **AI Integration:** Pre-configured with Cursor rules for AI-powered workflows.
- **Logging:** Shared logging package (Pino) with pretty local output, and production integration with Axiom and CloudWatch.

---

## Tech Stack

- **pnpm:** Fast, disk-efficient package manager for managing dependencies and monorepo workspaces.
- **Turborepo:** High-performance build system for orchestrating scripts and tasks across all packages.
- **SST:** Infrastructure as code framework for deploying serverless backends and resources to **AWS**.
- **Supabase:** Hosted Postgres database with real-time capabilities.
- **Prisma:** Type-safe ORM for database access and migrations.
- **Next.js:** React framework for building fast, production-grade web applications.
- **Node.js & TypeScript:** Strongly-typed backend and shared code.
- **GitHub Actions:** CI/CD pipelines for automated testing and deployment.
- **Slack:** Integration for deployment and error alerts.
- **Posthog:** Analytics and error tracking.
- **Axiom:** Log management platform integrated for production observability.

_All packages and apps are written in TypeScript for consistency and type safety._

---

## Repository Structure

```text
/
├── apps/
│   ├── web/           # Next.js frontend app
│   ├── backend/       # Serverless backend (SST)
│   ├── storybook/     # Storybook documentation and testing for components
│   └── docs/          # (Optional) Fumadocs-powered documentation app (deployment disabled by default)
├── packages/
│   ├── config/        # Shared configuration
│   ├── eslint/        # Shared ESLint config
│   ├── tsconfig/      # Shared TypeScript config
│   ├── design/ # Shared design system (React)
│   ├── schemas/       # Shared schemas (forms + validation)
│   ├── logs/          # Shared logging package (uses pino)
│   └── ...            # (More packages can be added)
├── infra/             # Infrastructure code (SST, AWS)
│   ├── api.ts
│   ├── secrets.ts
│   ├── website.ts
│   └── ...
├── scripts/           # Helper scripts for setup and development
├── .github/           # GitHub Actions workflows
├── templates/         # Project/package templates
├── prompts/           # Prompt files for AI or automation
├── sst.config.ts      # SST configuration
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── ...
```

- **apps/**: Deployable applications (frontend, backend, documentation).
- **packages/**: Shared libraries, configs, and utilities (expandable).
- **infra/**: Infrastructure configuration and deployment scripts (SST, AWS).
- **scripts/**: Helper scripts for setup and development.
- **.github/**: CI/CD workflows and automation.
- **templates/**: Templates for scaffolding new projects or packages.
- **prompts/**: Prompt files for AI or automation.

> Each app or package includes its own README with more details.

> **Note:** The `apps/docs` documentation app is present but deployment is disabled by default. To enable deployment, uncomment or add the relevant deployment in `sst.config.ts`.

---

## Setup

Before you start, make sure you have the following prerequisites installed and configured:

- **Node.js** (recommended: latest LTS version)
- **pnpm** (for package and monorepo management) — [Install guide](https://pnpm.io/installation)
- **gh** (GitHub CLI) — [Install guide](https://github.com/cli/cli#installation)
- **aws-cli** (AWS CLI) — [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### 1. Install Dependencies

```sh
pnpm install
```

### 2. Run the Initialization Script

```sh
pnpm run init
```

This script will guide you through the following steps:

- Verifies required CLIs are installed and authenticated (pnpm, gh, aws-cli)
- Prompts for your project name and environment name, updating config files as needed
- Ensures your repository is connected to GitHub
- Initializes AWS credentials and profile for deployment
- Guides you through setting up Supabase projects (production and development)
- Configures Better Auth provider with required user roles and permissions
- Optionally sets up Posthog for analytics and error tracking
- Configures GitHub environments and secrets for CI/CD
- Initializes authentication provider and Slack integration for notifications
- Sets up Slack integration for CI notifications and error alerts

---

## Running Locally

After completing the setup, you can start developing and testing your apps locally.

### Start All Apps

```sh
pnpm start
```

This command will:

- Launch the Next.js frontend (`apps/web`)
- Start the backend using SST locally (`apps/backend`)
- Connect to your Supabase database
- Generate any required types and assets

> All core services will be up and running, connected, and ready for development.

---

## Deployment

Deployments are managed using SST and AWS, with automated workflows powered by GitHub Actions.

### Deploy to AWS

```sh
pnpm run deploy
```

This will:

- Deploy your serverless backend and infrastructure using SST
- Sync environment variables and secrets as configured during setup

### Continuous Integration & Delivery

GitHub Actions handle all CI/CD workflows, supporting testing and deployments across multiple environments.

#### Current Workflow (Rapid Development)

Optimized for small projects and quick iteration:

**Main Branch:**

- Every push triggers linting and basic tests
- Auto-deploys to `dev` environment on test success

**Production Releases:**

- Create a GitHub release to deploy to production
- Runs full test suite plus E2E tests in temporary `ci` environment
- Deploys to `production` environment after all tests pass

_Environments: `dev`, `prod`_

#### Proposed Workflow (Larger Projects)

For projects requiring stricter quality gates:

**Branch Protection:**

- Trunk requires PR approval and passing tests
- Merge queue ensures code compatibility before landing

**Pull Requests:**

- Trigger linting, basic tests, and builds
- Must pass review before merging

**Release Process:**

- `releases/*` branches auto-deploy to `staging` with full E2E testing
- GitHub releases from release branches deploy to `prod`

_Environments: `dev`, `staging`, `prod`_

---

## Helper Tasks

- **Create a New Package:**  
  Scaffold a new package with the following command:

  ```sh
  pnpm create:package <package-name>
  ```

  Or use the VSCode Tasks UI:  
  `Ctrl+Shift+P` → "Tasks: Run Task" → "Create New Package"  
  You can also use the templates in the `templates/` directory to quickly scaffold new apps or packages.

- **Add Backend Environment Variables:**  
  To add environment variables to the backend, run:

  ```sh
  pn backend add-secret
  ```

  This will start a helper script that guides you through securely adding secrets to your backend environment.

---

## Testing

This monorepo is set up for robust testing of both backend and frontend applications, with minimal mocking to ensure high-quality, realistic test results.

### Backend

- **Test Runner:** [Vitest](https://vitest.dev/)
- **Database:** In-memory SQLite
- **Purpose:** We use Vitest to run integration tests against the actual backend routes and tRPC endpoints. The backend is tested with a real in-memory SQLite database (serves as a mock database), so you can verify the full behavior of your API with minimal mocking. This approach ensures that your tests are as close to production as possible, catching issues that might be missed with heavy mocking.

**How to run backend tests:**

```sh
pnpm backend test
```

> This runs all tests for the backend app.

You can also run the Vitest UI for interactive test running:

```sh
pnpm backend test:ui
```

---

### Web

- **E2E Tests:** [Playwright](https://playwright.dev/)

#### Basic Tests

- **Test Runner:** [Vitest](https://vitest.dev/)
- **Purpose:** We use Vitest to run basic tests against complicated utilities and functions in the web codebase. This is helpful for ensuring that complicated units of code behave as expected.

**How to run frontend basic tests:**

```sh
pnpm web test
```

> This runs all Vitest basic tests for the web app.

For the interactive UI:

```sh
pnpm web test:ui
```

#### E2E Tests

- **Test Runner:** [Playwright](https://playwright.dev/)
- **Purpose:** We use Playwright, which launches a real browser to test your app end-to-end. This helps ensure that the app works as expected from end to end for important user flows.

**How to run frontend E2E tests:**

```sh
pnpm web test:e2e
```

> This runs all Playwright E2E tests for the web app.

For the Playwright UI (to run/debug tests interactively):

```sh
pnpm web test:e2e:ui
```

---
