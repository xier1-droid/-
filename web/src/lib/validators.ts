import { z } from "zod";

const roleSchema = z.enum(["OWNER", "ADMIN", "BOOKKEEPER", "VIEWER"]);
const paymentMethodSchema = z.enum(["CASH", "WECHAT", "ALIPAY", "BANK_CARD", "OTHER"]);

const baseRegister = z.object({
  email: z.string().email("请输入正确的邮箱地址").transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8, "密码至少需要 8 位"),
  organizationName: z.string().min(1).max(60).default("我的家庭商户"),
  storeName: z.string().min(1).max(60).default("默认摊位"),
  inviteCode: z.string().trim().min(8).max(128).optional(),
});
export const registerSchema = z.union([baseRegister, z.object({ method: z.enum(["email", "phone"]), identifier: z.string().trim().min(1), password: z.string().min(8), verificationCode: z.string().regex(/^\d{6}$/).optional(), organizationName: z.string().min(1).max(60).default("我的家庭商户"), storeName: z.string().min(1).max(60).default("默认摊位"), inviteCode: z.string().trim().min(8).max(128).optional() })]);

export const loginSchema = z.union([baseRegister.pick({ email: true, password: true }), z.object({ identifier: z.string().trim().min(1), password: z.string().min(8), inviteCode: z.string().trim().min(8).max(128).optional() })]);
export const smsSendSchema = z.object({ phone: z.string().trim(), purpose: z.enum(["REGISTER", "RESET_PASSWORD"]) });
export const passwordResetSchema = z.object({ phone: z.string().trim(), verificationCode: z.string().regex(/^\d{6}$/), newPassword: z.string().min(8) });

export const ledgerEntrySchema = z.object({
  storeId: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  amountFen: z.number().int().positive("金额必须大于 0").max(100000000),
  paymentMethod: paymentMethodSchema,
  category: z.string().trim().min(1).max(30),
  occurredAt: z.coerce.date(),
  note: z.string().trim().max(200).optional().nullable(),
  clientOperationId: z.string().uuid().optional(),
});

export const ledgerEntryUpdateSchema = ledgerEntrySchema.omit({ storeId: true, clientOperationId: true });

export const invitationSchema = z.object({
  targetRole: roleSchema.refine((role) => role !== "OWNER", "邀请码不能创建所有者"),
  storeIds: z.array(z.string()).min(1, "至少选择一个摊位").max(30),
});

export const acceptInvitationSchema = z.object({
  code: z.string().trim().min(8).max(128),
});

export const dailyClosingSchema = z.object({
  storeId: z.string().min(1),
  openingCashFen: z.number().int().min(0).max(100000000),
  actualClosingCashFen: z.number().int().min(0).max(100000000).nullable(),
  note: z.string().trim().max(200).optional().nullable(),
});

export const memberUpdateSchema = z.object({
  role: roleSchema.refine((role) => role !== "OWNER", "不能通过此接口转让所有者"),
  storeIds: z.array(z.string().min(1)).min(1, "至少授权一个摊位").max(30).refine((ids) => new Set(ids).size === ids.length, "摊位授权不能重复"),
});

export const storeCreateSchema = z.object({
  organizationId: z.string().min(1, "缺少家庭商户标识"),
  name: z.string().trim().min(1, "请输入摊位名称").max(60, "摊位名称不能超过 60 个字"),
});

export const storeUpdateSchema = storeCreateSchema.pick({ name: true });

export const organizationSettingsSchema = z.object({ timezone: z.enum(["Asia/Shanghai", "Asia/Urumqi"]) });
export const categoryCreateSchema = z.object({ organizationId: z.string().min(1), type: z.enum(["INCOME", "EXPENSE"]), name: z.string().trim().min(1, "请输入分类名称").max(30, "分类名称不能超过 30 个字") });
export const categoryUpdateSchema = z.object({ name: z.string().trim().min(1).max(30).optional(), sortOrder: z.number().int().min(0).max(10000).optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "没有需要保存的分类修改");
