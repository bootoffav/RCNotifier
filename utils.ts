import { CONFIG } from "./main.ts";
import type { Task } from "./types.ts";

function getUser(id: string) {
  return fetch(
    `${CONFIG.CLIENT_ENDPOINT}/${CONFIG.WEBREQUEST_USER_ID}/${CONFIG.WEBHOOK_KEY}/user.get?id=${id}`,
  ).then((res) => res.json())
    .then(({ result }) => ({
      email: `${result[0]["EMAIL"]}`,
      name: `${result[0]["NAME"]} ${result[0]["LAST_NAME"]}`,
    }));
}

function user_optedout_from_email_notification(id: string) {
  const OPTEDOUT_USER_IDS = ["1606", CONFIG.WEBREQUEST_USER_ID];
  return (OPTEDOUT_USER_IDS.includes(id));
}

function formMessageBody(
  formFor: "reminder" | "changer",
  payload: Task[] | string,
) {
  return (formFor === "reminder")
    ? `<html><head></head><body>${
      (payload as Task[]).reduce((acc, { id, title }, ind) =>
        acc +
        `<p>${
          ind + 1
        }. <a href="https://xmtextiles.bitrix24.eu/company/personal/user/${CONFIG.WEBREQUEST_USER_ID}\
      /tasks/task/view/${id}/">${title}</a></p>`, "")
    }</body></html>`
    : `<html><body><a href="https://xmtextiles.bitrix24.eu/company/personal/user/${CONFIG.WEBREQUEST_USER_ID}/tasks/task/view/${CONFIG.TASK_ID}/">${payload}</a></body></html>`;
}

export { formMessageBody, getUser, user_optedout_from_email_notification };
