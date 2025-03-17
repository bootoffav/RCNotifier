import { CONFIG } from "./main.ts";
import type { getUser } from "./utils.ts";

function sendToChat(
  field: string,
  userId: string,
) {
  fetch(
    `${CONFIG.CLIENT_ENDPOINT}${CONFIG.WEBREQUEST_USER_ID}/${CONFIG.WEBHOOK_KEY}/im.message.add`,
    {
      method: "POST",
      body: JSON.stringify({
        MESSAGE: `[B]${
          field === "RESPONSIBLE_ID"
            ? "Web-request was assigned to you"
            : "You've been assigned as participant of web-request task"
        }[/B]\nhttps://xmtextiles.bitrix24.eu/company/personal/user/${CONFIG.WEBREQUEST_USER_ID}/tasks/task/view/${CONFIG.TASK_ID}/`,
        DIALOG_ID: userId,
      }),
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

function sendToEmail(
  title: string,
  { name, lastName, email }: Awaited<ReturnType<typeof getUser>>,
) {
  fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      "sender": {
        "name": "WR Report (XMT)",
        "email": "web_request@xmtextiles.com",
      },
      "to": [{ email, name: `${name} ${lastName}` }],
      "cc": [{ email: "vit@xmtextiles.com", name: "Vitaly Aliev" }],
      "subject": `Web-request was assigned to you (${name} ${lastName})`,
      "htmlContent":
        `<html><body><a href="https://xmtextiles.bitrix24.eu/company/personal/user/${WEBREQUEST_USER_ID}/tasks/task/view/${CONFIG.TASK_ID}/">${title}</a></body></html>`,
    }),
    headers: {
      "content-type": "application/json",
      "api-key": Deno.env.get("BREVO_API_KEY") || "",
    },
  });
}

export { sendToChat, sendToEmail };
