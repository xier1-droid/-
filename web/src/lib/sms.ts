import * as tencentcloud from "tencentcloud-sdk-nodejs";

export type SmsPurpose = "REGISTER" | "RESET_PASSWORD";
export interface SmsProvider { sendVerificationCode(input: { phoneE164: string; code: string; purpose: SmsPurpose }): Promise<void>; }

class MockSmsProvider implements SmsProvider { async sendVerificationCode() {} }

class TencentCloudSmsProvider implements SmsProvider {
  async sendVerificationCode({ phoneE164, code, purpose }: { phoneE164: string; code: string; purpose: SmsPurpose }) {
    const required = ["TENCENT_SMS_SECRET_ID", "TENCENT_SMS_SECRET_KEY", "TENCENT_SMS_SDK_APP_ID", "TENCENT_SMS_SIGN_NAME", purpose === "REGISTER" ? "TENCENT_SMS_REGISTER_TEMPLATE_ID" : "TENCENT_SMS_RESET_TEMPLATE_ID"] as const;
    if (required.some((key) => !process.env[key])) throw new Error("SMS_CONFIG_MISSING");
    const Client = tencentcloud.sms.v20210111.Client;
    const client = new Client({ credential: { secretId: process.env.TENCENT_SMS_SECRET_ID!, secretKey: process.env.TENCENT_SMS_SECRET_KEY! }, region: "ap-guangzhou", profile: { httpProfile: { endpoint: "sms.tencentcloudapi.com" } } });
    const result = await client.SendSms({ PhoneNumberSet: [phoneE164], SmsSdkAppId: process.env.TENCENT_SMS_SDK_APP_ID!, SignName: process.env.TENCENT_SMS_SIGN_NAME!, TemplateId: process.env[purpose === "REGISTER" ? "TENCENT_SMS_REGISTER_TEMPLATE_ID" : "TENCENT_SMS_RESET_TEMPLATE_ID"]!, TemplateParamSet: [code, "5"] });
    if (result.SendStatusSet?.[0]?.Code !== "Ok") throw new Error("SMS_SEND_FAILED");
  }
}

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER ?? "mock";
  if (process.env.NODE_ENV === "production" && provider === "mock" && process.env.SMS_ALLOW_MOCK_IN_PRODUCTION_TEST !== "1") throw new Error("SMS_MOCK_FORBIDDEN");
  if (provider === "tencent") return new TencentCloudSmsProvider();
  if (provider === "mock") return new MockSmsProvider();
  throw new Error("SMS_PROVIDER_INVALID");
}
