import { expect, test } from "@playwright/test";
import { registerOwner } from "./helpers";

test("所有者可以维护家庭时区和常用分类", async ({ page }) => {
  await registerOwner(page, "设置验收");
  await page.getByRole("link", { name: "设置" }).click();
  await expect(page.getByRole("heading", { name: "通用设置" })).toBeVisible();
  await expect(page.getByText("人民币（CNY）")).toBeVisible();
  await page.getByLabel("家庭时区").selectOption("Asia/Urumqi");
  await expect(page.getByText("时区设置已保存。")).toBeVisible();
  await page.getByLabel("新分类名称").fill("夜市长分类验收");
  await page.getByRole("button", { name: "添加" }).click();
  await expect(page.getByText("夜市长分类验收")).toBeVisible();
  const row = page.locator(".category-row").filter({ hasText: "夜市长分类验收" });
  await row.getByRole("button", { name: "停用" }).click();
  await expect(row.getByText("已停用")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
