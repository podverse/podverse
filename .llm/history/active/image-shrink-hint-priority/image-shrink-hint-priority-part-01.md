# image-shrink-hint-priority

Started: 2026-05-05

## Session 1 - 2026-05-05

#### Prompt (Developer)

we need to update the image consumer mq job. there should be priority added and handled where the higher level rss tags (like <channel>) have a higher priority (it takes priority over) the child rss tags (like <item>). the channel images should always parse ahead of the item images.

#### Key Decisions

- Image-shrink MQ sends use explicit AMQP priorities: channel hints 9, item hints 4 (`mqImageShrinkHintAmqpPriority`).
- `sendMessage` accepts optional `amqpPriority` (0–9) so hints override the normal/slow string mapping.

#### Files Created/Modified

- `.llm/history/active/image-shrink-hint-priority/image-shrink-hint-priority-part-01.md`
- `packages/helpers/src/lib/mq/mqConstants.ts`
- `packages/mq/src/services/activeMQArtemis/index.ts`
- `packages/mq/src/functions/mq/rss/addImageHint.ts`
- `docs/image-shrinking/SERVICE.md`
