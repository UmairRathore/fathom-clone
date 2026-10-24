import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emailDeliveryReady,
  mailConfiguration,
  gmailTransportOptions,
  sendAuthMail,
} from "../src/lib/auth-mail";
const env = {
  AUTH_EMAIL_PROVIDER: "gmail",
  SMTP_USER: "sender@gmail.com",
  AUTH_EMAIL_FROM: "sender@gmail.com",
  SMTP_PASS: "abcdefghijklmnop",
  AUTH_EMAIL_ENABLED: "true",
  AUTH_EMAIL_DELIVERY_VERIFIED: "true",
};
test("Gmail email gates require verified delivery, valid app credentials and matching sender", () => {
  assert(emailDeliveryReady(env));
  for (const change of [
    { AUTH_EMAIL_ENABLED: "false" },
    { AUTH_EMAIL_DELIVERY_VERIFIED: "false" },
    { SMTP_PASS: "" },
    { SMTP_PASS: "normal-password" },
    { AUTH_EMAIL_FROM: "other@gmail.com" },
    { SMTP_USER: "sender@example.com" },
    { AUTH_EMAIL_PROVIDER: "unknown" },
  ])
    assert(!emailDeliveryReady({ ...env, ...change }));
  assert.equal(mailConfiguration({ ...env, SMTP_PASS: "abcd efgh ijkl mnop" })?.provider, "gmail");
  assert(
    emailDeliveryReady({
      AUTH_EMAIL_ENABLED: "true",
      AUTH_EMAIL_DELIVERY_VERIFIED: "true",
      RESEND_API_KEY: "test",
      AUTH_EMAIL_FROM: "sender@example.com",
    }),
  );
});
test("Gmail SMTP uses validated implicit TLS, bounded timeouts and no credential logging", () => {
  const options = gmailTransportOptions({ user: env.SMTP_USER, pass: env.SMTP_PASS });
  assert.equal(options.host, "smtp.gmail.com");
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.equal(options.tls.rejectUnauthorized, true);
  assert.equal(options.tls.minVersion, "TLSv1.2");
  assert.equal(options.logger, false);
  assert.equal(options.debug, false);
  assert(options.disableFileAccess && options.disableUrlAccess);
});
test("SMTP sends one auth email without attachments, closes transport and sanitizes failures", async () => {
  let closed = 0,
    sent = 0;
  const mail = {
    to: "recipient@gmail.com",
    subject: "Verify your Sounding email",
    url: "https://preview.example/verify?token=private-fixture",
  };
  await sendAuthMail(mail, env, () => ({
    async sendMail(message) {
      sent++;
      assert.equal(message.from, env.SMTP_USER);
      assert.equal(message.to, mail.to);
      assert(message.text.includes(mail.url));
      assert(message.disableFileAccess && message.disableUrlAccess);
      return { accepted: [mail.to], rejected: [] };
    },
    close() {
      closed++;
    },
  }));
  assert.equal(sent, 1);
  assert.equal(closed, 1);
  await assert.rejects(
    sendAuthMail(mail, env, () => ({
      async sendMail() {
        throw new Error("private-provider-detail");
      },
      close() {
        closed++;
      },
    })),
    { message: "Email delivery failed. Please try again later." },
  );
  await assert.rejects(
    sendAuthMail(mail, env, () => ({
      async sendMail() {
        return { accepted: [], rejected: [mail.to] };
      },
      close() {
        closed++;
      },
    })),
    { message: "Email delivery failed. Please try again later." },
  );
  assert.equal(closed, 3);
  await assert.rejects(sendAuthMail({ ...mail, to: "one@gmail.com,two@gmail.com" }, env), {
    message: "Invalid email request.",
  });
  await assert.rejects(sendAuthMail({ ...mail, subject: "Subject\r\nInjected: header" }, env), {
    message: "Invalid email request.",
  });
});
