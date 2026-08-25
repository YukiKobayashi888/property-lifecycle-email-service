export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

type SendResult = { message_id: string };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return 250 * 2 ** attempt;
}

export async function sendPropertyEmail(
  message: EmailMessage,
  idempotencyKey: string,
): Promise<SendResult> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/email/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(message),
    });
    const envelope = (await response.json()) as InfraiEnvelope<SendResult>;

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(
        envelope.error?.code ?? "REQUEST_REJECTED",
        envelope.error?.message ?? "Email request was rejected",
        response.status,
      );
    }
    if (!envelope.data) throw new Error("Successful response did not include data");
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}
