import { Application } from "@oak/oak";
import { loadSync } from "@std/dotenv";
import { compareAsc, parse, sub } from "date-fns";
import { WebhookPayload } from "./types.ts";

loadSync({ export: true });
const app = new Application();

type HistoryPoint = {
  field: string;
  createdDate: string;
  value: {
    to: string;
    from: string;
  };
};

app.use(async ({ request: { body } }) => {
  try {
    if (body.type() === "form") {
      const payload = Object.fromEntries(await body.form()) as WebhookPayload;
      if (
        payload["auth[application_token]"] ===
          Deno.env.get("APPLICATION_TOKEN") &&
        payload.event === "ONTASKUPDATE"
      ) {
        const clientEndpoint = payload["auth[client_endpoint]"];

        // check if task is created by web_request
        const taskBelongsToWR = await fetch(
          `${clientEndpoint}189/${
            Deno.env.get(
              "WEBHOOK_KEY",
            )
          }/tasks.task.get?id=${payload["data[FIELDS_BEFORE][ID]"]}`,
        )
          .then((res) => res.json())
          .then(({ result }) => result.task.createdBy === "189");

        if (!taskBelongsToWR) return;

        // get task history
        const taskHistory = await fetch(
          `${clientEndpoint}189/${
            Deno.env.get(
              "WEBHOOK_KEY",
            )
          }/tasks.task.history.list?id=${payload["data[FIELDS_BEFORE][ID]"]}`,
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
        if (compareAsc(dateOfLastChange, tresholdDate) !== -1) {
          // send notification to chat
          fetch(
            `${clientEndpoint}189/${
              Deno.env.get(
                "WEBHOOK_KEY",
              )
            }/im.message.add`,
            {
              method: "POST",
              body: JSON.stringify({
                MESSAGE: `[B]${
                  field === "RESPONSIBLE_ID"
                    ? "Web-request was assigned to you"
                    : "You've been assigned as participant of web-request task"
                }[/B]\nhttps://xmtextiles.bitrix24.eu/company/personal/user/189/tasks/task/view/${
                  payload["data[FIELDS_BEFORE][ID]"]
                }/`,
                DIALOG_ID: to,
              }),
              headers: {
                "content-type": "application/json",
              },
            },
          );
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
});

await app.listen({ port: 8001 });
