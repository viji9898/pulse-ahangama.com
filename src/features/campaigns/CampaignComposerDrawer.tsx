import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import VenueFeatureForm from "./content/VenueFeatureForm";
import WellnessPickForm from "./content/WellnessPickForm";
import WhatsOnTodayForm from "./content/WhatsOnTodayForm";
import type { WhatsAppCostBreakdown } from "../../lib/whatsapp-pricing";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

type RecipientPreview = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  accommodationName: string | null;
};

type PreviewResponse = {
  recipientCount: number;
  costBreakdown: WhatsAppCostBreakdown;
  estimatedMetaCostUsd: number;
  venuePriceUsd: number;
  estimatedGrossProfitUsd: number;
  estimatedMarginPercent: number | null;
  recipients: RecipientPreview[];
};

type ContentPreviewResponse = {
  ok: boolean;
  campaignType: CampaignFormValues["campaignType"];
  templateName: string;
  languageCode: string;
  variables: Record<string, string>;
  preview: string;
};

const countryLabels: Record<string, string> = {
  LK: "Sri Lanka",
  GB: "United Kingdom",
  EG: "Egypt",
  IN: "India",
};

function formatUsd(value: number, precision = 4): string {
  return `$${value.toFixed(precision)}`;
}

type CampaignFormValues = {
  name: string;
  campaignType: "whats_on_today" | "venue_feature" | "wellness_pick";
  content: Record<string, unknown>;
  interests?: string[];
  accommodationName?: string;
  currentlyStaying: boolean;
  excludeRecentlyMessagedHours?: number;
  venuePriceUsd: number;
  scheduledAt?: dayjs.Dayjs;
};

const interestOptions = [
  "Cafés & Coffee",
  "Food & Dining",
  "Wellness & Yoga",
  "Surfing",
  "Nature & Wildlife",
  "Nightlife",
  "Shopping",
  "Family",
].map((value) => ({
  label: value,
  value,
}));

