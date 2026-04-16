---
title: "V4V MetaBoost Flow"
---

# V4V MetaBoost Flow

This diagram shows how V4V and channel-level `<podcast:metaBoost standard="mb1">` data moves from
RSS ingestion through Podverse parsing and storage, into API responses, and finally into the web
boost flow with client-side calls to a MetaBoost server and Alby Sandbox.

```mermaid
flowchart TD
  Feed[RSS feed with channel-level podcast:metaBoost + podcast:value]
  Partytime[Partytime parser]
  Mapping[Parser mapping compat]
  Parser[Podverse parser ingest]
  ORM[ORM services]
  DB[(DB: channel_value_meta_boost<br/>item_value_meta_boost)]
  API[API responses with value + metaBoost]
  Web[Web client boost flow]
  MetaBoostServer[MetaBoost server /boost]
  Alby[Alby Sandbox LNURL<br/>invoice endpoints]

  Feed --> Partytime --> Mapping --> Parser --> ORM --> DB
  DB --> API --> Web
  Web -->|metaBoost metadata| MetaBoostServer
  Web -->|mb1 recipient_outcomes confirm| MetaBoostServer
  Web -->|LNURL invoice request| Alby
  Alby -->|invoice response| Web
```
