import { groupBy } from "jsr:@es-toolkit/es-toolkit";

import type { Task } from "./types.ts";

import { formMessageBody, getUser } from "./utils.ts";
import { CONFIG } from "./main.ts";
import { getTasks } from "./endpoint.ts";

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
      // cc: [{ email: "vit@xmtextiles.com", name: "Vitaly Aliev" }],
      subject,
      htmlContent,
    }),
    headers: {
      "content-type": "application/json",
      "api-key": Deno.env.get("BREVO_API_KEY") || "",
    },
  });
}

Deno.cron(
  "Send daily email reminders",
  // "30 13 * * 2-5",
  "*/3 * * * *",
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
      const { name, email } = await getUser(responsibleId);
      sendToEmail(
        `this week web-requests (${name})`,
        formMessageBody("reminder", tasks),
        { name: "Aleksei Butov", email: "admin@xmtextiles.com" },
      );
    }
  },
);

export { sendToChat, sendToEmail };
