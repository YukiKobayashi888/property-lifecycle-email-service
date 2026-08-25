import { sendPropertyEmail } from "../src/infrai_email.js";
import { lifecycleMailSchema, prepareLifecycleMail } from "../src/property_mail.js";

const input = lifecycleMailSchema.parse({
  kind: "inspection_reminder",
  requestId: "inspection-2026-09-14-unit-4b",
  tenantEmail: process.env.DEMO_EMAIL_TO,
  tenantName: "Avery Chen",
  propertyName: "Maple Court, Unit 4B",
  inspectionDate: "2026-09-14",
});

const prepared = prepareLifecycleMail(input);
const result = await sendPropertyEmail(prepared.message, prepared.idempotencyKey);
console.log(JSON.stringify({ template: prepared.template, message_id: result.message_id }, null, 2));
