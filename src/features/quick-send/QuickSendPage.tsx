import { SendOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  List,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import FeatureArticleForm from "../campaigns/content/FeatureArticleForm";

type WhatsAppSenderKey = "ahangama" | "ahangama_pass";
type QuickSendTemplateName =
  | "feature_article"
  | "qs_feature_article_ahangama_pass";

type QuickSendValues = {
  name?: string;
  audienceId: string;
  templateName: QuickSendTemplateName;
  whatsappSenderKey: WhatsAppSenderKey;
  content: {
    articleTitle: string;
    description: string;
    articleUrl: string;
  };
};

type TestAudience = {
  id: string;
  name: string;
  active: boolean;
  memberCount: number;
};

type TestAudienceMember = {
  guestId: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  normalizedPhoneNumber: string | null;
  whatsappOptIn: boolean;
};

type Preview = {
  templateName: string;
  languageCode: string;
  preview: string;
  members: TestAudienceMember[];
};

type SendResult = {
  ok: boolean;
  campaignId: string;
  testRunId: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
};

export default function QuickSendPage() {
  const [form] = Form.useForm<QuickSendValues>();
  const selectedTemplate =
    Form.useWatch("templateName", form) ?? "feature_article";
  const [audiences, setAudiences] = useState<TestAudience[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [loadingAudiences, setLoadingAudiences] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadAudiences() {
      try {
        const response = await fetch("/api/test-audiences");

        if (!response.ok) throw new Error("Unable to load test audiences");

        const data = (await response.json()) as {
          audiences: TestAudience[];
        };
        const activeAudiences = data.audiences.filter(
          (audience) => audience.active,
        );
        const defaultAudience =
          activeAudiences.find(
            (audience) => audience.name === "Internal Test Viji",
          ) ?? activeAudiences[0];

        setAudiences(activeAudiences);
        form.setFieldsValue({
          audienceId: defaultAudience?.id,
          templateName: "feature_article",
          whatsappSenderKey: "ahangama",
        });
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : "Unable to load test audiences",
        );
      } finally {
        setLoadingAudiences(false);
      }
    }

    void loadAudiences();
  }, [form]);

  function buildContent(values: QuickSendValues) {
    if (values.templateName === "qs_feature_article_ahangama_pass") {
      return {
        type: "feature_article" as const,
        articleTitle: "Inside Ahangama Circle",
        description:
          "A community bringing together founders, creatives, hospitality leaders and local businesses shaping the future of Sri Lanka's south coast.",
        articleUrl:
          "https://ahangama.com/inside-the-launch-of-ahangama-circle/",
      };
    }

    return {
      type: "feature_article" as const,
      ...values.content,
    };
  }

  async function previewMessage() {
    const values = await form.validateFields();
    setPreviewing(true);

    try {
      const [contentResponse, membersResponse] = await Promise.all([
        fetch("/api/quick-send/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: values.templateName,
            whatsappSenderKey: values.whatsappSenderKey,
            content: buildContent(values),
          }),
        }),
        fetch(
          `/api/test-audiences/members?audienceId=${encodeURIComponent(values.audienceId)}`,
        ),
      ]);
      const content = (await contentResponse.json()) as {
        templateName: string;
        languageCode: string;
        preview: string;
        error?: string;
      };
      const audience = (await membersResponse.json()) as {
        members: TestAudienceMember[];
        error?: string;
      };

      if (!contentResponse.ok) {
        throw new Error(content.error || "Unable to preview message");
      }

      if (!membersResponse.ok) {
        throw new Error(audience.error || "Unable to preview recipients");
      }

      const eligibleMembers = audience.members.filter(
        (member) => member.whatsappOptIn && member.normalizedPhoneNumber,
      );

      if (eligibleMembers.length === 0) {
        throw new Error("This audience has no eligible WhatsApp recipients");
      }

      setPreview({
        templateName: content.templateName,
        languageCode: content.languageCode,
        preview: content.preview,
        members: eligibleMembers,
      });
      setSendResult(null);
    } catch (error) {
      setPreview(null);
      message.error(
        error instanceof Error ? error.message : "Unable to preview Quick Send",
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function sendMessage() {
    if (!preview) return;

    const values = await form.validateFields();
    setSending(true);

    try {
      const response = await fetch("/api/quick-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          audienceId: values.audienceId,
          templateName: values.templateName,
          whatsappSenderKey: values.whatsappSenderKey,
          content: buildContent(values),
        }),
      });
      const result = (await response.json()) as SendResult & { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Unable to send message");
      }

      setSendResult(result);

      if (result.ok) {
        message.success(`Message accepted for ${result.sentCount} recipients`);
      } else {
        message.warning(
          `${result.sentCount} accepted, ${result.failedCount} failed`,
        );
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to send message",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Quick Send
        </Typography.Title>
        <Typography.Text type="secondary">
          Send one-off approved WhatsApp templates to a saved test audience.
        </Typography.Text>
      </div>

      <Alert
        type="info"
        showIcon
        message="Preview is required before sending. Meta link tracking is enabled for Feature Article templates."
      />

      <Form
        form={form}
        layout="vertical"
        onValuesChange={() => {
          setPreview(null);
          setSendResult(null);
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 24,
            alignItems: "start",
          }}
        >
          <section>
            <Typography.Title level={4}>Message</Typography.Title>

            <Form.Item
              name="templateName"
              label="Template"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: "Feature Article", value: "feature_article" },
                  {
                    label: "Feature Article · Ahangama Pass",
                    value: "qs_feature_article_ahangama_pass",
                  },
                ]}
              />
            </Form.Item>

            <Form.Item name="name" label="Internal name">
              <Input placeholder="Ahangama Circle launch article" />
            </Form.Item>

            {selectedTemplate === "feature_article" ? (
              <FeatureArticleForm />
            ) : (
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Article">
                  Inside Ahangama Circle
                </Descriptions.Item>
                <Descriptions.Item label="Message">
                  Fixed approved copy with personalized contact name
                </Descriptions.Item>
                <Descriptions.Item label="Actions">
                  Read Story · I'd love to attend the next event.
                </Descriptions.Item>
              </Descriptions>
            )}
          </section>

          <section>
            <Typography.Title level={4}>Delivery</Typography.Title>

            <Form.Item
              name="whatsappSenderKey"
              label="Sending number"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: "Ahangama", value: "ahangama" },
                  { label: "Ahangama Pass", value: "ahangama_pass" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="audienceId"
              label="Test audience"
              rules={[{ required: true, message: "Select a test audience" }]}
            >
              <Select
                loading={loadingAudiences}
                options={audiences.map((audience) => ({
                  label: `${audience.name} (${audience.memberCount})`,
                  value: audience.id,
                }))}
              />
            </Form.Item>

            <Button loading={previewing} onClick={() => void previewMessage()}>
              Preview message and recipients
            </Button>
          </section>
        </div>
      </Form>

      {preview && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 24,
          }}
        >
          <Card title="Message preview">
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Space>
                <Tag color="green">Approved</Tag>
                <Typography.Text type="secondary">
                  {preview.templateName} · {preview.languageCode}
                </Typography.Text>
              </Space>
              <Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>
                {preview.preview}
              </Typography.Paragraph>
            </Space>
          </Card>

          <Card title={`Recipients (${preview.members.length})`}>
            <List
              size="small"
              dataSource={preview.members}
              renderItem={(member) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      [member.firstName, member.lastName]
                        .filter(Boolean)
                        .join(" ") || "WhatsApp guest"
                    }
                    description={
                      member.normalizedPhoneNumber || member.phoneNumber
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </div>
      )}

      {preview && (
        <Space>
          <Popconfirm
            title={`Send to ${preview.members.length} recipients?`}
            description="Meta may charge for each accepted marketing message."
            okText="Send now"
            onConfirm={() => void sendMessage()}
          >
            <Button type="primary" icon={<SendOutlined />} loading={sending}>
              Send now
            </Button>
          </Popconfirm>
        </Space>
      )}

      {sendResult && (
        <Card title="Send result">
          <Descriptions column={{ xs: 1, sm: 3 }} size="small">
            <Descriptions.Item label="Recipients">
              {sendResult.recipientCount}
            </Descriptions.Item>
            <Descriptions.Item label="Accepted">
              {sendResult.sentCount}
            </Descriptions.Item>
            <Descriptions.Item label="Failed">
              {sendResult.failedCount}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  );
}