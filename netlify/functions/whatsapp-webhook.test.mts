import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

const verifyToken = "test-verify-token";
const appSecret = "test-app-secret";

process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = verifyToken;
process.env.META_APP_SECRET = appSecret;

const { default: webhook } = await import("./whatsapp-webhook.mts");

function request(path = "", init?: RequestInit): Request {
  return new Request(`https://example.com/api/webhooks/whatsapp${path}`, init);
}

function signedRequest(payload: unknown): Request {
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest("hex");

  return request("", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": `sha256=${signature}`,
    },
  });
}

test("accepts a valid webhook verification challenge", async () => {
  const response = await webhook(
    request(
      `?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=12345`,
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "12345");
});

test("rejects a webhook verification request with the wrong token", async () => {
  const response = await webhook(
    request(
      "?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345",
    ),
  );

  assert.equal(response.status, 403);
});

test("rejects a POST without a Meta signature", async () => {
  const response = await webhook(
    request("", {
      method: "POST",
      body: JSON.stringify({ object: "whatsapp_business_account" }),
    }),
  );

  assert.equal(response.status, 401);
  assert.equal(await response.text(), "Invalid signature");
});

test("rejects a POST with an invalid Meta signature", async () => {
  const response = await webhook(
    request("", {
      method: "POST",
      body: JSON.stringify({ object: "whatsapp_business_account" }),
      headers: {
        "x-hub-signature-256": `sha256=${"0".repeat(64)}`,
      },
    }),
  );

  assert.equal(response.status, 401);
});

test("accepts a correctly signed WhatsApp payload", async () => {
  const response = await webhook(
    signedRequest({
      object: "whatsapp_business_account",
      entry: [],
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
});

test("acknowledges and ignores a correctly signed unrelated payload", async () => {
  const response = await webhook(
    signedRequest({
      object: "page",
      entry: [],
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, ignored: true });
});