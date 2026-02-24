---
title: "V4V MetaBoost Flow"
---

# V4V MetaBoost Flow

This diagram shows how V4V and `<podcast:metaBoost>` data moves from RSS ingestion through
Podverse parsing and storage, into API responses, and finally into the web boost flow with
client-side calls to BoostBox and Alby Sandbox.

```mermaid
flowchart TD
  Feed[RSS feed with podcast:value + podcast:metaBoost]
  Partytime[Partytime parser]
  Mapping[Parser mapping compat]
  Parser[Podverse parser ingest]
  ORM[ORM services]
  DB[(DB: channel_value_meta_boost<br/>item_value_meta_boost)]
  API[API responses with value + metaBoost]
  Web[Web client boost flow]
  BoostBox[BoostBox /boost]
  Alby[Alby Sandbox LNURL<br/>invoice endpoints]

  Feed --> Partytime --> Mapping --> Parser --> ORM --> DB
  DB --> API --> Web
  Web -->|metaBoost metadata| BoostBox
  Web -->|LNURL invoice request| Alby
  Alby -->|invoice response| Web
```
