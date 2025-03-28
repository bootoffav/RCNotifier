import { groupBy } from "jsr:@es-toolkit/es-toolkit";
import { compareAsc, parseISO, sub } from "date-fns";

import type { Task } from "./types.ts";

import {
  formMessageBody,
  getUser,
  user_optedout_from_email_notification,
} from "./utils.ts";
import { CONFIG } from "./main.ts";
import { getTasks } from "./endpoint.ts";

const kv = await Deno.openKv();

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
  subject: string,
  htmlContent: string,
  { name, email }: Awaited<ReturnType<typeof getUser>>,
) {
  fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: {
        name: "WR Report (XMT)",
        email: "web_request@xmtextiles.com",
      },
      to: [{ name, email }],
      cc: [{ email: "vit@xmtextiles.com", name: "Vitaly Aliev" }],
      subject,
      htmlContent,
    }),
    headers: {
      "content-type": "application/json",
      "api-key": Deno.env.get("BREVO_API_KEY") || "",
    },
  });
}

async function shouldNotify(
  createdDate: string,
  to: string,
  id: string,
): Promise<boolean> {
  const dateOfLastChange = parseISO(createdDate);
  const tresholdDate = sub(new Date(), { days: 3 });

  const { value } = await kv.get(["notifiedId"]);

  return compareAsc(dateOfLastChange, tresholdDate) !== -1 &&
    to !== CONFIG.WEBREQUEST_USER_ID &&
    !((value as string[]).includes(id));
}

Deno.cron(
  "Send daily email reminders",
  "30 13 * * 2-5",
  async () => {
    // get tasks
    const tasks: Task[] = await getTasks()
      .then((r) => r.result.tasks)
      .catch(() => []);

    const taskByResponsible = groupBy(
      tasks,
      (task: Task) => task.responsibleId,
    );

    // send mails
    for (const [responsibleId, tasks] of Object.entries(taskByResponsible)) {
      if (!user_optedout_from_email_notification(responsibleId)) {
        const { name, email } = await getUser(responsibleId);
        sendToEmail(
          `this week web-requests (${name})`,
          formMessageBody("reminder", tasks),
          { name, email },
        );
      }
    }
  },
);

Deno.cron(
  "Clear kv for notified id",
  "0 0 * * 2-5",
  async () => {
    const keys = kv.list({ prefix: ["notifiedId"] });
    for await (const entry of keys) {
      await kv.delete(entry.key);
    }
  },
);

export { sendToChat, sendToEmail, shouldNotify };
