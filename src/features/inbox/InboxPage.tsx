import {
  Avatar,
  Badge,
  Button,
  Descriptions,
  Divider,
  Empty,
  Input,
  Layout,
  List,
  message as antMessage,
  Modal,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  ContactsOutlined,
  CopyOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";

const { Sider, Content } = Layout;
const { TextArea } = Input;

type WhatsAppSenderKey = "ahangama" | "ahangama_pass";
type SenderFilter = "all" | WhatsAppSenderKey;

const whatsappSenderLabels: Record<WhatsAppSenderKey, string> = {
  ahangama: "Ahangama",
  ahangama_pass: "Ahangama Pass",
};

const whatsappSenderColors: Record<WhatsAppSenderKey, string> = {
  ahangama: "blue",
  ahangama_pass: "cyan",
};

type ConversationSummary = {
  id: string;
  guestId: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  serviceWindowEndsAt: string | null;
  whatsappSenderKey: WhatsAppSenderKey | null;
};

type MessageRecord = {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  body: string | null;
  createdAt: string;
  whatsappSenderKey: WhatsAppSenderKey | null;
};

type ConversationDetail = {
  conversation: ConversationSummary;
  messages: MessageRecord[];
};

type GuestContactDetail = {
  guest: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    countryCode: string | null;
    whatsappOptIn: boolean;
    emailOptIn: boolean;
  };
  stays: Array<{
    id: string;
    accommodationName: string | null;
    arrivalDate: string | null;
    departureDate: string | null;
    source: string | null;
  }>;
  interests: Array<{
    id: string;
    interest: string;
  }>;
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [reply, setReply] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contact, setContact] = useState<GuestContactDetail | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [senderFilter, setSenderFilter] = useState<SenderFilter>("all");
  const [now] = useState(() => Date.now());

  const loadInbox = useCallback(async () => {
    const query =
      senderFilter === "all"
        ? ""
        : `?sender=${encodeURIComponent(senderFilter)}`;
    const response = await fetch(`/api/inbox${query}`);

    if (!response.ok) {
      throw new Error("Unable to load inbox");
    }

    const data = (await response.json()) as {
      conversations: ConversationSummary[];
    };

    setConversations(data.conversations);

    setSelectedId((current) =>
      current && data.conversations.some((item) => item.id === current)
        ? current
        : (data.conversations[0]?.id ?? null),
    );
  }, [senderFilter]);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);

    try {
      const response = await fetch(
        `/api/conversation/messages?conversationId=${encodeURIComponent(id)}`,
      );

      if (!response.ok) {
        throw new Error("Unable to load conversation");
      }

      const data = (await response.json()) as ConversationDetail;
      setDetail(data);

      await fetch("/api/conversation/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === id
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
    } catch (error) {
      antMessage.error(
        error instanceof Error ? error.message : "Unable to load conversation",
      );
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadInbox()
        .catch(() => antMessage.error("Unable to load inbox"))
        .finally(() => setLoadingInbox(false));
    });
  }, [loadInbox]);

  useEffect(() => {
    if (selectedId) {
      queueMicrotask(() => {
        void loadConversation(selectedId);
      });
    }
  }, [selectedId, loadConversation]);

  async function sendReply() {
    const body = reply.trim();

    if (!selectedId || !body) return;

    setSending(true);

    try {
      const response = await fetch("/api/conversation/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedId,
          body,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to send reply");
      }

      setReply("");
      await Promise.all([loadConversation(selectedId), loadInbox()]);
    } catch (error) {
      antMessage.error(
        error instanceof Error ? error.message : "Unable to send reply",
      );
    } finally {
      setSending(false);
    }
  }

  async function openContact(guestId: string) {
    setContactOpen(true);
    setContact(null);
    setLoadingContact(true);

    try {
      const response = await fetch(
        `/api/guest-detail?guestId=${encodeURIComponent(guestId)}`,
      );

      if (!response.ok) {
        throw new Error("Unable to load contact details");
      }

      setContact((await response.json()) as GuestContactDetail);
    } catch (error) {
      antMessage.error(
        error instanceof Error
          ? error.message
          : "Unable to load contact details",
      );
    } finally {
      setLoadingContact(false);
    }
  }

  async function copyContactAndMessage() {
    if (!contact) return;

    const name = [contact.guest.firstName, contact.guest.lastName]
      .filter(Boolean)
      .join(" ") || "WhatsApp guest";
    const latestInboundMessage = [...(detail?.messages ?? [])]
      .reverse()
      .find((message) => message.direction === "inbound" && message.body)
      ?.body?.trim();
    const contactLines = [
      "*Contact information*",
      `*Name:* ${name}`,
      contact.guest.phoneNumber
        ? `*Phone:* ${contact.guest.phoneNumber}`
        : null,
      contact.guest.email ? `*Email:* ${contact.guest.email}` : null,
      contact.guest.countryCode
        ? `*Country:* ${contact.guest.countryCode}`
        : null,
      "",
      "*Message:*",
      latestInboundMessage || "No inbound message available",
    ].filter((line): line is string => line !== null);

    try {
      await navigator.clipboard.writeText(contactLines.join("\n"));
      antMessage.success("Contact and message copied");
    } catch {
      antMessage.error("Unable to copy contact and message");
    }
  }

  if (loadingInbox) {
    return <Spin />;
  }

  return (
    <Layout
      style={{
        height: "calc(100vh - 112px)",
        background: "#fff",
        border: "1px solid #f0f0f0",
      }}
    >
      <Sider
        width={340}
        theme="light"
        style={{
          overflow: "auto",
          borderRight: "1px solid #f0f0f0",
        }}
      >
        <div style={{ padding: 20 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Inbox
          </Typography.Title>

          <Segmented
            block
            value={senderFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Ahangama", value: "ahangama" },
              { label: "Pass", value: "ahangama_pass" },
            ]}
            onChange={(value) => setSenderFilter(value as SenderFilter)}
            style={{ marginTop: 16 }}
          />
        </div>

        <List
          dataSource={conversations}
          locale={{ emptyText: "No conversations" }}
          renderItem={(conversation) => {
            const name =
              [conversation.firstName, conversation.lastName]
                .filter(Boolean)
                .join(" ") ||
              conversation.phoneNumber ||
              "WhatsApp guest";

            return (
              <List.Item
                onClick={() => setSelectedId(conversation.id)}
                style={{
                  cursor: "pointer",
                  padding: "14px 20px",
                  background:
                    selectedId === conversation.id ? "#f5f5f5" : "#fff",
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={conversation.unreadCount}>
                      <Avatar>{name.charAt(0).toUpperCase()}</Avatar>
                    </Badge>
                  }
                  title={
                    <Space size={6} wrap>
                      <span>{name}</span>
                      {conversation.whatsappSenderKey ? (
                        <Tag
                          color={
                            whatsappSenderColors[
                              conversation.whatsappSenderKey
                            ]
                          }
                          style={{ marginInlineEnd: 0 }}
                        >
                          {whatsappSenderLabels[
                            conversation.whatsappSenderKey
                          ]}
                        </Tag>
                      ) : null}
                    </Space>
                  }
                  description={conversation.lastMessagePreview}
                />
              </List.Item>
            );
          }}
        />
      </Sider>

      <Content
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {!selectedId ? (
          <Empty
            description="Select a conversation"
            style={{ marginTop: 120 }}
          />
        ) : loadingConversation ? (
          <Spin style={{ marginTop: 120 }} />
        ) : detail ? (
          <>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Space wrap>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {[detail.conversation.firstName, detail.conversation.lastName]
                    .filter(Boolean)
                    .join(" ") || detail.conversation.phoneNumber}
                </Typography.Title>

                {detail.conversation.serviceWindowEndsAt &&
                new Date(detail.conversation.serviceWindowEndsAt).getTime() >
                  now ? (
                  <Tag color="green">Reply window open</Tag>
                ) : (
                  <Tag color="orange">Template required</Tag>
                )}

                {detail.conversation.whatsappSenderKey ? (
                  <Tag
                    color={
                      whatsappSenderColors[
                        detail.conversation.whatsappSenderKey
                      ]
                    }
                  >
                    {whatsappSenderLabels[
                      detail.conversation.whatsappSenderKey
                    ]}
                  </Tag>
                ) : null}

                <Button
                  icon={<ContactsOutlined />}
                  onClick={() => void openContact(detail.conversation.guestId)}
                >
                  Contact info
                </Button>
              </Space>
            </div>

            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: 24,
                background: "#fafafa",
              }}
            >
              {detail.messages.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      item.direction === "outbound" ? "flex-end" : "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background:
                        item.direction === "outbound" ? "#e6f4ff" : "#fff",
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <Typography.Text>
                      {item.body ?? `[${item.status}]`}
                    </Typography.Text>

                    <div style={{ marginTop: 4 }}>
                      <Space size={4} wrap>
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 11 }}
                        >
                          {new Date(item.createdAt).toLocaleString()}
                          {item.direction === "outbound"
                            ? ` · ${item.status}`
                            : ""}
                        </Typography.Text>
                        {item.whatsappSenderKey ? (
                          <Tag
                            color={whatsappSenderColors[item.whatsappSenderKey]}
                            style={{
                              marginInlineEnd: 0,
                              fontSize: 10,
                              lineHeight: "16px",
                            }}
                          >
                            {item.direction === "inbound" ? "To" : "From"}{" "}
                            {whatsappSenderLabels[item.whatsappSenderKey]}
                          </Tag>
                        ) : null}
                      </Space>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: 16,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Space.Compact style={{ width: "100%" }}>
                <TextArea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Type a reply"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onPressEnter={(event) => {
                    if (!event.shiftKey) {
                      event.preventDefault();
                      void sendReply();
                    }
                  }}
                />

                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  disabled={!reply.trim()}
                  onClick={() => void sendReply()}
                >
                  Send
                </Button>
              </Space.Compact>
            </div>
          </>
        ) : null}
      </Content>

      <Modal
        open={contactOpen}
        onCancel={() => setContactOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setContactOpen(false)}>Close</Button>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              loading={loadingContact}
              disabled={!contact}
              onClick={() => void copyContactAndMessage()}
            >
              Copy contact &amp; message
            </Button>
          </Space>
        }
        title="Contact details"
        width={640}
        destroyOnHidden
      >
        {loadingContact ? (
          <div style={{ display: "grid", placeItems: "center", minHeight: 180 }}>
            <Spin />
          </div>
        ) : contact ? (
          <>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
              <Descriptions.Item label="Name" span={2}>
                {[contact.guest.firstName, contact.guest.lastName]
                  .filter(Boolean)
                  .join(" ") || "WhatsApp guest"}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {contact.guest.phoneNumber ? (
                  <Typography.Link href={`tel:${contact.guest.phoneNumber}`}>
                    {contact.guest.phoneNumber}
                  </Typography.Link>
                ) : (
                  "Not provided"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {contact.guest.email ? (
                  <Typography.Link href={`mailto:${contact.guest.email}`}>
                    {contact.guest.email}
                  </Typography.Link>
                ) : (
                  "Not provided"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Country">
                {contact.guest.countryCode || "Not provided"}
              </Descriptions.Item>
              <Descriptions.Item label="Consent">
                <Space size={4} wrap>
                  <Tag color={contact.guest.whatsappOptIn ? "green" : "default"}>
                    WhatsApp {contact.guest.whatsappOptIn ? "on" : "off"}
                  </Tag>
                  <Tag color={contact.guest.emailOptIn ? "green" : "default"}>
                    Email {contact.guest.emailOptIn ? "on" : "off"}
                  </Tag>
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Divider plain>
              Latest stay
            </Divider>

            {contact.stays[0] ? (
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="Accommodation">
                  {contact.stays[0].accommodationName || "Not provided"}
                </Descriptions.Item>
                <Descriptions.Item label="Source">
                  {contact.stays[0].source || "Not provided"}
                </Descriptions.Item>
                <Descriptions.Item label="Arrival">
                  {contact.stays[0].arrivalDate
                    ? new Date(contact.stays[0].arrivalDate).toLocaleDateString()
                    : "Not provided"}
                </Descriptions.Item>
                <Descriptions.Item label="Departure">
                  {contact.stays[0].departureDate
                    ? new Date(contact.stays[0].departureDate).toLocaleDateString()
                    : "Not provided"}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Typography.Text type="secondary">
                No stay details recorded
              </Typography.Text>
            )}

            <Divider plain>
              Interests
            </Divider>

            <Space wrap>
              {contact.interests.length ? (
                contact.interests.map((item) => (
                  <Tag key={item.id}>{item.interest}</Tag>
                ))
              ) : (
                <Typography.Text type="secondary">
                  No interests recorded
                </Typography.Text>
              )}
            </Space>
          </>
        ) : (
          <Empty description="Contact details unavailable" />
        )}
      </Modal>
    </Layout>
  );
}
