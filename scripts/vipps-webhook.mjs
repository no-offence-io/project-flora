#!/usr/bin/env node
/*
 * Registers, lists or removes the Vipps webhook for this shop. Run with the keys of the
 * environment you mean (test keys talk to apitest.vipps.no, production keys to api.vipps.no):
 *
 *   set -a; source .env.local; set +a            # or export the VIPPS_* variables by hand
 *   node scripts/vipps-webhook.mjs list
 *   node scripts/vipps-webhook.mjs register https://www.prosjectflora.com/api/webhooks/vipps
 *   node scripts/vipps-webhook.mjs delete <id>
 *
 * `register` prints the secret exactly once: put it in Vercel as VIPPS_WEBHOOK_SECRET (sensitive).
 * Vipps allows a handful of webhooks per sales unit, so delete stale ones.
 */
const env = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
  return v;
};
const base = process.env.VIPPS_ENV === "production" ? "https://api.vipps.no" : "https://apitest.vipps.no";
const EVENTS = ["epayments.payment.authorized.v1", "epayments.payment.aborted.v1", "epayments.payment.expired.v1", "epayments.payment.terminated.v1", "epayments.payment.cancelled.v1", "epayments.payment.captured.v1", "epayments.payment.refunded.v1"];

async function token() {
  const res = await fetch(`${base}/accesstoken/get`, {
    method: "POST",
    headers: { client_id: env("VIPPS_CLIENT_ID"), client_secret: env("VIPPS_CLIENT_SECRET"), "Ocp-Apim-Subscription-Key": env("VIPPS_SUBSCRIPTION_KEY"), "Merchant-Serial-Number": env("VIPPS_MSN") },
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, "Ocp-Apim-Subscription-Key": env("VIPPS_SUBSCRIPTION_KEY"), "Merchant-Serial-Number": env("VIPPS_MSN"), "Content-Type": "application/json", "Vipps-System-Name": "flora-shop", "Vipps-System-Version": "1.0", "Vipps-System-Plugin-Name": "flora-nextjs", "Vipps-System-Plugin-Version": "1.0" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

const [cmd, arg] = process.argv.slice(2);
console.error(`Vipps ${process.env.VIPPS_ENV === "production" ? "PRODUCTION" : "test"} · sales unit ${env("VIPPS_MSN")}`);
if (cmd === "list") {
  const { webhooks = [] } = await call("GET", "/webhooks/v1/webhooks");
  if (!webhooks.length) console.log("No webhooks registered.");
  for (const w of webhooks) console.log(`${w.id}  ${w.url}\n   ${w.events.join(", ")}`);
} else if (cmd === "register" && arg) {
  if (!arg.startsWith("https://")) throw new Error("The webhook URL must be https");
  const { id, secret } = await call("POST", "/webhooks/v1/webhooks", { url: arg, events: EVENTS });
  console.log(`Registered ${id} for ${arg}\n\nVIPPS_WEBHOOK_SECRET=${secret}\n\nThis secret is shown once. Put it in Vercel (sensitive) and redeploy.`);
} else if (cmd === "delete" && arg) {
  await call("DELETE", `/webhooks/v1/webhooks/${encodeURIComponent(arg)}`);
  console.log(`Deleted ${arg}`);
} else {
  console.error("Usage: node scripts/vipps-webhook.mjs list | register <https url> | delete <id>");
  process.exit(1);
}
