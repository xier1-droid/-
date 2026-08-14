"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatFen, yuanToFen } from "@/lib/money";
import { TrendChart } from "@/components/trend-chart";
import { flushPendingOperations, offlineDb, queueOperation } from "@/lib/offline-db";

type Store = { id: string; name: string; organizationId: string };
type Bootstrap = { organization: { id: string; name: string }; member: { id: string; role: string }; stores: Store[] };
type DateRange = { from: string; to: string; mode: string };
type Summary = { incomeFen: number; expenseFen: number; netFen: number; transactionCount: number; granularity: "day" | "week" | "month"; range: { from: string; to: string }; paymentBreakdown: { paymentMethod: string; amountFen: number }[]; trend: { date: string; label: string; incomeFen: number; expenseFen: number; netFen: number }[]; recentEntries: { id: string; type: string; amountFen: number; paymentMethod: string; category: string; occurredAt: string; note?: string; store: { name: string } }[] };

const methodLabel: Record<string, string> = { CASH: "现金", WECHAT: "微信", ALIPAY: "支付宝", BANK_CARD: "银行卡", OTHER: "其他" };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const shiftDate = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); };
const rangeLabel = (range: DateRange) => range.from === range.to ? range.from.replaceAll("-", "/") : range.from.replaceAll("-", "/") + " - " + range.to.replaceAll("-", "/");

