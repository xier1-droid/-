"use client";
import { FormEvent, useState } from "react";

export function AuthPanel({ initialMessage = "" }: { initialMessage?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState(initialMessage);
  const [pending, setPending] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = mode === "register" ? { email: form.get("email"), password: form.get("password"), organizationName: form.get("organizationName") || "我的家庭商户", storeName: form.get("storeName") || "默认摊位", inviteCode: inviteCode.trim() || undefined } : { email: form.get("email"), password: form.get("password") };
    const response = await fetch("/api/auth/" + mode, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => null); setPending(false);
    if (!response.ok) { setMessage(result?.error?.message ?? "操作失败，请重试"); return; }
    if (mode === "login" && inviteCode.trim()) {
      const inviteResponse = await fetch("/api/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: inviteCode.trim() }) });
      const inviteResult = await inviteResponse.json().catch(() => null);
      if (!inviteResponse.ok) { setMessage("登录成功，但邀请码未加入：" + (inviteResult?.error?.message ?? "请稍后重试")); return; }
    }
    window.location.reload();
  }

  return <main className="auth-shell"><section className="auth-card"><div className="brand-mark">账</div><p className="eyebrow">给每一个认真做生意的人</p><h1>摊主日记账</h1><p className="muted">收摊前记清每一笔，随时看懂全家的经营数据。</p>
    <div className="tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>登录</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>创建账号</button></div>
    <form onSubmit={submit} className="form-stack">
      {mode === "register" && <><label>家庭商户名称<input name="organizationName" placeholder="例如：老李家的早餐摊" /></label><label>第一个摊位名称<input name="storeName" placeholder="例如：东门摊位" /></label></>}
      <label>邮箱<input required type="email" name="email" placeholder="name@example.com" /></label><label>密码<input required minLength={8} type="password" name="password" placeholder="至少 8 位" /></label>
      <label>家庭邀请码（选填）<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="受邀加入家庭商户时填写" /></label>
      {message && <p className="form-error">{message}</p>}<button className="primary wide" disabled={pending}>{pending ? "请稍候…" : mode === "login" ? "登录并查看今日账目" : "创建家庭商户"}</button>
    </form>
  </section></main>;
}
