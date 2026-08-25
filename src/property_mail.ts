import { z } from "zod";
import type { EmailMessage } from "./infrai_email.js";

const common = {
  requestId: z.string().min(1),
  tenantEmail: z.string().email(),
  tenantName: z.string().min(1),
  propertyName: z.string().min(1),
};

export const lifecycleMailSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("maintenance_request"),
    ...common,
    issue: z.string().min(1),
    priority: z.enum(["routine", "urgent"]),
  }),
  z.object({
    kind: z.literal("tenant_document"),
    ...common,
    documentName: z.string().min(1),
    secureLink: z.string().url(),
  }),
  z.object({
    kind: z.literal("inspection_reminder"),
    ...common,
    inspectionDate: z.string().date(),
  }),
]);

export type LifecycleMail = z.infer<typeof lifecycleMailSchema>;

export type PreparedMail = {
  template: "maintenance-routine" | "maintenance-urgent" | "tenant-document" | "inspection-reminder";
  idempotencyKey: string;
  message: EmailMessage;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  })[character] ?? character);

export function prepareLifecycleMail(input: LifecycleMail): PreparedMail {
  const tenant = escapeHtml(input.tenantName);
  const property = escapeHtml(input.propertyName);

  if (input.kind === "maintenance_request") {
    const urgent = input.priority === "urgent";
    return {
      template: urgent ? "maintenance-urgent" : "maintenance-routine",
      idempotencyKey: `maintenance:${input.requestId}:${input.priority}`,
      message: {
        to: input.tenantEmail,
        subject: urgent ? `Urgent maintenance update for ${input.propertyName}` : `Maintenance request received for ${input.propertyName}`,
        html: `<h1>${urgent ? "Urgent request received" : "Request received"}</h1><p>Hello ${tenant}, we logged “${escapeHtml(input.issue)}” for ${property}.</p>`,
      },
    };
  }

  if (input.kind === "tenant_document") {
    return {
      template: "tenant-document",
      idempotencyKey: `document:${input.requestId}`,
      message: {
        to: input.tenantEmail,
        subject: `${input.documentName} for ${input.propertyName}`,
        html: `<h1>Your document is ready</h1><p>Hello ${tenant}, open ${escapeHtml(input.documentName)} for ${property}: <a href="${escapeHtml(input.secureLink)}">view document</a>.</p>`,
      },
    };
  }

  return {
    template: "inspection-reminder",
    idempotencyKey: `inspection:${input.requestId}:${input.inspectionDate}`,
    message: {
      to: input.tenantEmail,
      subject: `Inspection reminder for ${input.propertyName}`,
      html: `<h1>Inspection reminder</h1><p>Hello ${tenant}, the inspection at ${property} is scheduled for ${escapeHtml(input.inspectionDate)}.</p>`,
    },
  };
}
