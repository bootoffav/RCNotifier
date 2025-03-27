import { Application } from "@oak/oak";
import { compareAsc, parseISO, sub } from "date-fns";
import type { HistoryPoint, WebhookPayload } from "./types.ts";
import { sendToChat, sendToEmail } from "./notify.ts";
import {
  formMessageBody,
  getUser,
  user_optedout_from_email_notification,
} from "./utils.ts";

const app = new Application();

const CONFIG = {
  WEBHOOK_KEY: Deno.env.get("WEBHOOK_KEY") || "",
  WEBREQUEST_USER_ID: Deno.env.get("WEBREQUEST_USER_ID") || "189",
  APPLICATION_TOKEN: Deno.env.get("APPLICATION_TOKEN") || "",
  CLIENT_ENDPOINT: Deno.env.get("CLIENT_ENDPOINT") || "",
  TASK_ID: "",
};

app.use(async ({ request: { body } }) => {
  try {
    if (body.type() === "form") {
      const payload = Object.fromEntries(await body.form()) as WebhookPayload;
      if (
        payload["auth[application_token]"] === CONFIG.APPLICATION_TOKEN &&
        payload.event === "ONTASKUPDATE"
      ) {
        CONFIG.CLIENT_ENDPOINT = payload["auth[client_endpoint]"];
        CONFIG.TASK_ID = payload["data[FIELDS_BEFORE][ID]"];

        const { createdBy, title } = await fetch(
          `${CONFIG.CLIENT_ENDPOINT}${CONFIG.WEBREQUEST_USER_ID}/${CONFIG.WEBHOOK_KEY}/tasks.task.get?id=${CONFIG.TASK_ID}`,
        )
          .then((res) => res.json())
          .then(({ result }) => ({
            createdBy: result.task.createdBy,
            title: result.task.title,
          }));

        // check if task is created by web_request
        if (createdBy !== CONFIG.WEBREQUEST_USER_ID) return;

        // get task history
        const taskHistory = await fetch(
          `${CONFIG.CLIENT_ENDPOINT}${CONFIG.WEBREQUEST_USER_ID}/${CONFIG.WEBHOOK_KEY}/tasks.task.history.list?id=${CONFIG.TASK_ID}`,
        )
          .then((res) => res.json())
          .then(({ result, error }) =>
            error ? [] : (result.list as HistoryPoint[])
          );

        const lastAction = taskHistory.filter(({ field }) =>
          ["RESPONSIBLE_ID", "ACCOMPLICES"].includes(field)
        ).pop() as HistoryPoint;
        if (lastAction) {
          const {
            value: { to },
            createdDate,
            field,
          } = lastAction;

          const dateOfLastChange = parseISO(createdDate);
          const tresholdDate = sub(new Date(), { seconds: 3 });

          if (
            // check if responsible change happened within last 5 seconds,
            compareAsc(dateOfLastChange, tresholdDate) !== -1 &&
            to !== CONFIG.WEBREQUEST_USER_ID
          ) {
            // send notification to chat
            sendToChat(field, to);
            // send notificaton by email
            if (!user_optedout_from_email_notification(to)) {
              const { name, email } = await getUser(to);
              sendToEmail(
                `Web-request was assigned to you (${name})`,
                formMessageBody("changer", title),
                { name, email },
              );
            }
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
});

if (import.meta.main) {
  app.listen({ port: 80 });
}

export { CONFIG, user_optedout_from_email_notification };
