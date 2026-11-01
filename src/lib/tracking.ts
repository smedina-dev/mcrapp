export function trackingUrl(token: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/s/${token}`;
}

// Normaliza a formato internacional para wa.me (asume Argentina si no trae código de país).
export function whatsappLink(phone: string | null | undefined, message: string) {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  digits = digits.replace(/^00/, "");
  if (!digits.startsWith("54")) digits = `54${digits.replace(/^0/, "").replace(/^(\d{2,4})15/, "$1")}`;
  if (digits.startsWith("54") && !digits.startsWith("549")) digits = `549${digits.slice(2)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function trackingMessage(customerName: string, orderNumber: number, url: string, workshopName?: string) {
  return `Hola ${customerName}! Podés seguir el estado de tu bicicleta (OT-${orderNumber}) en tiempo real desde este link: ${url}${workshopName ? ` — ${workshopName}` : ""}`;
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

export async function sendTrackingEmail(params: { to: string; customerName: string; orderNumber: number; url: string; workshopName?: string; note?: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false as const, reason: "sin-configurar" as const };
  const from = process.env.RESEND_FROM?.trim() || "Taller <onboarding@resend.dev>";
  const name = escapeHtml(params.customerName);
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2a24">
    <h2>Hola ${name}</h2>
    <p>${params.note ? escapeHtml(params.note) : `Ya estamos trabajando en tu bicicleta (OT-${params.orderNumber}).`}</p>
    <p>Podés ver el estado en tiempo real, las fotos y responder consultas desde este link:</p>
    <p><a href="${params.url}" style="display:inline-block;background:#0f6b4b;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Ver estado de mi bicicleta</a></p>
    <p style="font-size:12px;color:#748079">${escapeHtml(params.workshopName ?? "")}</p></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [params.to], subject: `Seguimiento de tu bicicleta · OT-${params.orderNumber}`, html }),
    });
    if (!response.ok) {
      console.error("Resend rechazó el email de seguimiento.", { status: response.status });
      return { ok: false as const, reason: "error" as const };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("No se pudo enviar el email de seguimiento.", error instanceof Error ? error.message : error);
    return { ok: false as const, reason: "error" as const };
  }
}
