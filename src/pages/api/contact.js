const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

export async function POST({ request, locals }) {
  const env = locals.runtime.env;

  // Only accept form submissions from your own website.
  const origin = request.headers.get("Origin");
  const allowedOrigin = new URL(request.url).origin;

  if (origin && origin !== allowedOrigin) {
    return json({ error: "Invalid request origin." }, 403);
  }

  let form;

  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid form submission." }, 400);
  }

  // Honeypot: bots may fill this hidden field; real visitors should leave it empty.
  if (String(form.get("website") || "").trim()) {
    return json({ success: true });
  }

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const company = String(form.get("company") || "").trim();
  const service = String(form.get("service") || "").trim();
  const message = String(form.get("message") || "").trim();

  const turnstileToken = String(
    form.get("cf-turnstile-response") || ""
  ).trim();

  // Validate fields on the server, even if the browser validates them too.
  if (
    !name ||
    !email ||
    !message ||
    name.length > 120 ||
    email.length > 254 ||
    company.length > 160 ||
    service.length > 120 ||
    message.length > 5000 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return json(
      { error: "Please check your details and try again." },
      400
    );
  }

  if (!env.TURNSTILE-SECRET-KEY || !turnstileToken) {
    return json(
      {
        error:
          "Spam protection could not be verified. Please try again.",
      },
      400
    );
  }

  // Verify Turnstile on the server; the browser widget alone is not enough.
  let verification;

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE-SECRET-KEY,
          response: turnstileToken,
          remoteip:
            request.headers.get("CF-Connecting-IP") || undefined,
        }),
      }
    );

    verification = await response.json();
  } catch {
    return json(
      { error: "Spam protection is temporarily unavailable." },
      503
    );
  }

  if (!verification.success) {
    return json(
      {
        error:
          "Spam check failed. Please refresh the page and try again.",
      },
      400
    );
  }

  if (
    !env.RESEND-API-KEY ||
    !env.CONTACT-TO-EMAIL ||
    !env.CONTACT-FROM-EMAIL
  ) {
    return json(
      { error: "The contact form is not configured yet." },
      500
    );
  }

  const safe = (value) => value.replace(/[\r\n]+/g, " ").trim();

  const subject = `Website inquiry from ${safe(name)}`;

  const text = [
    "New inquiry from the Rutledge Digital website",
    "",
    `Name: ${safe(name)}`,
    `Email: ${safe(email)}`,
    `Company: ${safe(company) || "Not provided"}`,
    `Service: ${safe(service) || "Not specified"}`,
    "",
    "Message:",
    message,
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND-API-KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Rutledge Digital Website <${env.CONTACT-FROM-EMAIL}>`,
        to: [env.CONTACT-TO-EMAIL],
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      // Keep provider details and credentials out of the public response.
      console.error("Resend email delivery failed:", response.status);

      return json(
        {
          error:
            "We couldn't send your message. Please try again later.",
        },
        502
      );
    }

    return json({
      success: true,
      message:
        "Thanks! Your message has been sent. We'll be in touch soon.",
    });
  } catch {
    return json(
      { error: "Email delivery is temporarily unavailable." },
      502
    );
  }
}