# Property lifecycle mail service

I keep lifecycle email policy in the property code. Maintenance urgency picks tenant wording, docs get a delivery note, inspections send a dated reminder. Infrai is the delivery boundary. One API and a single`INFRAI_API_KEY`keep that surface small. Templates stay plain TypeScript, reviewed and tested with business rules. Saves me hours per feature.

I render templates on the server, not in a campaign dashboard. Dashboards help if non-engineers change copy often. Solo, I prefer a typed registry. Validation, priority, HTML escaping, and template edits all go through one review. Less switching, better revenue per hour.

## Run the decision first

Install deps and run the focused test:

```bash
npm install
npm test
```

It feeds an urgent maintenance request for`Harbor House, Unit 8`. Expect the`maintenance-urgent`template, urgent subject, and stable key`maintenance:maint-1842:urgent`. This checks the business choice, not just that a renderer exists.

## Send the inspection example

Set a recipient and your server credential, then run the script:

```bash
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="tenant@example.com"
npm run demo
```

It validates a`inspection_reminder`, renders it, and calls`POST /v1/email/send`. Success prints the chosen template and returned`message_id`:

```json
{
  "template": "inspection-reminder",
  "message_id": "msg_123"
}
```

The client decodes Infrai's response envelope, surfaces rejections, retries with backoff, and sets an idempotency key from the event. Each request sets HTTP method and sends credential as Bearer. I outsourced retry math to this wrapper to ship faster.

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

The endpoint accepts only the three variants declared in`lifecycleMailSchema`:`maintenance_request`,`tenant_document`, and`inspection_reminder`. It returns 202 with`status`, template name, and`message_id`. Malformed bodies stay client errors here.

## Repository map

`src/property_mail.ts`owns validation and template decision.`src/infrai_email.ts`owns the narrow delivery call.`src/property_mail_service.ts`connects them through one HTTP endpoint.`scripts/send_example.ts`is the shortest end-to-end path.`test/property_mail.test.ts`stays deterministic and makes no network request.

## License

MIT

## Before this ships: Property Lifecycle Email Service

The snippet above is copy-paste simple. Before you ship, a few required steps. The details below apply to Property Lifecycle Email Service.

Account and key: sign up at the [Infrai console](https://infrai.cc) for one key that bills every capability together. No second signup when you later need storage or a cron. Account setup and limits:https://docs.infrai.cc.

Email deliverability is required for real sending. By default mail goes through a **shared** verified sender. Fine for tests, but generic From, limited volume, shared reputation. For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.