export default function CampaignComposerDrawer({
  open,
  onClose,
  onCreated,
}: Props) {
  const [form] = Form.useForm<CampaignFormValues>();
  const campaignType = Form.useWatch("campaignType", form);

  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const [contentPreview, setContentPreview] =
    useState<ContentPreviewResponse | null>(null);

  const [previewing, setPreviewing] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (open) {
        form.setFieldsValue({
          campaignType: "venue_feature",
          content: {},
          currentlyStaying: true,
          excludeRecentlyMessagedHours: 24,
          venuePriceUsd: 75,
        });
      } else {
        form.resetFields();
        setPreview(null);
        setContentPreview(null);
      }
    });
  }, [open, form]);

  function buildAudience(values: CampaignFormValues) {
    return {
      interests: values.interests,
      accommodationName: values.accommodationName,
      currentlyStaying: values.currentlyStaying,
      whatsappOptIn: true,
      excludeRecentlyMessagedHours: values.excludeRecentlyMessagedHours,
    };
  }

  function buildContent(values: CampaignFormValues) {
    return {
      ...values.content,
      type: values.campaignType,
    };
  }

  async function previewContent(values: CampaignFormValues) {
    const response = await fetch("/api/campaigns/content-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildContent(values)),
    });

    const result = (await response.json()) as ContentPreviewResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || "Unable to preview message");
    }

    return result;
  }

  async function previewAudience() {
    const values = await form.validateFields();

    setPreviewing(true);

    try {
      const messagePreview = await previewContent(values);

      const response = await fetch("/api/campaigns/audience-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audience: buildAudience(values as CampaignFormValues),
          venuePriceUsd: values.venuePriceUsd,
        }),
      });

      const result = (await response.json()) as PreviewResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to preview audience");
      }

      setContentPreview(messagePreview);
      setPreview(result);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to preview campaign",
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function createCampaign() {
    const values = await form.validateFields();

    if (!preview) {
      message.warning("Preview the audience before saving the campaign.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          content: buildContent(values),
          audience: buildAudience(values),
          venuePriceUsd: values.venuePriceUsd,
          scheduledAt: values.scheduledAt?.toISOString() ?? null,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to create campaign");
      }

      message.success("Campaign created");
      await onCreated();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to create campaign",
      );
    } finally {
      setSaving(false);
    }
  }

  const previewColumns: ColumnsType<RecipientPreview> = useMemo(
    () => [
      {
        title: "Guest",
        key: "guest",
        render: (_, guest) =>
          [guest.firstName, guest.lastName].filter(Boolean).join(" ") ||
          "WhatsApp guest",
      },
      {
        title: "Phone",
        dataIndex: "phoneNumber",
      },
      {
        title: "Stay",
        dataIndex: "accommodationName",
        render: (value: string | null) => value || "—",
      },
    ],
    [],
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title="Create WhatsApp campaign"
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>

          <Button
            type="primary"
            loading={saving}
            onClick={() => void createCampaign()}
          >
            Save campaign
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        message="This creates a draft recipient snapshot. It does not send messages yet."
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical">
        <Typography.Title level={4}>Campaign</Typography.Title>

        <Form.Item
          name="name"
          label="Campaign name"
          rules={[
            {
              required: true,
              message: "Enter a campaign name",
            },
          ]}
        >
          <Input placeholder="Kaffi breakfast feature — 16 July" />
        </Form.Item>

        <Form.Item
          name="campaignType"
          label="Campaign type"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              {
                label: "What’s On Today",
                value: "whats_on_today",
              },
              {
                label: "Venue Feature",
                value: "venue_feature",
              },
              {
                label: "Wellness Pick",
                value: "wellness_pick",
              },
            ]}
            onChange={() => {
              form.setFieldValue("content", {});
              setPreview(null);
              setContentPreview(null);
            }}
          />
        </Form.Item>

        {campaignType === "whats_on_today" && <WhatsOnTodayForm />}

        {campaignType === "venue_feature" && <VenueFeatureForm />}

        {campaignType === "wellness_pick" && <WellnessPickForm />}

        <Divider />

        <Typography.Title level={4}>Audience</Typography.Title>

        <Form.Item name="interests" label="Interests">
          <Select
            mode="multiple"
            allowClear
            options={interestOptions}
            placeholder="Select interests"
          />
        </Form.Item>

        <Form.Item name="accommodationName" label="Accommodation contains">
          <Input placeholder="Lighthouse" />
        </Form.Item>

        <Form.Item
          name="currentlyStaying"
          label="Currently staying in Ahangama"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="excludeRecentlyMessagedHours"
          label="Exclude guests messaged within"
        >
          <InputNumber
            min={0}
            max={720}
            addonAfter="hours"
            style={{ width: 220 }}
          />
        </Form.Item>

        <Divider />

        <Typography.Title level={4}>Commercials</Typography.Title>

        <Form.Item
          name="venuePriceUsd"
          label="Venue campaign price"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber
            min={0}
            step={5}
            precision={2}
            prefix="$"
            style={{ width: 220 }}
          />
        </Form.Item>

        <Form.Item name="scheduledAt" label="Schedule">
          <DatePicker
            showTime
            style={{ width: "100%" }}
            disabledDate={(date) => date.isBefore(dayjs().startOf("day"))}
          />
        </Form.Item>

        <Button
          block
          loading={previewing}
          onClick={() => void previewAudience()}
        >
          Preview audience
        </Button>
      </Form>

      {preview && (
        <>
          <Divider />

          <Typography.Title level={4}>Campaign preview</Typography.Title>

          {contentPreview && (
            <Card style={{ marginBottom: 20 }}>
              <Typography.Text strong>Message preview</Typography.Text>

              <Typography.Paragraph
                style={{ marginTop: 12, whiteSpace: "pre-line" }}
              >
                {contentPreview.preview}
              </Typography.Paragraph>
            </Card>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <Statistic title="Recipients" value={preview.recipientCount} />

            <Statistic
              title="Total Meta cost"
              value={preview.estimatedMetaCostUsd}
              precision={4}
              prefix="$"
            />

            <Statistic
              title="Venue price"
              value={preview.venuePriceUsd}
              precision={2}
              prefix="$"
            />

            <Statistic
              title="Estimated gross profit"
              value={preview.estimatedGrossProfitUsd}
              precision={2}
              prefix="$"
              suffix={
                preview.estimatedMarginPercent !== null
                  ? ` (${preview.estimatedMarginPercent}%)`
                  : undefined
              }
            />
          </div>

          <Card style={{ marginBottom: 20 }}>
            <Typography.Text strong>Estimated Meta cost</Typography.Text>

            <Space direction="vertical" size={10} style={{ marginTop: 12 }}>
              {Object.entries(preview.costBreakdown).map(
                ([countryCode, item]) => (
                  <div key={countryCode}>
                    <Typography.Text strong>
                      {countryLabels[countryCode] ?? countryCode} ({item.count})
                    </Typography.Text>

                    <Typography.Text type="secondary" style={{ display: "block" }}>
                      {item.count} × {formatUsd(item.price)} = {formatUsd(item.total)}
                    </Typography.Text>
                  </div>
                ),
              )}

              <Divider style={{ margin: "4px 0" }} />

              <div>
                <Typography.Text strong>Total</Typography.Text>

                <Typography.Title level={4} style={{ margin: 0 }}>
                  {formatUsd(preview.estimatedMetaCostUsd)}
                </Typography.Title>
              </div>
            </Space>
          </Card>

          <Descriptions
            size="small"
            column={1}
            bordered
            style={{ marginBottom: 20 }}
          >
            <Descriptions.Item label="Message type">
              Approved WhatsApp template
            </Descriptions.Item>

            <Descriptions.Item label="Opt-out suppression">
              Enabled
            </Descriptions.Item>

            <Descriptions.Item label="Duplicate prevention">
              One recipient per campaign
            </Descriptions.Item>
          </Descriptions>

          <Table
            rowKey="id"
            size="small"
            columns={previewColumns}
            dataSource={preview.recipients}
            pagination={{
              pageSize: 10,
            }}
          />
        </>
      )}
    </Drawer>
  );
}
