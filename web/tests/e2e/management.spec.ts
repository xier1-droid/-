import { expect, test } from "@playwright/test";

test("所有者可以新增并修改摊位", async ({ page }) => {
  const email = `management-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await page.getByLabel("家庭商户名称").fill("成员管理验收商户");
  await page.getByLabel("第一个摊位名称").fill("主摊位");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("Management2026!");
  await page.getByRole("button", { name: "创建家庭商户" }).click();
  await page.getByRole("button", { name: "设置" }).click();
  await page.getByRole("link", { name: /成员与摊位/ }).click();
  await expect(page.getByRole("heading", { name: "成员与摊位" })).toBeVisible();
  await expect(page.getByText(email + "（我）")).toBeVisible();

  await page.getByRole("button", { name: "新增摊位" }).click();
  await page.getByLabel("摊位名称").fill("夜市摊位");
  await page.getByRole("button", { name: "创建摊位" }).click();
  await expect(page.getByText("摊位创建成功。")).toBeVisible();
  await expect(page.getByText("夜市摊位")).toBeVisible();

  await page.locator(".management-row").filter({ hasText: "夜市摊位" }).getByRole("button", { name: "改名" }).click();
  await page.getByRole("textbox", { name: "摊位名称" }).fill("晚餐摊位");
  await page.getByRole("button", { name: "保存名称" }).click();
  await expect(page.getByText("摊位名称更新成功。")).toBeVisible();
  await expect(page.getByText("晚餐摊位")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("heading", { name: "成员与摊位" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
