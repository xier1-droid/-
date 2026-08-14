import { expect, test } from "@playwright/test";

const code = "246810";

test("手机号注册登录并通过短信重置密码", async ({ browser, page }) => {
  test.setTimeout(120_000);
  const phone = `139${String(Date.now()).slice(-8)}`;
  const password = "PhoneAuth2026!";
  const newPassword = "PhoneReset2026!";

  await page.goto("/");
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await page.getByLabel("家庭商户名称").fill("手机认证商户");
  await page.getByLabel("第一个摊位名称").fill("手机摊位");
  await page.getByLabel("手机号").fill(phone);
  await page.getByRole("button", { name: "获取验证码" }).click();
  await expect(page.getByText(/验证码已发送/)).toBeVisible();
  await page.getByLabel("短信验证码").fill(code);
  await page.getByLabel("密码").fill(password);
  await page.locator("form").getByRole("button", { name: "创建账号" }).click();
  await expect(page.getByRole("heading", { name: "今天生意怎么样？" })).toBeVisible();

  const staleContext = await browser.newContext();
  const stalePage = await staleContext.newPage();
  await stalePage.goto("/");
  await stalePage.getByLabel("手机号或邮箱").fill(phone);
  await stalePage.getByLabel("密码").fill(password);
  await stalePage.getByRole("button", { name: "登录并查看今日账目" }).click();
  await expect(stalePage.getByRole("heading", { name: "今天生意怎么样？" })).toBeVisible();

  await page.getByRole("button", { name: "设置" }).click();
  await page.getByRole("button", { name: "退出登录" }).click();
  await page.getByRole("button", { name: "忘记密码" }).click();
  await page.getByLabel("手机号").fill(phone);
  await page.getByRole("button", { name: "获取验证码" }).click();
  await page.getByLabel("短信验证码").fill(code);
  await page.getByLabel("新密码").fill(newPassword);
  await page.getByRole("button", { name: "重置密码" }).click();
  await expect(page.getByText(/密码已重置/)).toBeVisible();

  await stalePage.reload();
  await expect(stalePage.getByRole("button", { name: "登录并查看今日账目" })).toBeVisible();
  await page.getByLabel("手机号或邮箱").fill(phone);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录并查看今日账目" }).click();
  await expect(page.getByText("手机号、邮箱或密码不正确")).toBeVisible();
  await page.getByLabel("密码").fill(newPassword);
  await page.getByRole("button", { name: "登录并查看今日账目" }).click();
  await expect(page.getByRole("heading", { name: "今天生意怎么样？" })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await staleContext.close();
});
