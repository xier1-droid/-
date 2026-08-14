import { expect, type Page } from "@playwright/test";

export const testPassword = "Permissions2026!";

export async function registerOwner(page: Page, prefix: string) {
  const email = `owner-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await page.getByRole("button", { name: "邮箱注册" }).click();
  await page.getByLabel("家庭商户名称").fill(`${prefix}家庭商户`);
  await page.getByLabel("第一个摊位名称").fill("主摊位");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(testPassword);
  await page.locator("form").getByRole("button", { name: "创建账号" }).click();
  await expect(page.getByRole("heading", { name: "今天生意怎么样？" })).toBeVisible();
  return email;
}

export async function api<T>(page: Page, url: string, init?: { method?: string; body?: unknown }) {
  return page.evaluate(async ({ url, init }) => {
    const response = await fetch(url, { method: init?.method, headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" }, body: init?.body === undefined ? undefined : JSON.stringify(init.body) });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { url, init }) as Promise<{ status: number; body: T }>;
}
