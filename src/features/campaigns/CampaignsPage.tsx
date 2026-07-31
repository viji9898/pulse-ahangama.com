import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  List,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import CampaignComposerDrawer from "./CampaignComposerDrawer.tsx";

type WhatsAppSenderKey = "ahangama" | "ahangama_pass";

const whatsappSenderLabels: Record<WhatsAppSenderKey, string> = {
  ahangama: "Ahangama",
  ahangama_pass: "Ahangama Pass",
};

type Campaign = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "completed" | "cancelled";
  channel: string;
  whatsappSenderKey: WhatsAppSenderKey;
  templateName: string | null;
  audienceDefinition?: {
    audienceIds?: string[];
  };
  recipientCount: number;
  estimatedMetaCostUsd: string;
  venuePriceUsd: string;
  venueName: string | null;
  scheduledAt: string | null;
  createdAt: string;
};

type TestAudience = {
  id: string;
  kind: "test" | "live";
  name: string;
  description: string | null;
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

type TestResult = {
  ok: boolean;
  testRunId: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [testAudiences, setTestAudiences] = useState<TestAudience[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>();
  const [selectedCampaignAudienceIds, setSelectedCampaignAudienceIds] = useState<string[]>([]);
  const [previewMembers, setPreviewMembers] = useState<TestAudienceMember[]>(
    [],
  );
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [previewingMembers, setPreviewingMembers] = useState(false);
  const [updatingAudience, setUpdatingAudience] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [scheduling, setScheduling] = useState(false);

  async function loadCampaigns() {
    setLoading(true);

    try {
      const response = await fetch("/api/campaigns");

      if (!response.ok) {
        throw new Error("Unable to load campaigns");
      }

      const data = (await response.json()) as {
        campaigns: Campaign[];
      };

      setCampaigns(data.campaigns);
    } finally {
      setLoading(false);
    }
  }

  async function loadTestAudiences() {
    const [testResponse, liveResponse] = await Promise.all([
      fetch("/api/test-audiences"),
      fetch("/api/test-audiences?kind=live"),
    ]);

    if (!testResponse.ok || !liveResponse.ok) {
      throw new Error("Unable to load audiences");
    }

    const [testData, liveData] = (await Promise.all([
      testResponse.json(),
      liveResponse.json(),
    ])) as [{ audiences: TestAudience[] }, { audiences: TestAudience[] }];

    const allAudiences = [...testData.audiences, ...liveData.audiences];
    const testOnlyAudiences = allAudiences.filter((audience) => audience.kind === "test");

    setTestAudiences(allAudiences);

    const defaultAudience =
      testOnlyAudiences.find((audience) => audience.name === "Internal Test") ??
      testOnlyAudiences[0];

    if (defaultAudience) {
      setSelectedAudienceId(defaultAudience.id);
    }
  }

  async function updateCampaignAudience() {
    if (!selectedCampaign) return;

    setUpdatingAudience(true);

    try {
      const response = await fetch("/api/campaigns/update-audience", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          audience: {
            audienceIds: selectedCampaignAudienceIds,
          },
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        campaign?: Campaign;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to update campaign audience");
      }

      message.success("Campaign audience updated");
      setTestResult(null);
      await loadCampaigns();
      if (result.campaign) {
        setSelectedCampaign(result.campaign);
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to update campaign audience",
      );
    } finally {
      setUpdatingAudience(false);
    }
  }

  async function previewSelectedMembers() {
    if (!selectedAudienceId) return;

    setPreviewingMembers(true);

    try {
      const response = await fetch(
        `/api/test-audiences/members?audienceId=${encodeURIComponent(
          selectedAudienceId,
        )}`,
      );

      if (!response.ok) {
        throw new Error("Unable to load test audience members");
      }

      const data = (await response.json()) as {
        members: TestAudienceMember[];
      };

      setPreviewMembers(data.members);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to preview members",
      );
    } finally {
      setPreviewingMembers(false);
    }
  }

  async function sendTest() {
    if (!selectedCampaign || !selectedAudienceId) return;

    setTesting(true);

    try {
      const response = await fetch("/api/campaigns/send-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          audienceId: selectedAudienceId,
        }),
      });

      const result = (await response.json()) as TestResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to send test");
      }

      setTestResult(result);
      message.success("Test sent");
      await loadCampaigns();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to send test",
      );
    } finally {
      setTesting(false);
    }
  }

  async function scheduleCampaign() {
    if (!selectedCampaign || !selectedDate) return;

    setScheduling(true);

    try {
      const response = await fetch("/api/campaigns/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          scheduledAt: selectedDate.toISOString(),
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to schedule campaign");
      }

      message.success("Campaign scheduled");
      setSelectedCampaign(null);
      setTestResult(null);
      setSelectedDate(null);
      await loadCampaigns();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to schedule campaign",
      );
    } finally {
      setScheduling(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadCampaigns();
      void loadTestAudiences().catch((error) => {
        message.error(
          error instanceof Error
            ? error.message
            : "Unable to load test audiences",
        );
      });
    });
  }, []);

  useEffect(() => {
    if (!selectedCampaign) {
      setSelectedCampaignAudienceIds([]);
      return;
    }

    setSelectedCampaignAudienceIds(selectedCampaign.audienceDefinition?.audienceIds ?? []);
  }, [selectedCampaign]);

  const testOnlyAudiences = testAudiences.filter((audience) => audience.kind === "test");
  const selectableAudienceOptions = [
    {
      label: "Live audiences",
      options: testAudiences
        .filter((audience) => audience.kind === "live")
        .map((audience) => ({
          label: `${audience.name} (${audience.memberCount})`,
          value: audience.id,
        })),
    },
    {
      label: "Test audiences",
      options: testAudiences
        .filter((audience) => audience.kind === "test")
        .map((audience) => ({
          label: `${audience.name} (${audience.memberCount})`,
          value: audience.id,
        })),
    },
  ];

  const columns: ColumnsType<Campaign> = [
    {
      title: "Campaign",
      dataIndex: "name",
      render: (name: string, campaign) => (
        <div>
          <Typography.Text strong>{name}</Typography.Text>

          <br />

          <Typography.Text type="secondary">
            {campaign.venueName || "Ahangama campaign"}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: Campaign["status"]) => {
        const colour =
          status === "completed"
            ? "green"
            : status === "sending"
              ? "blue"
              : status === "scheduled"
                ? "purple"
                : status === "cancelled"
                  ? "red"
                  : "default";

        return <Tag color={colour}>{status}</Tag>;
      },
    },
    {
      title: "Template",
      dataIndex: "templateName",
      render: (value: string | null) => value || "—",
    },
    {
      title: "Audience",
      dataIndex: "recipientCount",
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "Meta cost",
      dataIndex: "estimatedMetaCostUsd",
      render: (value: string) => `$${Number(value).toFixed(4)}`,
    },
    {
      title: "Venue price",
      dataIndex: "venuePriceUsd",
      render: (value: string) => `$${Number(value).toFixed(2)}`,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: "",
      key: "view",
      render: (_, campaign) => (
        <Button onClick={() => setSelectedCampaign(campaign)}>View</Button>
      ),
    },
  ];

  const totalRevenue = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.venuePriceUsd),
    0,
  );

  const totalMetaCost = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.estimatedMetaCostUsd),
    0,
  );

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Campaigns
          </Typography.Title>

          <Typography.Text type="secondary">
            Targeted WhatsApp recommendations for visitors currently in
            Ahangama.
          </Typography.Text>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void loadCampaigns()}
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setComposerOpen(true)}
          >
            Create campaign
          </Button>
        </Space>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
        }}
      >
        <Card>
          <Statistic title="Campaigns" value={campaigns.length} />
        </Card>

        <Card>
          <Statistic
            title="Campaign revenue"
            value={totalRevenue}
            precision={2}
            prefix="$"
          />
        </Card>

        <Card>
          <Statistic
            title="Estimated Meta cost"
            value={totalMetaCost}
            precision={2}
            prefix="$"
          />
        </Card>

        <Card>
          <Statistic
            title="Estimated gross profit"
            value={totalRevenue - totalMetaCost}
            precision={2}
            prefix="$"
          />
        </Card>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={campaigns}
          pagination={{
            pageSize: 20,
          }}
          onRow={(campaign) => ({
            onDoubleClick: () => setSelectedCampaign(campaign),
          })}
        />
      </Card>

      <Drawer
        width={560}
        open={Boolean(selectedCampaign)}
        title={selectedCampaign?.name ?? "Campaign"}
        onClose={() => {
          setSelectedCampaign(null);
          setPreviewMembers([]);
          setTestResult(null);
          setSelectedDate(null);
        }}
      >
        {selectedCampaign && (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Template">
                {selectedCampaign.templateName || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Sending number">
                {whatsappSenderLabels[selectedCampaign.whatsappSenderKey]}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag>{selectedCampaign.status}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Space direction="vertical" style={{ width: "100%" }}>
              <Typography.Text strong>Test audience</Typography.Text>
              <Select
                value={selectedAudienceId}
                style={{ width: "100%" }}
                placeholder="Select test audience"
                options={testOnlyAudiences.map((audience) => ({
                  label: `${audience.name} (${audience.memberCount})`,
                  value: audience.id,
                }))}
                onChange={(value) => {
                  setSelectedAudienceId(value);
                  setPreviewMembers([]);
                  setTestResult(null);
                }}
              />

              <Space>
                <Button
                  loading={previewingMembers}
                  disabled={!selectedAudienceId}
                  onClick={() => void previewSelectedMembers()}
                >
                  Preview members
                </Button>

                <Button
                  type="primary"
                  loading={testing}
                  disabled={!selectedAudienceId}
                  onClick={() => void sendTest()}
                >
                  Send test
                </Button>
              </Space>
            </Space>

            <Space direction="vertical" style={{ width: "100%" }}>
              <Typography.Text strong>Campaign audience</Typography.Text>
              <Select
                mode="multiple"
                value={selectedCampaignAudienceIds}
                style={{ width: "100%" }}
                placeholder="Select live or test audiences for this campaign"
                options={selectableAudienceOptions}
                onChange={(value) => setSelectedCampaignAudienceIds(value)}
                disabled={selectedCampaign.status === "sending" || selectedCampaign.status === "completed" || selectedCampaign.status === "cancelled"}
              />

              <Button
                loading={updatingAudience}
                disabled={
                  selectedCampaign.status === "sending" ||
                  selectedCampaign.status === "completed" ||
                  selectedCampaign.status === "cancelled" ||
                  selectedCampaignAudienceIds.length === 0
                }
                onClick={() => void updateCampaignAudience()}
              >
                Update campaign audience
              </Button>

              <Typography.Text type="secondary">
                Use this for older campaigns before sending. It rebuilds the recipient snapshot with live audiences and removes duplicate phone numbers across all selected audiences.
              </Typography.Text>
            </Space>

            {previewMembers.length > 0 && (
              <List
                size="small"
                header="Preview members"
                dataSource={previewMembers}
                renderItem={(member) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        [member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(" ") || "WhatsApp guest"
                      }
                      description={
                        member.normalizedPhoneNumber ||
                        member.phoneNumber ||
                        "—"
                      }
                    />
                    {member.whatsappOptIn ? (
                      <Tag color="green">Opted in</Tag>
                    ) : (
                      <Tag>Not opted in</Tag>
                    )}
                  </List.Item>
                )}
              />
            )}

            {testResult && (
              <Card>
                <Typography.Text strong>Test sent</Typography.Text>
                <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
                  <Descriptions.Item label="Recipients">
                    {testResult.recipientCount}
                  </Descriptions.Item>
                  <Descriptions.Item label="Accepted">
                    {testResult.sentCount}
                  </Descriptions.Item>
                  <Descriptions.Item label="Failed">
                    {testResult.failedCount}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {testResult && (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Typography.Text strong>Schedule</Typography.Text>
                <DatePicker
                  showTime
                  value={selectedDate}
                  style={{ width: "100%" }}
                  disabledDate={(date) => date.isBefore(dayjs().startOf("day"))}
                  onChange={setSelectedDate}
                />
                <Button
                  type="primary"
                  loading={scheduling}
                  disabled={!selectedDate}
                  onClick={() => void scheduleCampaign()}
                >
                  Schedule campaign
                </Button>
              </Space>
            )}
          </Space>
        )}
      </Drawer>

      <CampaignComposerDrawer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={async () => {
          setComposerOpen(false);
          await loadCampaigns();
        }}
      />
    </Space>
  );
}
