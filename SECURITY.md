# Security policy

## Reporting a vulnerability

Please report vulnerabilities **privately**, not in a public issue, pull request or discussion.

Use GitHub's private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**. Only the maintainers can see the report.

Please include:

- what is affected (a page, state or file) and how to reproduce it;
- the impact you expect, for example leaking a `response_code`, sending a citizen to the wrong site, or framing the page;
- any proof of concept, logs or screenshots.

We aim to acknowledge a report within 3 working days and to keep you informed until it is resolved. Please give us a reasonable time to fix the issue before disclosing it publicly.

## Scope

This repository is the hosted verification page only: static files served from a CDN, with no secrets and no server code. In scope:

- the page's handling of the request, the QR code, the deep link and the return to the service;
- the Content-Security-Policy and the other security headers described in the README.

Vulnerabilities in the platform API (`/verification/hosted/...`), the Bhutan NDI wallet or a relying party's service are out of scope here. Report those to the owner of that component.

## Supported versions

Only the latest release, served at the production URL, is supported.
