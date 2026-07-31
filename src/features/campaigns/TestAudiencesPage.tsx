import { ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

type TestAudience = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  memberCount: number;
  createdAt: string;
};

type TestAudienceMember = {
  guestId: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  normalizedPhoneNumber: string | null;
  whatsappOptIn: boolean;
};

const audienceColumns: ColumnsType<TestAudience> = [
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
  },
  {
    title: "Description",
    dataIndex: "description",
    key: "description",
    render: (value: string | null) => value || "-",
  },
  {
    title: "Members",
    dataIndex: "memberCount",
    key: "memberCount",
  },
  {
    title: "Status",
    dataIndex: "active",
    key: "active",
    render: (value: boolean) => (value ? "Active" : "Inactive"),
  },
];

const memberColumns: ColumnsType<TestAudienceMember> = [
  {
    title: "First name",
    dataIndex: "firstName",
    key: "firstName",
    render: (value: string | null) => value || "-",
  },
  {
    title: "Last name",
    dataIndex: "lastName",
    key: "lastName",
    render: (value: string | null) => value || "-",
  },
  {
    title: "Phone",
    dataIndex: "phoneNumber",
    key: "phoneNumber",
    render: (value: string | null) => value || "-",
  },
  {
    title: "WhatsApp opt-in",
    dataIndex: "whatsappOptIn",
    key: "whatsappOptIn",
    render: (value: boolean) => (value ? "Yes" : "No"),
  },
];

export default function TestAudiencesPage() {
  const [audiences, setAudiences] = useState<TestAudience[]>([]);
  const [selectedAudience, setSelectedAudience] =
    useState<TestAudience | null>(null);
  const [members, setMembers] = useState<TestAudienceMember[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  async function loadMembers(audience: TestAudience) {
    setLoadingMembers(true);

    try {
      const response = await fetch(
        `/api/test-audiences/members?audienceId=${encodeURIComponent(audience.id)}`,
      );

      if (!response.ok) {
        throw new Error("Unable to load test audience members");
      }

      const data = (await response.json()) as {
        members: TestAudienceMember[];
      };

      setSelectedAudience(audience);
      setMembers(data.members);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to load members",
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadAudiences() {
    setLoadingAudiences(true);

    try {
      const response = await fetch("/api/test-audiences");

      if (!response.ok) {
        throw new Error("Unable to load test audiences");
      }

      const data = (await response.json()) as {
        audiences: TestAudience[];
      };

      setAudiences(data.audiences);

      const nextAudience =
        selectedAudience == null
          ? data.audiences[0] ?? null
          : data.audiences.find((audience) => audience.id === selectedAudience.id) ??
            data.audiences[0] ??
            null;

      if (nextAudience) {
        void loadMembers(nextAudience);
      } else {
        setSelectedAudience(null);
        setMembers([]);
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to load test audiences",
      );
    } finally {
      setLoadingAudiences(false);
    }
  }

  useEffect(() => {
    void loadAudiences();
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row align="middle" justify="space-between" gutter={[16, 16]}>
        <Col>
          <Space direction="vertical" size={0}>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Test Audiences
            </Typography.Title>
            <Typography.Text type="secondary">
              View saved test audiences and inspect their current members.
            </Typography.Text>
          </Space>
        </Col>

        <Col>
          <Button
            icon={<ReloadOutlined />}
            loading={loadingAudiences}
            onClick={() => void loadAudiences()}
          >
            Refresh
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="Audiences" value={audiences.length} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Members in selected"
              value={selectedAudience?.memberCount ?? 0}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Active audiences"
              value={audiences.filter((audience) => audience.active).length}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Saved audiences">
            <Table<TestAudience>
              rowKey="id"
              columns={audienceColumns}
              dataSource={audiences}
              loading={loadingAudiences}
              pagination={false}
              rowSelection={{
                type: "radio",
                selectedRowKeys: selectedAudience ? [selectedAudience.id] : [],
                onChange: (selectedRowKeys) => {
                  const nextAudience = audiences.find(
                    (audience) => audience.id === selectedRowKeys[0],
                  );

                  if (nextAudience) {
                    void loadMembers(nextAudience);
                  }
                },
              }}
              onRow={(record) => ({
                onClick: () => {
                  void loadMembers(record);
                },
              })}
            />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="Selected audience">
            {selectedAudience ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Name">
                  {selectedAudience.name}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {selectedAudience.description || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {selectedAudience.active ? "Active" : "Inactive"}
                </Descriptions.Item>
                <Descriptions.Item label="Members">
                  {selectedAudience.memberCount}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="No test audiences found" />
            )}
          </Card>
        </Col>
      </Row>

      <Card title={`Members${selectedAudience ? `: ${selectedAudience.name}` : ""}`}>
        <Table<TestAudienceMember>
          rowKey="guestId"
          columns={memberColumns}
          dataSource={members}
          loading={loadingMembers}
          pagination={false}
          locale={{ emptyText: "Select a test audience to view its members" }}
        />
      </Card>
    </Space>
  );
}