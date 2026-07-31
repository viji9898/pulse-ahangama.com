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

type LiveAudience = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  memberCount: number;
  createdAt: string;
};

type LiveAudienceMember = {
  guestId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  normalizedPhoneNumber: string | null;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
  memberType?: string | null;
  audienceType?: string | null;
  sourceHotelSlug?: string | null;
  country?: string | null;
  destination?: string | null;
  passStatus?: string | null;
  venueName?: string | null;
};

type MemberFormValues = {
  memberId?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
  memberType?: string;
  audienceType?: string;
  sourceHotelSlug?: string;
  country?: string;
  destination?: string;
  venueName?: string;
};

function getLiveAudienceKind(audienceId?: string | null) {
  if (audienceId == null) {
    return null;
  }

  return audienceId.startsWith("live:") ? audienceId.slice(5) : null;
}

const audienceColumns: ColumnsType<LiveAudience> = [
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

const memberColumns: ColumnsType<LiveAudienceMember> = [
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
    title: "Email",
    dataIndex: "email",
    key: "email",
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
  {
    title: "Marketing opt-in",
    dataIndex: "emailOptIn",
    key: "emailOptIn",
    render: (value: boolean) => (value ? "Yes" : "No"),
  },
];

export default function LiveAudiencesPage() {
  const [form] = Form.useForm<MemberFormValues>();
  const [audiences, setAudiences] = useState<LiveAudience[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<LiveAudience | null>(null);
  const [members, setMembers] = useState<LiveAudienceMember[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  function memberToLabel(member: LiveAudienceMember): string {
    return [member.firstName, member.lastName].filter(Boolean).join(" ") || "-";
  }

  async function loadMembersByAudienceId(audienceId: string) {
    const response = await fetch(
      `/api/test-audiences/members?audienceId=${encodeURIComponent(audienceId)}`,
    );

    if (!response.ok) {
      throw new Error("Unable to load live audience members");
    }

    const data = (await response.json()) as {
      members: LiveAudienceMember[];
    };

    return data.members;
  }

  async function loadMembers(audience: LiveAudience) {
    setLoadingMembers(true);

    try {
      const data = await loadMembersByAudienceId(audience.id);
      setSelectedAudience(audience);
      setMembers(data);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to load live audience members",
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  function openCreateModal() {
    if (!selectedAudience) {
      return;
    }

    setEditingMemberId(null);
    form.setFieldsValue({
      memberId: undefined,
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      whatsappOptIn: false,
      emailOptIn: false,
      memberType: "",
      audienceType: "",
      sourceHotelSlug: "",
      country: "",
      destination: "",
      venueName: "",
    });
    setModalOpen(true);
  }

  function openEditModal(member: LiveAudienceMember) {
    setEditingMemberId(member.guestId);
    form.setFieldsValue({
      memberId: member.guestId,
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      phoneNumber: member.phoneNumber || "",
      whatsappOptIn: member.whatsappOptIn,
      emailOptIn: member.emailOptIn,
      memberType: member.memberType || "",
      audienceType: member.audienceType || "",
      sourceHotelSlug: member.sourceHotelSlug || "",
      country: member.country || "",
      destination: member.destination || "",
      venueName: member.venueName || "",
    });
    setModalOpen(true);
  }

  async function saveMember() {
    if (!selectedAudience) {
      return;
    }

    try {
      const values = await form.validateFields();
      setSavingMember(true);

      const response = await fetch("/api/live-audiences/member-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audienceId: selectedAudience.id,
          memberId: values.memberId,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          whatsappOptIn: values.whatsappOptIn,
          emailOptIn: values.emailOptIn,
          memberType: values.memberType,
          audienceType: values.audienceType,
          sourceHotelSlug: values.sourceHotelSlug,
          country: values.country,
          destination: values.destination,
          venueName: values.venueName,
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        members?: LiveAudienceMember[];
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to save live audience member");
      }

      message.success(editingMemberId ? "Member updated" : "Member added");
      setModalOpen(false);
      setMembers(result.members ?? []);
      await loadAudiences(selectedAudience.id);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSavingMember(false);
    }
  }

  async function deleteMember(memberId: string) {
    if (!selectedAudience) {
      return;
    }

    setDeletingMemberId(memberId);

    try {
      const response = await fetch("/api/live-audiences/member-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audienceId: selectedAudience.id, memberId }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        members?: LiveAudienceMember[];
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete live audience member");
      }

      message.success("Member deleted");
      setMembers(result.members ?? []);
      await loadAudiences(selectedAudience.id);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Unable to delete live audience member",
      );
    } finally {
      setDeletingMemberId(null);
    }
  }

  async function loadAudiences(preferredAudienceId?: string | null) {
    setLoadingAudiences(true);

    try {
      const response = await fetch("/api/test-audiences?kind=live");

      if (!response.ok) {
        throw new Error("Unable to load live audiences");
      }

      const data = (await response.json()) as {
        audiences: LiveAudience[];
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
        error instanceof Error ? error.message : "Unable to load live audiences",
      );
    } finally {
      setLoadingAudiences(false);
    }
  }

  useEffect(() => {
    void loadAudiences();
  }, []);

  const audienceKind = getLiveAudienceKind(selectedAudience?.id);

  const memberColumnsWithActions: ColumnsType<LiveAudienceMember> = [
    ...memberColumns,
    {
      title: "Actions",
      key: "actions",
      render: (_, member) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(member)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete member?"
            description="This removes the member from the live audience source table."
            okText="Delete"
            okButtonProps={{ danger: true, loading: deletingMemberId === member.guestId }}
            onConfirm={() => void deleteMember(member.guestId)}
          >
            <Button danger icon={<DeleteOutlined />} loading={deletingMemberId === member.guestId}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row align="middle" justify="space-between" gutter={[16, 16]}>
        <Col>
          <Space direction="vertical" size={0}>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Live Audiences
            </Typography.Title>
            <Typography.Text type="secondary">
              Dynamic live audiences populated from `DATABASE_URL_AHANGAMA_PASS` using circle, hospo, and pass_guests members.
            </Typography.Text>
          </Space>
        </Col>

        <Col>
          <Space>
            <Button
              icon={<PlusOutlined />}
              disabled={!selectedAudience}
              onClick={openCreateModal}
            >
              Add member
            </Button>
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
            <Statistic title="Live audiences" value={audiences.length} />
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
              title="Active live audiences"
              value={audiences.filter((audience) => audience.active).length}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Saved live audiences">
            <Table<LiveAudience>
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
          <Card title="Selected live audience">
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
                <Descriptions.Item label="Source">
                  DATABASE_URL_AHANGAMA_PASS
                </Descriptions.Item>
                <Descriptions.Item label="Audience kind">
                  {audienceKind || "-"}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="No live audiences found" />
            )}
          </Card>
        </Col>
      </Row>

      <Card title={`Members${selectedAudience ? `: ${selectedAudience.name}` : ""}`}>
        <Table<LiveAudienceMember>
          rowKey="guestId"
          columns={memberColumnsWithActions}
          dataSource={members}
          loading={loadingMembers}
          pagination={false}
          locale={{ emptyText: "Select a live audience to view its members" }}
        />
      </Card>

      <Modal
        title={editingMemberId ? "Edit live audience member" : "Add live audience member"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void saveMember()}
        okText={editingMemberId ? "Save changes" : "Create member"}
        confirmLoading={savingMember}
        width={760}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ whatsappOptIn: false, emailOptIn: false }}
        >
          <Form.Item name="memberId" hidden>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="First name" name="firstName">
                <Input placeholder="Viji" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Last name" name="lastName">
                <Input placeholder="Pragnaratn" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Enter an email address" },
                  { type: "email", message: "Enter a valid email address" },
                ]}
              >
                <Input placeholder="name@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Phone number" name="phoneNumber">
                <Input placeholder="+94 77 662 0320" />
              </Form.Item>
            </Col>
          </Row>

          {audienceKind === "circle" ? (
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Member type"
                  name="memberType"
                  rules={[{ required: true, message: "Enter a member type" }]}
                >
                  <Input placeholder="member" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Venue name" name="venueName">
                  <Input placeholder="Surf Club Midigama" />
                </Form.Item>
              </Col>
            </Row>
          ) : null}

          {audienceKind === "hospo" ? (
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Audience type"
                  name="audienceType"
                  rules={[{ required: true, message: "Enter an audience type" }]}
                >
                  <Input placeholder="resident" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Source hotel slug" name="sourceHotelSlug">
                  <Input placeholder="lighthouse-hotel" />
                </Form.Item>
              </Col>
            </Row>
          ) : null}

          {audienceKind === "pass_guests" ? (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Country" name="country">
                  <Input placeholder="Sri Lanka" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Source hotel slug" name="sourceHotelSlug">
                  <Input placeholder="lighthouse-hotel" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Destination" name="destination">
                  <Input placeholder="Ahangama" />
                </Form.Item>
              </Col>
            </Row>
          ) : null}

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="WhatsApp opt-in" name="whatsappOptIn" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Marketing opt-in" name="emailOptIn" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}