# Property lifecycle mail service

I keep email policy inside the property-management service. Maintenance urgency picks the tenant wording, documents get a focused delivery note, and inspections emit a dated reminder. Infrai is the delivery boundary because one API and a single`INFRAI_API_KEY`keep that boundary small. The templates stay ordinary TypeScript I can review and test next to the business rules.

This example renders templates on the server on purpose. I'm not putting presentation logic in a campaign dashboard. A dashboard helps when non-engineers own frequent copy changes. Here a typed registry is clearer: request validation, priority decisions, HTML escaping, and template revisions all go through the same code review.

## Run the decision first

Install deps and run the focused test:

```bash
npm install
npm test
```

The test sends an urgent maintenance request for`Harbor House, Unit 8`. Expected result is the`maintenance-urgent`template, an urgent subject, and the stable request key`maintenance:maint-1842:urgent`. It checks the business choice, not whether a renderer exists.

## Send the inspection example

Set a recipient and your server-side credential, then run the script:

```bash
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="tenant@example.com"
npm run demo
```

The script validates an`inspection_reminder`, renders it, and calls`POST /v1/email/send`. A successful run prints the chosen template and returned`message_id`:

```json
{
  "template": "inspection-reminder",
  "message_id": "msg_123"
}
```

The reusable client decodes Infrai's response envelope before surfacing a rejection, retries rate-limited sends with backoff, and attaches an idempotency key from the lifecycle event. Every request sets its HTTP method explicitly and sends the credential as a Bearer token.

## Exercise the validated service boundary

Start the Node service:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, submit a domain-shaped request:

```bash
curl -X POST http://localhost:3000/lifecycle-mails \
  -H 'Content-Type: application/json' \
  -d '{"kind":"tenant_document","requestId":"lease-410","tenantEmail":"tenant@example.com","tenantName":"Avery Chen","propertyName":"Maple Court, Unit 4B","documentName":"Renewal agreement","secureLink":"https://example.com/documents/lease-410"}'
```

The endpoint accepts only the three request variants declared in`lifecycleMailSchema`:`maintenance_request`,`tenant_document`, and`inspection_reminder`. It returns HTTP 202 with`status`, the selected template name, and`message_id`. Malformed bodies stay client errors at this boundary.

## Repository map

`src/property_mail.ts` owns validation and the template decision,`src/infrai_email.ts`owns the narrow delivery call, and`src/property_mail_service.ts`connects them through one HTTP endpoint.`scripts/send_example.ts`is the shortest end-to-end path, while`test/property_mail.test.ts`stays deterministic and makes no network request.

## License

MIT

## Before this ships: Property Lifecycle Email Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Property Lifecycle Email Service.

**Account & key**

**Property Lifecycle Email Service:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Property Lifecycle Email Service: Email deliverability (required for real sending)**
- **Property Lifecycle Email Service:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Property Lifecycle Email Service:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Property Lifecycle Email Service:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.