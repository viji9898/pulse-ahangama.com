import { Button, Card, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import CampaignComposerDrawer from "./CampaignComposerDrawer";

type Campaign = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "completed" | "cancelled";
  channel: string;
  templateName: string | null;
  recipientCount: number;
  estimatedMetaCostUsd: string;
  venuePriceUsd: string;
  venueName: string | null;
  scheduledAt: string | null;
  createdAt: string;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

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

  useEffect(() => {
    queueMicrotask(() => {
      void loadCampaigns();
    });
  }, []);

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
      render: (value: string) => `$${Number(value).toFixed(2)}`,
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
        />
      </Card>

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
