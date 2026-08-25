import assert from "node:assert/strict";
import test from "node:test";
import { lifecycleMailSchema, prepareLifecycleMail } from "../src/property_mail.js";

test("urgent maintenance selects the urgent tenant template", () => {
  const request = lifecycleMailSchema.parse({
    kind: "maintenance_request",
    requestId: "maint-1842",
    tenantEmail: "tenant@example.com",
    tenantName: "Jordan Lee",
    propertyName: "Harbor House, Unit 8",
    issue: "Water under the kitchen sink",
    priority: "urgent",
  });

  const prepared = prepareLifecycleMail(request);

  assert.equal(prepared.template, "maintenance-urgent");
  assert.equal(prepared.message.subject, "Urgent maintenance update for Harbor House, Unit 8");
  assert.match(prepared.message.html, /Urgent request received/);
  assert.equal(prepared.idempotencyKey, "maintenance:maint-1842:urgent");
});
