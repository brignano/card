# 0003: This repo has no architecture model

Status: accepted
Date: 2026-11-03
From: #26

## Context
The fleet standard asks repos that deploy several parts to keep a driftwood
`architecture.yaml`, checked in CI, so the system diagram is never hand-drawn.
This repo is one npm command-line package: nothing is deployed, and its only
outside call is a read of the public GitHub API.

## Decision
No `architecture.yaml` and no `docs/architecture.md` here.

## Consequences
- One less file and CI check to keep true.
- If the card ever gains a deployed part (a server, a worker, a hosted page),
  this decision is superseded and the model is added then.
