import { expect, test } from "@playwright/test";
import { api, registerOwner, testPassword } from "./helpers";

test("跨账号角色、摊位授权和成员移除立即生效", async ({ browser, page }) => {
  test.setTimeout(120_000);
  await registerOwner(page, "权限验收");
  const bootstrap = await api<{ organization: { id: string; name: string }; stores: { id: string; name: string }[] }>(page, "/api/organizations/current");
  const organizationId = bootstrap.body.organization.id;
  const mainStore = bootstrap.body.stores[0];
  const secondStoreResponse = await api<{ store: { id: string; name: string } }>(page, "/api/stores", { method: "POST", body: { organizationId, name: "副摊位" } });
  expect(secondStoreResponse.status).toBe(201);
  const secondStore = secondStoreResponse.body.store;
  const invitationResponse = await api<{ invitation: { code: string } }>(page, `/api/organizations/current/invitations?organizationId=${organizationId}`, { method: "POST", body: { targetRole: "BOOKKEEPER", storeIds: [mainStore.id] } });
  expect(invitationResponse.status).toBe(201);

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  const memberEmail = `invited-${Date.now()}@example.com`;
  await memberPage.goto("/");
  await memberPage.getByRole("button", { name: "创建账号", exact: true }).click();
  await memberPage.getByLabel("邮箱").fill(memberEmail);
  await memberPage.getByLabel("密码").fill(testPassword);
  await memberPage.getByLabel("家庭邀请码（选填）").fill(invitationResponse.body.invitation.code);
  await memberPage.getByRole("button", { name: "创建家庭商户" }).click();
  await expect(memberPage.getByText(bootstrap.body.organization.name)).toBeVisible();
  const invitedBootstrap = await api<{ organization: { id: string }; member: { role: string }; stores: { id: string }[] }>(memberPage, "/api/organizations/current");
  expect(invitedBootstrap.body.organization.id).toBe(organizationId);
  expect(invitedBootstrap.body.member.role).toBe("BOOKKEEPER");
  expect(invitedBootstrap.body.stores.map((store) => store.id)).toEqual([mainStore.id]);

  const members = await api<{ members: { id: string; email: string }[] }>(page, `/api/organizations/current/members?organizationId=${organizationId}`);
  const ownerMember = members.body.members.find((member) => member.email !== memberEmail)!;
  const member = members.body.members.find((item) => item.email === memberEmail)!;
  const selfChange = await api(page, `/api/organization-members/${ownerMember.id}`, { method: "PATCH", body: { role: "ADMIN", storeIds: [mainStore.id] } });
  expect(selfChange.status).toBe(422);
  const promoteOwner = await api(page, `/api/organization-members/${member.id}`, { method: "PATCH", body: { role: "OWNER", storeIds: [mainStore.id] } });
  expect(promoteOwner.status).toBe(422);

  const occurredAt = new Date().toISOString();
  const ownerEntry = await api<{ entry: { id: string } }>(page, "/api/ledger-entries", { method: "POST", body: { storeId: mainStore.id, type: "INCOME", amountFen: 1200, paymentMethod: "CASH", category: "权限测试", occurredAt } });
  expect(ownerEntry.status).toBe(201);

  await api(page, `/api/organization-members/${member.id}`, { method: "PATCH", body: { role: "ADMIN", storeIds: [mainStore.id] } });
  await memberPage.reload();
  await expect(memberPage.getByRole("button", { name: "设置" })).toBeVisible();
  expect((await api(memberPage, `/api/ledger-entries/${ownerEntry.body.entry.id}`, { method: "DELETE" })).status).toBe(200);
  expect((await api(memberPage, "/api/stores", { method: "POST", body: { organizationId, name: "越权摊位" } })).status).toBe(403);

  const bookkeeperEntry = await api<{ entry: { id: string } }>(page, "/api/ledger-entries", { method: "POST", body: { storeId: mainStore.id, type: "INCOME", amountFen: 1800, paymentMethod: "WECHAT", category: "记账员测试", occurredAt } });
  await api(page, `/api/organization-members/${member.id}`, { method: "PATCH", body: { role: "BOOKKEEPER", storeIds: [mainStore.id] } });
  await memberPage.reload();
  expect((await api(memberPage, `/api/ledger-entries/${bookkeeperEntry.body.entry.id}`, { method: "PATCH", body: { type: "INCOME", amountFen: 1900, paymentMethod: "WECHAT", category: "记账员已编辑", occurredAt, note: null } })).status).toBe(200);
  const bookkeeperDelete = await api<{ error: { code: string } }>(memberPage, `/api/ledger-entries/${bookkeeperEntry.body.entry.id}`, { method: "DELETE" });
  expect(bookkeeperDelete.status).toBe(403);
  expect(bookkeeperDelete.body.error.code).toBe("FORBIDDEN_DELETE");
  const closingDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  expect((await api(memberPage, `/api/daily-closing/${closingDate}`, { method: "PUT", body: { storeId: mainStore.id, openingCashFen: 0, actualClosingCashFen: 1900, note: null } })).status).toBe(200);

  await api(page, `/api/organization-members/${member.id}`, { method: "PATCH", body: { role: "VIEWER", storeIds: [mainStore.id] } });
  await memberPage.reload();
  await expect(memberPage.getByRole("button", { name: "＋ 记一笔" })).toBeDisabled();
  expect((await api(memberPage, "/api/ledger-entries", { method: "POST", body: { storeId: mainStore.id, type: "INCOME", amountFen: 100, paymentMethod: "CASH", category: "越权", occurredAt } })).status).toBe(403);
  expect((await api(memberPage, `/api/daily-closing/${closingDate}`, { method: "PUT", body: { storeId: mainStore.id, openingCashFen: 0, actualClosingCashFen: 0, note: null } })).status).toBe(403);
  const forbiddenStore = await api<{ error: { code: string } }>(memberPage, `/api/ledger-entries?organizationId=${organizationId}&storeId=${secondStore.id}&from=${closingDate}&to=${closingDate}`);
  expect(forbiddenStore.status).toBe(403);
  expect(forbiddenStore.body.error.code).toBe("FORBIDDEN_STORE");

  await api(page, `/api/organization-members/${member.id}`, { method: "PATCH", body: { role: "VIEWER", storeIds: [secondStore.id] } });
  const revoked = await api<{ error: { code: string } }>(memberPage, `/api/ledger-entries?organizationId=${organizationId}&storeId=${mainStore.id}&from=${closingDate}&to=${closingDate}`);
  expect(revoked.status).toBe(403);
  expect(revoked.body.error.code).toBe("FORBIDDEN_STORE");

  expect((await api(page, `/api/organization-members/${member.id}`, { method: "DELETE" })).status).toBe(200);
  const removed = await api<{ error: { code: string } }>(memberPage, `/api/organizations/current/members?organizationId=${organizationId}`);
  expect(removed.status).toBe(403);
  expect(removed.body.error.code).toBe("MEMBER_REMOVED");
  await memberPage.reload();
  await expect(memberPage.getByText("你已被移出家庭商户，请联系所有者重新邀请。")).toBeVisible();
  await expect(memberPage.getByRole("button", { name: "登录并查看今日账目" })).toBeVisible();
  expect(await memberPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await memberPage.setViewportSize({ width: 1280, height: 800 });
  expect(await memberPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await memberContext.close();
});
