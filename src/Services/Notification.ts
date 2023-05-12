import debug from "debug";
import fetch from "node-fetch";

import { config } from "../Config";
import { cacheNotification, hasNotification } from "../Entities/Notification";
import { Order } from "../Entities/Order";
import { Lookup } from "./Lookup";

const log = debug("sado:notification");

export async function sendOrderNotification(order: Order, lookup: Lookup) {
  if (await hasNotification(order.order.cid)) {
    return; // already notified
  }
  try {
    await cacheNotification(order.order.cid);
    await fetch(config.slack, {
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
              text: `A new *${order.order.type}* order was just added.`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${order.order.meta?.name ?? "Unnamed"}*\n<https://sado.infura-ipfs.io/ipfs/${
                order.order.cid
              }|View Order>`,
            },
            ...(await getInscriptionAccessory(
              await order
                .getInscriptions(lookup)
                .then(
                  (inscriptions) =>
                    inscriptions.find((inscription) => inscription.media_type === "image/jpeg")?.media_content
                )
            )),
          },
        ],
      }),
    });
  } catch (error) {
    log(`Failed to send notification: ${error.message}`);
  }
}

async function getInscriptionAccessory(inscription?: any) {
  if (inscription === undefined) {
    return {};
  }
  return {
    accessory: {
      type: "image",
      image_url: inscription,
      alt_text: "media content",
    },
  };
}
