import { assert, assertFalse } from "jsr:@std/assert";
import { user_optedout_from_email_notification } from "./main.ts";

Deno.test("user_optedout_from_emails", () => {
  assertFalse(user_optedout_from_email_notification("19")); //
  assert(user_optedout_from_email_notification("1606")); // Sanjay Thakur id
});
