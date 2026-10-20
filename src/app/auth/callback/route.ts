import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const requestedType = request.nextUrl.searchParams.get("type");
  const allowedOtpTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
  const otpType = allowedOtpTypes.find((type) => type === requestedType);
  const supabase = createClient();
  let error;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && otpType) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType }));
  } else {
    return NextResponse.redirect(new URL("/login?error=confirmacion", request.url));
  }
  if (error) return NextResponse.redirect(new URL("/login?error=confirmacion", request.url));

  const requestedPath = request.nextUrl.searchParams.get("next");
  const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : otpType === "invite"
      ? "/auth/accept-invite"
      : "/onboarding";
  return NextResponse.redirect(new URL(nextPath, request.url));
}