export function Dashboard({ bootstrap, initialDateRange }: { bootstrap: Bootstrap; initialDateRange: DateRange }) {
  const [storeScope, setStoreScope] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showEntry, setShowEntry] = useState(false);
  const [showClosing, setShowClosing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const canManage = bootstrap.member.role === "OWNER";
  const writable = bootstrap.member.role !== "VIEWER";
  const selectedStore = bootstrap.stores.find((store) => store.id === storeScope);

  const apiScope = storeScope === "all" ? "all" : storeScope;
  const rangeStorageKey = "stall-ledger:range:" + bootstrap.organization.id;
  const loadSummary = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ organizationId: bootstrap.organization.id, storeId: apiScope, from: dateRange.from, to: dateRange.to, granularity: "auto" });
    try {
      const response = await fetch("/api/analytics/summary?" + params);
      const result = await response.json().catch(() => null);
      if (!response.ok) { setMessage(result?.error?.message ?? "数据加载失败"); return; }
      setSummary(result);
      await offlineDb.dashboardSnapshots.put({ key: bootstrap.organization.id + ":" + apiScope + ":" + dateRange.from + ":" + dateRange.to, payload: JSON.stringify(result), updatedAt: Date.now() });
    } catch {
      const snapshot = await offlineDb.dashboardSnapshots.get(bootstrap.organization.id + ":" + apiScope + ":" + dateRange.from + ":" + dateRange.to);
      if (snapshot) { setSummary(JSON.parse(snapshot.payload) as Summary); setMessage("当前离线，展示的是上次同步的数据。"); }
      else setMessage("当前离线且没有本地数据，请恢复网络后重试。");
    } finally { setLoading(false); }
  }, [bootstrap.organization.id, apiScope, dateRange.from, dateRange.to]);

  const sync = useCallback(async () => {
    await flushPendingOperations();
    setSyncCount(await offlineDb.pendingOperations.count());
    await loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(rangeStorageKey);
      if (saved) { try { const parsed = JSON.parse(saved) as DateRange; if (parsed.from && parsed.to && parsed.from <= parsed.to) setDateRange(parsed); } catch {} }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [rangeStorageKey]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSummary(); void offlineDb.pendingOperations.count().then(setSyncCount); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);
  useEffect(() => { window.addEventListener("online", sync); return () => window.removeEventListener("online", sync); }, [sync]);

  const scopeOptions = useMemo(() => bootstrap.stores, [bootstrap.stores]);
  function applyRange(nextRange: DateRange) { window.localStorage.setItem(rangeStorageKey, JSON.stringify(nextRange)); setDateRange(nextRange); setShowDatePicker(false); }
  const exportHref = "/api/exports/ledger.csv?organizationId=" + bootstrap.organization.id + "&storeId=" + apiScope + "&from=" + dateRange.from + "&to=" + dateRange.to;
  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">{bootstrap.organization.name}</p><h1>今天生意怎么样？</h1></div><div className="topbar-actions"><button className="ghost" onClick={sync}>同步{syncCount ? " · " + syncCount : ""}</button><button className="ghost" onClick={() => setShowSettings(true)}>设置</button></div></header>
    <section className="scope-row"><select value={storeScope} onChange={(event) => setStoreScope(event.target.value)} aria-label="选择摊位"><option value="all">全部已授权摊位</option>{scopeOptions.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select>{canManage && <button className="link-button" onClick={() => setShowInvite(true)}>邀请家人</button>}</section>
    {storeScope === "all" && writable && <p className="scope-hint">请先选择一个具体摊位，再记一笔或做日结。</p>}
    {message && <p className="notice">{message}</p>}
    {loading || !summary ? <section className="loading-card">正在整理账目…</section> : <>
      <section className="hero-card"><p>{rangeLabel(dateRange)} 净收益</p><strong>{formatFen(summary.netFen)}</strong><span>{summary.transactionCount} 笔收支 · {storeScope === "all" ? "已汇总可查看摊位" : selectedStore?.name}</span></section>
      <section className="metric-grid"><Metric label="收入" amount={summary.incomeFen} tone="income" /><Metric label="支出" amount={summary.expenseFen} tone="expense" /><Metric label="净收益" amount={summary.netFen} tone="net" /></section>
      <section className="panel"><div className="panel-title"><div><h2>{rangeLabel(dateRange)} 收支趋势</h2><span>按{summary.granularity === "day" ? "天" : summary.granularity === "week" ? "周" : "月"}汇总 · 收入 / 支出</span></div><button className="date-range-button" onClick={() => setShowDatePicker(true)}>{dateRange.mode} ›</button></div><TrendChart data={summary.trend} granularity={summary.granularity} /></section>
      <section className="panel"><div className="panel-title"><h2>收款方式</h2><span>收入构成</span></div><div className="payment-list">{summary.paymentBreakdown.length ? summary.paymentBreakdown.map((item) => <div key={item.paymentMethod}><span>{methodLabel[item.paymentMethod]}</span><b>{formatFen(item.amountFen)}</b></div>) : <p className="muted">还没有收入记录</p>}</div></section>
      <section className="panel"><div className="panel-title"><h2>最近账目</h2><span>{summary.recentEntries.length} 笔</span></div><div className="entry-list">{summary.recentEntries.length ? summary.recentEntries.map((entry) => <div className="entry-row" key={entry.id}><div><b>{entry.category}</b><small>{entry.store.name} · {methodLabel[entry.paymentMethod]} · {new Date(entry.occurredAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></div><strong className={entry.type === "INCOME" ? "positive" : "negative"}>{entry.type === "INCOME" ? "+" : "-"}{formatFen(entry.amountFen)}</strong></div>) : <p className="muted">从“记一笔”开始记录今天的生意吧。</p>}</div></section>
    </>}
    <nav className="bottom-nav"><button onClick={() => setShowEntry(true)} disabled={!writable || !selectedStore} className="add-button">＋ 记一笔</button><button onClick={() => setShowClosing(true)} disabled={!writable || storeScope === "all"}>日结</button><a className="nav-link" href={exportHref}>导出</a></nav>
    {showEntry && selectedStore && <EntryModal store={selectedStore} onClose={() => setShowEntry(false)} onSaved={() => { setShowEntry(false); loadSummary(); }} onQueued={(text) => { setShowEntry(false); setMessage(text); offlineDb.pendingOperations.count().then(setSyncCount); }} />}
    {showClosing && selectedStore && <ClosingModal store={selectedStore} onClose={() => setShowClosing(false)} onSaved={() => { setShowClosing(false); setMessage("日结已保存"); }} />}
    {showInvite && <InviteModal organizationId={bootstrap.organization.id} stores={bootstrap.stores} onClose={() => setShowInvite(false)} />}
    {showSettings && <SettingsModal organization={bootstrap.organization} role={bootstrap.member.role} stores={bootstrap.stores} syncCount={syncCount} onClose={() => setShowSettings(false)} />}
    {showDatePicker && <DateRangeModal value={dateRange} onApply={applyRange} onClose={() => setShowDatePicker(false)} />}
  </main>;
}

function Metric({ label, amount, tone }: { label: string; amount: number; tone: string }) { return <div className={"metric " + tone}><span>{label}</span><b>{formatFen(amount)}</b></div>; }

function EntryModal({ store, onClose, onSaved, onQueued }: { store: Store; onClose: () => void; onSaved: () => void; onQueued: (message: string) => void }) {
  const [type, setType] = useState("INCOME"); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(""); const form = new FormData(event.currentTarget);
    let amountFen: number; try { amountFen = yuanToFen(String(form.get("amount"))); } catch (error) { setPending(false); setMessage(error instanceof Error ? error.message : "金额不正确"); return; }
    const payload = { storeId: store.id, type, amountFen, paymentMethod: form.get("paymentMethod"), category: form.get("category"), occurredAt: new Date(String(form.get("occurredAt"))).toISOString(), note: form.get("note") || null, clientOperationId: crypto.randomUUID() };
    if (!navigator.onLine) { await queueOperation({ id: payload.clientOperationId, url: "/api/ledger-entries", method: "POST", body: JSON.stringify(payload) }); onQueued("网络不可用，账目已安全保存在本机，恢复网络后会自动同步。"); return; }
    const response = await fetch("/api/ledger-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json().catch(() => null); setPending(false);
    if (!response.ok) { setMessage(result?.error?.message ?? "保存失败"); return; } onSaved();
  }
  return <Modal title="记一笔" onClose={onClose}><form className="form-stack" onSubmit={submit}><div className="segmented"><button type="button" className={type === "INCOME" ? "selected income" : ""} onClick={() => setType("INCOME")}>收入</button><button type="button" className={type === "EXPENSE" ? "selected expense" : ""} onClick={() => setType("EXPENSE")}>支出</button></div><label>金额（元）<input required inputMode="decimal" name="amount" placeholder="例如 28.50" autoFocus /></label><label>收付款方式<select name="paymentMethod"><option value="WECHAT">微信</option><option value="ALIPAY">支付宝</option><option value="CASH">现金</option><option value="BANK_CARD">银行卡</option><option value="OTHER">其他</option></select></label><label>分类<input required name="category" placeholder={type === "INCOME" ? "例如：早餐销售" : "例如：进货"} /></label><label>发生时间<input required type="datetime-local" name="occurredAt" defaultValue={new Date().toISOString().slice(0, 16)} /></label><label>备注（选填）<input name="note" placeholder="例如：王阿姨预订" /></label>{message && <p className="form-error">{message}</p>}<button className="primary wide" disabled={pending}>{pending ? "保存中…" : "保存账目"}</button></form></Modal>;
}

function ClosingModal({ store, onClose, onSaved }: { store: Store; onClose: () => void; onSaved: () => void }) {
  const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); const form = new FormData(event.currentTarget); try { const payload = { storeId: store.id, openingCashFen: yuanToFen(String(form.get("openingCash"))), actualClosingCashFen: form.get("actualCash") ? yuanToFen(String(form.get("actualCash"))) : null, note: form.get("note") || null }; const response = await fetch("/api/daily-closing/" + today(), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json().catch(() => null); setPending(false); if (!response.ok) { setMessage(result?.error?.message ?? "保存失败"); return; } onSaved(); } catch (error) { setPending(false); setMessage(error instanceof Error ? error.message : "金额不正确"); } }
  return <Modal title={store.name + " · 今日日结"} onClose={onClose}><form className="form-stack" onSubmit={submit}><label>开档备用金（元）<input required inputMode="decimal" name="openingCash" defaultValue="0" /></label><label>实点现金（元）<input inputMode="decimal" name="actualCash" placeholder="可稍后再填" /></label><label>收摊备注（选填）<input name="note" placeholder="例如：明天提早半小时出摊" /></label>{message && <p className="form-error">{message}</p>}<button className="primary wide" disabled={pending}>{pending ? "保存中…" : "保存日结"}</button></form></Modal>;
}

function InviteModal({ organizationId, stores, onClose }: { organizationId: string; stores: Store[]; onClose: () => void }) {
  const [message, setMessage] = useState(""); const [code, setCode] = useState(""); const [selected, setSelected] = useState<string[]>(stores.map((store) => store.id));
  async function create() { const response = await fetch("/api/organizations/current/invitations?organizationId=" + organizationId, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetRole: "BOOKKEEPER", storeIds: selected }) }); const result = await response.json().catch(() => null); if (!response.ok) { setMessage(result?.error?.message ?? "创建失败"); return; } setCode(result.invitation.code); }
  return <Modal title="邀请家人一起记账" onClose={onClose}><p className="muted">邀请码 7 天内有效，仅能使用一次。受邀家人将以“记账员”身份加入。</p><div className="check-list">{stores.map((store) => <label key={store.id}><input type="checkbox" checked={selected.includes(store.id)} onChange={() => setSelected((current) => current.includes(store.id) ? current.filter((id) => id !== store.id) : [...current, store.id])} />{store.name}</label>)}</div>{message && <p className="form-error">{message}</p>}{code ? <div className="invite-code"><span>邀请码</span><strong>{code}</strong><button className="ghost" onClick={() => navigator.clipboard.writeText(code)}>复制</button></div> : <button className="primary wide" disabled={!selected.length} onClick={create}>生成邀请码</button>}</Modal>;
}

