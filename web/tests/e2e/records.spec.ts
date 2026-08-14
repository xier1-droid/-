import { expect, test } from "@playwright/test";

test("所有者可以筛选、编辑并软删除账目", async ({ page }) => {
  const email = `records-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await page.getByLabel("家庭商户名称").fill("端到端验收商户");
  await page.getByLabel("第一个摊位名称").fill("端到端摊位");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("RecordsTest2026!");
  await page.getByRole("button", { name: "创建家庭商户" }).click();
  await expect(page.getByRole("heading", { name: "今天生意怎么样？" })).toBeVisible();

  await page.getByLabel("选择摊位").selectOption({ label: "端到端摊位" });
  await page.getByRole("button", { name: "＋ 记一笔" }).click();
  await page.getByLabel("金额（元）").fill("25.50");
  await page.getByLabel("分类").fill("端到端早餐");
  await page.getByRole("button", { name: "保存账目" }).click();
  await page.getByRole("link", { name: "账目", exact: true }).click();

  await expect(page.getByText("端到端早餐")).toBeVisible();
  await page.getByLabel("收支类型").selectOption("INCOME");
  await page.getByLabel("收付款方式").selectOption("WECHAT");
  await expect(page.getByText("端到端早餐")).toBeVisible();

  await page.getByRole("button", { name: "编辑" }).click();
  await page.getByLabel("金额（元）").fill("30.00");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByText("+¥30.00")).toBeVisible();

  await page.getByRole("button", { name: "删除" }).click();
  await expect(page.getByRole("dialog", { name: "确认删除账目" })).toContainText("+¥30.00");
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText("账目删除成功。")).toBeVisible();
  await expect(page.getByText("端到端早餐")).toHaveCount(0);
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
