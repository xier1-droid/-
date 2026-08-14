import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError(error.issues[0]?.message ?? "提交的数据不正确", 422, "VALIDATION_ERROR");
  }
  if (error instanceof Error) {
    return apiError(error.message, 400);
  }
  return apiError("服务暂时不可用，请稍后重试", 500, "INTERNAL_ERROR");
}
