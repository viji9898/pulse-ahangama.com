# Adding Meta WhatsApp Template Campaigns

Use this checklist whenever a new approved Meta WhatsApp template is added to Pulse.

## 1. Confirm the Meta Template

Before wiring app code, confirm the template exists in the Ahangama WABA and is `APPROVED`.

```sh
WHATSAPP_ACCESS_TOKEN=$(node -e "import('dotenv/config').then(() => process.stdout.write(process.env.WHATSAPP_ACCESS_TOKEN ?? ''))")
WHATSAPP_WABA_ID=$(node -e "import('dotenv/config').then(() => process.stdout.write(process.env.WHATSAPP_WABA_ID ?? ''))")

curl -s "https://graph.facebook.com/v25.0/$WHATSAPP_WABA_ID/message_templates?fields=id,name,status,category,language,components&limit=100" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" | jq '.data[] | {name,status,language,category,components}'
```

Record the Meta template name, language, category, and variables. If Meta rejects the token, refresh `WHATSAPP_ACCESS_TOKEN` locally and in Netlify production.

## 2. Add the Campaign Type

Update the campaign type in both shared and frontend types:

- `db/schema/index.ts`
- `netlify/functions/_shared/campaign-content-types.ts`
- `src/features/campaigns/campaign-types.ts`

Generate a Drizzle migration when the Postgres enum changes:

```sh
npm run db:generate
```

## 3. Store Structured Content, Not Template Variables

Campaign content should describe the product/editorial concept, not raw Meta parameters.

Good:

```json
{
  "type": "featured_cafes",
  "heroImage": "best-cafes-og.jpg",
  "link": "https://ahangama.com/cafes"
}
```

Avoid:

```json
{
  "template": "featured_cafes",
  "first_name": "there"
}
```

Pulse should generate template variables automatically.

## 4. Validate Content

Add a Zod schema in `netlify/functions/_shared/campaign-validation.ts` and include it in `campaignContentSchema`.

For fixed-content templates, keep the schema minimal. Operators should not enter copy or variables if the Meta template already fixes them.

## 5. Build Meta Variables and Preview

Add a case in `netlify/functions/_shared/campaign-template-builder.ts`.

The builder is the source of truth for:

- `templateName`
- `languageCode`
- default `variables`
- human preview text shown before saving

If the only variable is the recipient name, include only that key:

```ts
variables: {
  first_name: "there",
}
```

The send path personalizes only variable keys present in `campaign.templateVariables`, so do not add variables the Meta template does not expect.

## 6. Render Inbox Messages

Add the same template to `netlify/functions/_shared/render-template-message.ts` so outbound campaign messages appear readably in the inbox.

This renderer should mirror the approved Meta template closely enough for operators to recognize what was sent.

## 7. Add the Composer Form

Create a form under `src/features/campaigns/content/` and register it in `CampaignComposerDrawer.tsx`.

For fixed templates, use a read-only confirmation card plus hidden fields for structured metadata. Do not expose Meta variables as operator inputs.

## 8. Header Media Check

If the Meta template header image is fixed in Meta, no WhatsApp client change is required.

If the template expects a dynamic header image parameter, extend `sendNamedTemplateMessage` in `netlify/functions/_shared/whatsapp-client.ts` to support header media components before sending.

## 9. Validate End to End

Run:

```sh
npm run lint
npx tsc --noEmit
npm run build
npx netlify build
```

After deploy, create a campaign, send it to the Internal Test audience, and check:

- `campaign_test_recipients`
- `messages`
- `whatsapp_webhook_events`
- Inbox conversation rendering
