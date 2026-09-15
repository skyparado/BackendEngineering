# Macky Merch API

## What this project does

- This is a fork of the [LSCS starter](https://github.com/dlsu-lscs/devsecops-exam-starter).
- The submission is [skyparado/devsecops-exam-starter](https://github.com/skyparado/devsecops-exam-starter).
- The starter API and its test still do the same things.
- The API has a `/health` address that returns a message when it is running.
- Docker packages the API and the software it needs.
- GitHub Actions automatically tests the code, builds the Docker image, and checks for security problems.

## Run without Docker

- Install Node.js 24. This matches the version in `.nvmrc` and GitHub Actions.
- Open a terminal in the project folder.
- Install packages, run the test, and start the API:

```sh
npm ci --ignore-scripts
npm test -- --runInBand
npm start
```

- Open http://localhost:3000/health.
- The expected response is:

```json
{"status":"OK","message":"Macky Merch API is running smoothly."}
```

- Press Ctrl+C to stop the API.

## Run with Docker

- Install Docker with Compose support and start Docker.
- An image is the packaged application. A container is a running copy of that image.
- Build the image, then start a container:

```sh
docker build --pull -t macky-merch:local .
docker run --rm --init -p 127.0.0.1:3000:3000 --name macky-merch macky-merch:local
```

- Open another terminal and check the response and the container user:

```sh
curl http://localhost:3000/health
docker exec macky-merch id
```

- The response should match the JSON above.
- The user should be `node`, with user ID 1000. This account does not have root access.
- Press Ctrl+C in the first terminal to stop the container.

## Why this Docker setup was chosen

- The base image is `node:24-bookworm-slim`.
  - It includes Node 24 and a smaller version of Debian Linux.
  - The name selects a Node major version and Linux version. `latest` does not make that choice clear.
  - The long `sha256` value in the Dockerfile selects an exact base image.
- The Dockerfile has two build stages.
  - The first stage installs the packages needed to run the API.
  - The second stage copies those packages and the app into the final image.
  - Test tools are left out of the final image to keep it smaller.
- The final stage updates PCRE2, a Linux library that the earlier security scan flagged.
- It removes npm and Yarn from the final image. They had scan findings and are not needed to run this API.
- `USER node` runs the API without root access.
- The health check calls `/health` to check whether the API responds.
- `.dockerignore` allows only `package.json`, `package-lock.json`, and `server.js` into the Docker build.
  - Local packages, Git files, tests, and the vulnerable example are excluded.
- Linux updates are downloaded during the build, so later builds can still receive newer fixes.

## How the automatic checks work

- CI means Continuous Integration. It means checking code changes automatically.
- `.github/workflows/ci.yml` runs when code is pushed to `main` or a pull request targets `main`.
- It can also be started manually.
- It runs four groups of checks:
  - **Test and build:** downloads the code, sets up Node, installs packages, runs the test, builds Docker, checks the container user and API response, and scans the image.
  - **Compose smoke test:** starts the API and Redis, checks that both respond, then stops them. A smoke test is a basic check that something starts and works.
  - **Dependency security:** checks installed packages for known security problems.
  - **Secret scan:** checks files for possible passwords and API keys.
- `npm ci` installs the exact package versions saved in `package-lock.json`.
  - It fills the exam's package installation step.
  - It fails if `package.json` and the lockfile disagree.
- `--ignore-scripts` stops package install scripts from running. This API does not need them.
- Each job has a time limit. Older runs are cancelled when a newer run replaces them.
- The workflow has read-only access to repository contents.
- GitHub keeps uploaded package and image scan reports for 30 days.
- These checks do not publish the API to a live website.

## Security tools and choices

- **npm audit** checks packages for known security problems.
  - It works with the existing npm package list and needs no separate service account.
  - It checks both app packages and development packages.
  - High or critical findings fail the check.
- **Trivy image scanning** checks software inside the Docker image.
  - It checks Linux packages and application libraries.
  - High or critical findings fail the check when a fix is available.
  - Lower severity findings and findings without a fix do not fail this check.
- **Trivy secret scanning** checks repository files for possible credentials.
  - A detected secret fails the check.
  - It does not check deleted Git history and can miss some secrets.
- Passing these checks does not prove that every possible security problem is gone.
- `.github/dependabot.yml` asks Dependabot to propose package, image, and GitHub Actions updates.

## Proof that the security check caught a problem

- An earlier version added unused `lodash@4.17.20` to the app's development packages on purpose.
- The package scanner detected a high severity problem and failed CI.
- The image scanner also found problems in PCRE2 and packages bundled with npm and Yarn.
- A later version removed lodash, updated PCRE2, and removed npm and Yarn from the final image.
- The same CI checks then passed.
- The earlier GitHub runs are:
  - [Failed run for commit f06a0bc](https://github.com/skyparado/devsecops-exam-starter/actions/runs/34864508939).
  - [Passed run for commit 79e326c](https://github.com/skyparado/devsecops-exam-starter/actions/runs/34864755525).
- These runs belong to the earlier history, before the submission branch was reset. They do not show the result of a future submission commit.
- Two saved reports keep the package scan evidence:
  - [Before the fix: the scanner finds the problem](results/before-package-check.txt).
  - [After the fix: the package check passes](results/after-package-check.txt).

## Repeat the security example

- `security-test/` contains a separate package list with vulnerable lodash.
- The app does not use it, and Docker does not include it.
- Run these commands to check the app and then the example. Installing the example is not needed:

```sh
npm audit --audit-level=high
npm --prefix security-test audit --audit-level=high
```

- The app scan previously passed with no findings. New security reports can change future results.
- The example scan should report lodash and exit with code 1, meaning the check failed.
- `.github/workflows/security-test.yml` runs this example when started manually.
- Its name is **Security test (expected failure)**.
- A red result for this example is expected because the scanner should catch the problem.
- Do not make this example a required check for merging code.

## Challenges and fixes

- **Other packages also had security findings.**
  - The deliberate lodash problem was not the only finding.
  - Compatible package updates fixed the other package findings without changing the API or test.
  - Tests and scans were repeated after the changes.
- **Docker was unavailable on the local development machine.**
  - Docker builds and container checks were run on GitHub's runner instead. A runner is the computer that performs the checks.
- **The local Node version differed from CI.**
  - A test on Node 26 did not confirm that the app worked on Node 24.
  - The test and API response were checked again under Node 24.

## Bonus features

- **Docker Compose:** starts the API and a dummy Redis service together.
  - Stop any existing API container first so port 3000 is free.
  - Start both services, view their status, then stop them:

```sh
docker compose up --build -d
docker compose ps
docker compose down
```

- Both services use the same `backend` network.
- Redis is a sample database service. The API does not read or write data in Redis.
- Redis does not expose a port on the host and does not keep data after the container is removed.
- Compose also limits the API container's permissions and makes its normal files read-only.
- **Multi-stage Docker build:** keeps development packages and tools out of the final image.
- **Branch protection:** can block merging when required checks fail.
  - It is a GitHub setting, not a project file.
  - Protection was relaxed to reset the branch. Restore it after pushing the final work.
  - Require pull requests and these checks: **Test and build**, **Compose smoke test**, **Dependency security**, and **Secret scan**.
  - Require checks to be up to date and apply the rule to administrators.
  - Disable force pushes and branch deletion.

## Before submitting

- The earlier successful run recorded passing tests, Docker build, container checks, Compose checks, and security scans.
- Commit and push the final files.
- Open the repository's **Actions** tab and check the new **CI** run.
- Confirm that all four groups of checks pass for the new commit.
- Check that the saved report links and earlier run links are accessible.
- Restore branch protection.
- Submit the fork URL through the exam application form.
