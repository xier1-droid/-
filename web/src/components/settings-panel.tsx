"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Category = { id: string; type: "INCOME" | "EXPENSE"; name: string; sortOrder: number; isActive: boolean };
type SettingsData = { settings: { currency: string; timezone: string; timezoneLocked: boolean }; categories: Category[]; permissions: { canManageSettings: boolean } };
const timezoneLabel: Record<string, string> = { "Asia/Shanghai": "北京时间", "Asia/Urumqi": "乌鲁木齐时间" };

export function SettingsPanel({ organization, initial }: { organization: { id: string; name: string }; initial: SettingsData }) {
  const router = useRouter();
  const [data, setData] = useState(initial); const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME"); const [message, setMessage] = useState("");
  const canManage = data.permissions.canManageSettings;
  async function reload() { const response = await fetch("/api/organizations/current/settings?organizationId=" + organization.id); if (response.ok) setData(await response.json()); }
  async function updateTimezone(timezone: string) {
    if (!navigator.onLine) return setMessage("修改设置需要联网，请恢复网络后重试。");
    const response = await fetch("/api/organizations/current/settings?organizationId=" + organization.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timezone }) });
    const result = await response.json().catch(() => null); setMessage(response.ok ? "时区设置已保存。" : result?.error?.message ?? "时区保存失败。"); if (response.ok) await reload();
  }
  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!navigator.onLine) return setMessage("修改分类需要联网，请恢复网络后重试。"); const formElement = event.currentTarget; const form = new FormData(formElement);
    const response = await fetch("/api/ledger-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId: organization.id, type, name: form.get("name") }) });
    const result = await response.json().catch(() => null); setMessage(response.ok ? "分类已添加。" : result?.error?.message ?? "分类添加失败。"); if (response.ok) { formElement.reset(); await reload(); }
  }
  async function updateCategory(category: Category, patch: Partial<Category>) {
    if (!navigator.onLine) return setMessage("修改分类需要联网，请恢复网络后重试。");
    const response = await fetch("/api/ledger-categories/" + category.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const result = await response.json().catch(() => null); setMessage(response.ok ? "分类已更新。" : result?.error?.message ?? "分类更新失败。"); if (response.ok) await reload();
  }
  const categories = data.categories.filter((item) => item.type === type);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }
  return <main className="app-shell settings-shell"><header className="records-header"><div><p className="eyebrow">{organization.name}</p><h1>通用设置</h1></div><Link className="ghost records-home" href="/">返回首页</Link></header>
    {message && <p className={message.includes("已") ? "success-notice" : "notice"}>{message}</p>}
    <section className="settings-section"><h2>家庭商户</h2><div className="settings-list"><div><span>货币</span><strong>人民币（CNY）</strong></div><div><span>我的权限</span><strong>{canManage ? "所有者" : "只读成员"}</strong></div></div>
      <label className="settings-field">家庭时区<select aria-label="家庭时区" value={data.settings.timezone} disabled={!canManage || data.settings.timezoneLocked} onChange={(event) => void updateTimezone(event.target.value)}><option value="Asia/Shanghai">北京时间</option><option value="Asia/Urumqi">乌鲁木齐时间</option></select></label>
      <p className="settings-tip">{data.settings.timezoneLocked ? "已有账目或日结，时区已锁定，避免历史营业日变化。" : "当前：" + timezoneLabel[data.settings.timezone] + "。创建首笔账目或日结后将锁定。"}</p></section>
    <section className="settings-section"><div className="management-title"><div><h2>常用分类</h2><span>家庭共享</span></div></div><div className="segmented category-tabs"><button className={type === "INCOME" ? "selected income" : ""} onClick={() => setType("INCOME")}>收入</button><button className={type === "EXPENSE" ? "selected expense" : ""} onClick={() => setType("EXPENSE")}>支出</button></div>
      <div className="category-list">{categories.map((category, index) => <div className="category-row" key={category.id}><div><strong>{category.name}</strong><span>{category.isActive ? "使用中" : "已停用"}</span></div>{canManage && <div className="compact-actions"><button disabled={index === 0} title="上移" onClick={() => void updateCategory(category, { sortOrder: Math.max(0, categories[index - 1]?.sortOrder ?? 0) })}>↑</button><button title="改名" onClick={() => { const name = window.prompt("新的分类名称", category.name); if (name) void updateCategory(category, { name }); }}>改名</button><button onClick={() => void updateCategory(category, { isActive: !category.isActive })}>{category.isActive ? "停用" : "启用"}</button></div>}</div>)}</div>
      {canManage && <form className="category-add" onSubmit={addCategory}><input aria-label="新分类名称" required name="name" maxLength={30} placeholder="输入新分类" /><button className="primary">添加</button></form>}</section>
    <Link className="management-entry" href="/management"><span>成员与摊位</span><strong>{canManage ? "管理" : "查看"}</strong></Link><button className="danger wide" onClick={() => void logout()}>退出登录</button>
  </main>;
}
