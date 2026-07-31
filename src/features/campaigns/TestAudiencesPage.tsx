import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Switch,
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

type AudienceFormValues = {
  audienceId?: string;
  name: string;
  description?: string;
  active: boolean;
  members: Array<{
    firstName?: string;
    lastName?: string;
    phoneNumber: string;
    countryCode?: string;
  }>;
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
  const [form] = Form.useForm<AudienceFormValues>();
  const [audiences, setAudiences] = useState<TestAudience[]>([]);
  const [selectedAudience, setSelectedAudience] =
    useState<TestAudience | null>(null);
  const [members, setMembers] = useState<TestAudienceMember[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingAudience, setSavingAudience] = useState(false);
  const [deletingAudience, setDeletingAudience] = useState(false);
  const [editingAudienceId, setEditingAudienceId] = useState<string | null>(null);

  function memberToLabel(member: TestAudienceMember): string {
    return [member.firstName, member.lastName].filter(Boolean).join(" ") || "-";
  }

  async function loadMembersByAudienceId(audienceId: string) {
    const response = await fetch(
      `/api/test-audiences/members?audienceId=${encodeURIComponent(audienceId)}`,
    );

    if (!response.ok) {
      throw new Error("Unable to load test audience members");
    }

    const data = (await response.json()) as {
      members: TestAudienceMember[];
    };

    return data.members;
  }

  async function loadMembers(audience: TestAudience) {
    setLoadingMembers(true);

    try {
      const data = await loadMembersByAudienceId(audience.id);
      setSelectedAudience(audience);
      setMembers(data);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to load members",
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadAudiences(preferredAudienceId?: string | null) {
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
        preferredAudienceId != null
          ? data.audiences.find((audience) => audience.id === preferredAudienceId) ??
            data.audiences[0] ??
            null
          : selectedAudience == null
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

  function openCreateModal() {
    setEditingAudienceId(null);
    form.setFieldsValue({
      name: "",
      description: "",
      active: true,
      members: [{ firstName: "", lastName: "", phoneNumber: "", countryCode: "LK" }],
    });
    setModalOpen(true);
  }

  function openEditModal() {
    if (!selectedAudience) {
      return;
    }

    setEditingAudienceId(selectedAudience.id);
    form.setFieldsValue({
      audienceId: selectedAudience.id,
      name: selectedAudience.name,
      description: selectedAudience.description || "",
      active: selectedAudience.active,
      members: members.length
        ? members.map((member) => ({
            firstName: member.firstName || "",
            lastName: member.lastName || "",
            phoneNumber: member.phoneNumber || member.normalizedPhoneNumber || "",
            countryCode: "LK",
          }))
        : [{ firstName: "", lastName: "", phoneNumber: "", countryCode: "LK" }],
    });
    setModalOpen(true);
  }

  async function saveAudience() {
    try {
      const values = await form.validateFields();
      setSavingAudience(true);

      const response = await fetch("/api/test-audiences/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        audience?: TestAudience;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to save test audience");
      }

      message.success(editingAudienceId ? "Test audience updated" : "Test audience created");
      setModalOpen(false);
      form.resetFields();
      await loadAudiences(result.audience?.id ?? values.audienceId ?? null);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSavingAudience(false);
    }
  }

  async function deleteAudience() {
    if (!selectedAudience) {
      return;
    }

    setDeletingAudience(true);

    try {
      const response = await fetch("/api/test-audiences/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audienceId: selectedAudience.id }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete test audience");
      }

      message.success("Test audience deleted");
      await loadAudiences(null);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to delete test audience",
      );
    } finally {
      setDeletingAudience(false);
    }
  }

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
          <Space>
            <Button icon={<PlusOutlined />} onClick={openCreateModal}>
              Add audience
            </Button>
            <Button
              icon={<EditOutlined />}
              disabled={!selectedAudience}
              onClick={openEditModal}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete test audience?"
              description="This removes the audience and its member links. Guests stay in the database."
              okText="Delete"
              okButtonProps={{ danger: true, loading: deletingAudience }}
              onConfirm={() => void deleteAudience()}
              disabled={!selectedAudience}
            >
              <Button danger icon={<DeleteOutlined />} disabled={!selectedAudience}>
                Delete
              </Button>
            </Popconfirm>
            <Button
              icon={<ReloadOutlined />}
              loading={loadingAudiences}
              onClick={() => void loadAudiences(selectedAudience?.id ?? null)}
            >
              Refresh
            </Button>
          </Space>
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
                <Descriptions.Item label="Preview members">
                  {members.length > 0
                    ? members.map(memberToLabel).join(", ")
                    : "-"}
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

      <Modal
        title={editingAudienceId ? "Edit test audience" : "Add test audience"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void saveAudience()}
        okText={editingAudienceId ? "Save changes" : "Create audience"}
        confirmLoading={savingAudience}
        width={900}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ active: true, members: [] }}>
          <Form.Item name="audienceId" hidden>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Audience name"
                name="name"
                rules={[{ required: true, message: "Enter an audience name" }]}
              >
                <Input placeholder="Midgama USRF Club - Test" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Description" name="description">
                <Input placeholder="Internal testing list" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Active" name="active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Typography.Title level={5}>Members</Typography.Title>

          <Form.List name="members">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Member ${index + 1}`}
                    extra={
                      <Button danger type="text" onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    }
                  >
                    <Row gutter={12}>
                      <Col xs={24} md={6}>
                        <Form.Item label="First name" name={[field.name, "firstName"]}>
                          <Input placeholder="Viji" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item label="Last name" name={[field.name, "lastName"]}>
                          <Input placeholder="Pragnaratn" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Phone number"
                          name={[field.name, "phoneNumber"]}
                          rules={[{ required: true, message: "Enter a phone number" }]}
                        >
                          <Input placeholder="+94 77 662 0320" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item label="Country" name={[field.name, "countryCode"]}>
                          <Input placeholder="LK" maxLength={2} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add({ firstName: "", lastName: "", phoneNumber: "", countryCode: "LK" })}
                >
                  Add number
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Space>
  );
}