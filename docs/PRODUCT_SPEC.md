# Product specification

## Purpose

Mnemosyne turns a person's Markdown knowledge base into durable understanding through source-grounded recall, explanation, reconstruction, tracing, and failure analysis.

## Product principles

- **Local-first:** original documents, extracted knowledge, learning history, and progress persist on the user's machine. Cloud storage is never required.
- **Explicit AI processing:** remote model calls happen only after a clear user action. AI configuration and API keys stay server-side.
- **Source-grounded learning:** concepts, exercises, and evaluation feedback retain references to their original document locations.
- **Knowledge relationships:** represent concepts and their dependencies as a graph, in addition to preserving source documents.
- **Separate mastery dimensions:** measure recall, explanation, reconstruction, tracing, and reasoning independently.
- **Preserve learning history:** reprocessing source material must not erase prior responses or review history.

## Initial input and learning scope

The first ingestion milestone accepts Markdown files, extracts document structure and Mermaid diagrams, and creates reviewable knowledge candidates. Initial exercise types are active recall, teach-back, architecture reconstruction, execution tracing, and failure analysis.

## Privacy and security

The local application binds to `127.0.0.1`. User data is kept in ignored local storage. Markdown and Mermaid are untrusted input. Imported content cannot override AI instructions or trigger tools. Users can delete a source and its generated knowledge.

## Delivery approach

Build a modular monolith with one Next.js deployment and capability-oriented internal packages. Add functionality milestone by milestone; avoid distributed infrastructure until a concrete need exists.
