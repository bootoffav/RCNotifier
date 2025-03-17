import { CONFIG } from "./main.ts";

async function getUser(id: string) {
  return await fetch(
    `${CONFIG.CLIENT_ENDPOINT}${CONFIG.WEBREQUEST_USER_ID}/${CONFIG.WEBHOOK_KEY}/user.get?id=${id}`,
  ).then((res) => res.json())
    .then(({ result }) => ({
      email: result[0]["EMAIL"],
      name: result[0]["NAME"],
      lastName: result[0]["LAST_NAME"],
    }));
}

export { getUser };