function DateRangeModal({ value, onApply, onClose }: { value: DateRange; onApply: (range: DateRange) => void; onClose: () => void }) {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const [message, setMessage] = useState("");
  const presets = [
    { label: "今天", from: today(), to: today() },
    { label: "近 7 天", from: shiftDate(-6), to: today() },
    { label: "近 30 天", from: shiftDate(-29), to: today() },
    { label: "本月", from: today().slice(0, 8) + "01", to: today() },
    { label: "上月", from: (() => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); })(), to: (() => { const d = new Date(); d.setDate(0); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); })() },
  ];
  function customApply() { if (!from || !to || from > to) { setMessage("开始日期不能晚于结束日期。"); return; } if (to > today()) { setMessage("结束日期不能晚于今天。"); return; } onApply({ from, to, mode: "自定义日期" }); }
  return <Modal title="选择查看日期" onClose={onClose}><div className="date-presets">{presets.map((preset) => <button key={preset.label} onClick={() => onApply({ ...preset, mode: preset.label })}>{preset.label}</button>)}<button onClick={() => onApply({ from: "all", to: today(), mode: "全部历史" })}>全部历史</button></div><div className="date-fields"><label>开始日期<input type="date" value={from} max={today()} onChange={(event) => setFrom(event.target.value)} /></label><label>结束日期<input type="date" value={to} max={today()} onChange={(event) => setTo(event.target.value)} /></label></div>{message && <p className="form-error">{message}</p>}<button className="primary wide" onClick={customApply}>按自定义日期查看</button><p className="settings-tip">跨度 31 天内按天展示，32–180 天按周展示，更长历史按月展示。</p></Modal>;
}

