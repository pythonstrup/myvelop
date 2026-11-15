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

Suppose we are building a service that sends a welcome AlimTalk message when someone finishes signing up. At first, one call to the external messaging API inside the sign-up API is all it takes.

The requirements soon snowball. When a payment fails, the user needs another notice three days later, and the admin team wants to schedule a message for a particular user at a time of their choosing. A nightly batch job sends an announcement to every member. Now there is sending code in the API server, in the admin system, and in the batch job.

This is where the problems show up. Say the external API has a limit such as "100 requests per five seconds." The three places have to share that limit, yet none of them knows how much the others are calling. To send the notice three days later, something has to remember that time. And if part of the batch announcement fails, it is hard to work out whom to send it to again.

At this point, someone suggests gathering delivery in one place and splitting it out into its own server. This series covers the trade-offs you will face while building that notification server. In order, it looks at what to hand delivery to, where to enforce the external API's limit, where to store the delivery history and how to read it, and what gets crossed when bulk sends go out in groups. For each decision, it lines up the candidates and weighs what each one gains and gives up. If you are about to split out a delivery server yourself, you can read it as a list of things to check before deciding.

Part 1 covers the first of those trade-offs: where to hand off delivery. That question breaks down into four.

1. Does the side that requests a send need to wait for the result?
2. Does the requesting side know who will process it?
3. Where should the state of pending work live?
4. How should scheduled sends be represented?
