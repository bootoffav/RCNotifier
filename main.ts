import { Application } from "@oak/oak";
import { compareAsc, parse, sub } from "date-fns";
import type { HistoryPoint, WebhookPayload } from "./types.ts";

const app = new Application();

const WEBHOOK_KEY = Deno.env.get("WEBHOOK_KEY") || "";
const WEBREQUEST_USER_ID = Deno.env.get("WEBREQUEST_USER_ID") || "189";
const APPLICATION_TOKEN = Deno.env.get("APPLICATION_TOKEN") || "";

let clientEndpoint: string;
let taskId: string;

app.use(async ({ request: { body } }) => {
  try {
    if (body.type() === "form") {
      const payload = Object.fromEntries(await body.form()) as WebhookPayload;
      if (
        payload["auth[application_token]"] === APPLICATION_TOKEN &&
        payload.event === "ONTASKUPDATE"
      ) {
        clientEndpoint = payload["auth[client_endpoint]"];
        taskId = payload["data[FIELDS_BEFORE][ID]"];

        const { createdBy, title } = await fetch(
          `${clientEndpoint}${WEBREQUEST_USER_ID}/${WEBHOOK_KEY}/tasks.task.get?id=${taskId}`,
        )
          .then((res) => res.json())
          .then(({ result }) => ({
            createdBy: result.task.createdBy,
            title: result.task.title,
          }));

        // check if task is created by web_request
        if (createdBy !== WEBREQUEST_USER_ID) return;

        // get task history
        const taskHistory = await fetch(
          `${clientEndpoint}${WEBREQUEST_USER_ID}/${WEBHOOK_KEY}/tasks.task.history.list?id=${taskId}`,
        )
          .then((res) => res.json())
          .then(({ result, error }) =>
            error ? [] : (result.list as HistoryPoint[])
          );

        // get history of responsable changes and get last change specific fields
        const {
          value: { to },
          createdDate,
          field,
        } = taskHistory
          .filter(({ field }) =>
            ["RESPONSIBLE_ID", "ACCOMPLICES"].includes(field)
          )
          .pop() as HistoryPoint;
        const dateOfLastChange = parse(
          createdDate + " +03",
          "dd.MM.yyyy H:m:s x",
          new Date(),
        );
        const tresholdDate = sub(new Date(), { seconds: 5 });

        // check if responsible change happened within last 5 seconds,
        if (
          compareAsc(dateOfLastChange, tresholdDate) !== -1 &&
          to !== WEBREQUEST_USER_ID
        ) {
          // send notification to chat
          sendToChat(field, to);
          // send notificaton by email
          sendToEmail(title, await getUser(to));
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
});

function sendToChat(
  field: string,
  userId: string,
) {
  fetch(
    `${clientEndpoint}${WEBREQUEST_USER_ID}/${WEBHOOK_KEY}/im.message.add`,
    {
      method: "POST",
      body: JSON.stringify({
        MESSAGE: `[B]${
          field === "RESPONSIBLE_ID"
            ? "Web-request was assigned to you"
            : "You've been assigned as participant of web-request task"
        }[/B]\nhttps://xmtextiles.bitrix24.eu/company/personal/user/${WEBREQUEST_USER_ID}/tasks/task/view/${taskId}/`,
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
        `<html><body><a href="https://xmtextiles.bitrix24.eu/company/personal/user/${WEBREQUEST_USER_ID}/tasks/task/view/${taskId}/">${title}</a></body></html>`,
    }),
    headers: {
      "content-type": "application/json",
      "api-key": Deno.env.get("BREVO_API_KEY") || "",
    },
  });
}

async function getUser(id: string) {
  return await fetch(
    `${clientEndpoint}${WEBREQUEST_USER_ID}/${WEBHOOK_KEY}/user.get?id=${id}`,
  ).then((res) => res.json())
    .then(({ result }) => ({
      email: result[0]["EMAIL"],
      name: result[0]["NAME"],
      lastName: result[0]["LAST_NAME"],
    }));
}

await app.listen({ port: 80 });
