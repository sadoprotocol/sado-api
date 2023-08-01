import debug from "debug";
import fetch from "node-fetch";

import { config } from "../Config";
import { cacheNotification, hasNotification } from "../Models/Notification";
import { Offer } from "../Models/Offer";
import { Order } from "../Models/Order";

const log = debug("sado:notification");

export async function sendOrderNotification({ order }: Order) {
  if (await hasNotification(order.cid)) {
    return; // already notified
  }
  try {
    await cacheNotification(order.cid);
    await fetch(config.slack.webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Order Successfully Created",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `A new *${order.type}* order was just added.`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${order.meta?.name ?? "Unnamed"}*\n<${config.ipfs.gateway}/ipfs/${order.cid}|View Order>`,
            },
          },
        ],
      }),
    });
  } catch (error) {
    log(`Failed to send notification: ${error.message}`);
  }
}

export async function sendOfferNotification({ offer, order }: Offer) {
  if (await hasNotification(offer.cid)) {
    return; // already notified
  }
  try {
    await cacheNotification(offer.cid);
    await fetch(config.slack.webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Offer Successfully Created",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `A new offer was just added for <${config.ipfs.gateway}/ipfs/${order.cid}|order>.`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${order.meta?.name ?? "Unnamed"}*\n<${config.ipfs.gateway}/ipfs/${offer.cid}|View Offer>`,
            },
          },
        ],
      }),
    });
  } catch (error) {
    log(`Failed to send notification: ${error.message}`);
  }
}
