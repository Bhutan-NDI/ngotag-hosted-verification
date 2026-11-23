## How to contribute

You are encouraged to contribute to the repository by **forking and submitting a pull request**.

For significant changes, please open an issue first to discuss the proposed changes to avoid re-work.

(If you are new to GitHub, you might start with a [basic tutorial](https://help.github.com/articles/set-up-git) and check out a more detailed guide to [pull requests](https://help.github.com/articles/using-pull-requests/).)

Pull requests will be evaluated by the repository guardians on a schedule and if deemed beneficial will be merged into the `develop` branch. Pull requests should have a descriptive name and include a summary of all changes made in the pull request description. A Continuous Integration (CI) pipeline runs on all PRs before review (lint, type check, static build and a headless check for CSP violations), and contributors are expected to address all CI issues identified.

Changes to what the citizen sees should keep to the design (light theme, English and Dzongkha) and be checked in `/preview` (`npm run dev`, then http://localhost:3000/preview). New or changed copy needs both languages in [src/lib/i18n/messages.ts](src/lib/i18n/messages.ts); Dzongkha is reviewed by a native speaker before release.

Please do not report security vulnerabilities in issues or pull requests. See [SECURITY.md](SECURITY.md).

### Workflows

This repository is public, so any new GitHub Actions workflow must follow these rules:

- No secrets in workflows that run on pull requests.
- Never use `pull_request_target` together with a checkout of pull-request code.
- Deploy jobs run only from protected branches in this repository, never from forks.

### Licence

Contributions are made pursuant to the Developer's Certificate of Origin, available at [https://developercertificate.org](https://developercertificate.org), and licensed under the Apache License, version 2.0 (Apache-2.0). The Bhutan NDI name, logos and icons are not covered by the licence; see the README.
