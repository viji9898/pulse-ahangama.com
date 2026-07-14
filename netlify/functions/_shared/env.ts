function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export const env = {
  get whatsappAccessToken() {
    return required("WHATSAPP_ACCESS_TOKEN");
  },

  get whatsappPhoneNumberId() {
    return required("WHATSAPP_PHONE_NUMBER_ID");
  },

  get whatsappWabaId() {
    return required("WHATSAPP_WABA_ID");
  },

  get whatsappWebhookVerifyToken() {
    return required("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  },

  get metaAppSecret() {
    return required("META_APP_SECRET");
  },

  get metaGraphApiVersion() {
    return process.env.META_GRAPH_API_VERSION || "v23.0";
  },
};