function SettingsModal({ organization, role, stores, syncCount, onClose }: { organization: Bootstrap["organization"]; role: string; stores: Store[]; syncCount: number; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const roleLabel: Record<string, string> = { OWNER: "所有者", ADMIN: "管理员", BOOKKEEPER: "记账员", VIEWER: "查看者" };
  async function logout() {
    setPending(true);
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) { setMessage("退出失败，请稍后重试。"); setPending(false); return; }
    window.location.reload();
  }
  return <Modal title="设置" onClose={onClose}><div className="settings-list"><div><span>家庭商户</span><strong>{organization.name}</strong></div><div><span>我的权限</span><strong>{roleLabel[role] ?? "成员"}</strong></div><div><span>可访问摊位</span><strong>{stores.length} 个</strong></div><div><span>待同步账目</span><strong>{syncCount ? syncCount + " 笔" : "已全部同步"}</strong></div><div><span>界面语言</span><strong>简体中文</strong></div></div>{message && <p className="form-error">{message}</p>}<button className="danger wide" onClick={logout} disabled={pending}>{pending ? "正在退出…" : "退出登录"}</button><p className="settings-tip">退出后，本机离线队列仍会保留；下次登录同一账号后可继续同步。</p></Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop"><section className="modal"><header><h2>{title}</h2><button className="ghost" onClick={onClose}>关闭</button></header>{children}</section></div>; }
