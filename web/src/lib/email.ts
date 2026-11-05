import "server-only";

type Message = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail({ to, subject, text }: Message) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    console.warn("Email is not configured, skipping:", subject);
    return false;
  }

  // While there is no verified domain, everything goes to one test inbox
  const redirect = process.env.EMAIL_REDIRECT_TO?.trim();
  const finalTo = redirect || to;
  const finalSubject = redirect ? `[to: ${to}] ${subject}` : subject;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [finalTo],
      subject: finalSubject,
      text,
    }),
  });

  if (!res.ok) {
    console.error("Email failed:", res.status, await res.text());
    return false;
  }

  return true;
}