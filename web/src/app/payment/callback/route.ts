import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/paystack";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference =
    url.searchParams.get("reference") ?? url.searchParams.get("trxref");

  if (!reference) {
    return NextResponse.redirect(new URL("/dashboard/buyer?payment=error", url));
  }

  const result = await confirmPayment(reference);

  const outcome = !result.ok
    ? "failed"
    : result.message === "duplicate"
    ? "duplicate"
    : "success";

  return NextResponse.redirect(
    new URL(`/dashboard/buyer?payment=${outcome}`, url)
  );
}