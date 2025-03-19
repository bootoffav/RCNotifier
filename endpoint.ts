import { stringify } from "npm:qs";
import { format, previousSaturday } from "npm:date-fns";

const BITRIX24_ENDPOINT = Deno.env.get("CLIENT_ENDPOINT") || "";
const WEBREQUEST_USER_ID = Deno.env.get("WEBREQUEST_USER_ID") || "";
const WEBHOOK_KEY = Deno.env.get("WEBHOOK_KEY") || "";

function getTasks() {
  return fetch(
    `${BITRIX24_ENDPOINT}/${WEBREQUEST_USER_ID}/${WEBHOOK_KEY}/tasks.task.list`,
    {
      method: "POST",
      body: stringify({
        filter: {
          CREATED_BY: WEBREQUEST_USER_ID,
          ">=CREATED_DATE": format(previousSaturday(new Date()), "yyyy-MM-dd"),
        },
        select: ["ID", "CREATED_DATE", "TITLE", "RESPONSIBLE_ID"],
      }),
    },
  )
    .then((r) => r.json())
    .then((r) => r);
}

export { getTasks };
