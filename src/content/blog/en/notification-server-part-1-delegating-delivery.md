---
title: "Designing a Notification Server, Part 1 - Where to Hand Off Delivery"
description: "Calling the messaging API wherever a notification is needed scatters rate limits, scheduling, and failure tracking. Part 1 weighs where to hand off delivery."
pubDate: "2026-11-15T21:00:00+09:00"
socialImage: "../../../assets/blog/notification-server-part-1-delegating-delivery/og.png"
tags: ["architecture", "queue", "redis"]
series: "Designing a Notification Server"
seriesOrder: 1
---

## Introduction

Every service needs to send messages to users, whether through AlimTalk, email, or push notifications. At first, calling the external API wherever a message is needed is enough. Once more places start sending, though, that approach quickly runs into limits.

-   <strong>Multiple places call the same external API.</strong> Delivery paths become scattered across the API server, admin system, and batch jobs.
-   <strong>External APIs have rate limits.</strong> A constraint such as "100 requests per five seconds" must be enforced somewhere.
-   <strong>Many messages are not sent immediately.</strong> Timed sends such as "guidance on D+1 after verification" or "another notice three days after a payment failure" are necessary. Some, like a one-off message an administrator schedules for a particular user at a particular time, are hard to express as a state value in the domain model.
-   <strong>Bulk delivery always includes some failures.</strong> The system must track which messages failed and which need to be sent again.

Each of these problems can be solved on its own. Consolidate delivery into one module, put a rate limit inside a function, create time-based branches with a scheduler, and record failures in a delivery-history table. The hard part is solving all four at once inside one system. In a distributed environment where an API server and several workers run together, the four must not drift apart.

This series covers the forks I met while designing such a notification server. At each fork, it looks at which candidates there were and what each one gains and gives up. Part 1 starts at the beginning and breaks the question of where to hand off delivery into four questions.

1. Does the side that requests a send need to wait for the result?
2. Does the requesting side know who will process it?
3. Where should the state of pending work live?
4. How should scheduled sends be represented?

To give the answer first, I chose BullMQ, a Redis-backed job queue. This post, however, is not an introduction to BullMQ. For each question, it asks what would have changed with a different candidate. BullMQ's own structure and features are covered separately in [What Is BullMQ](/blog/bullmq-notification-part-1-what-is-bullmq).
