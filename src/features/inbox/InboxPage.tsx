import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Layout,
  List,
  message as antMessage,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { SendOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";

const { Sider, Content } = Layout;
const { TextArea } = Input;

type ConversationSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  serviceWindowEndsAt: string | null;
};

type MessageRecord = {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  body: string | null;
  createdAt: string;
};

type ConversationDetail = {
  conversation: ConversationSummary;
  messages: MessageRecord[];
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<
    ConversationSummary[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(
    null,
  );
  const [reply, setReply] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingConversation, setLoadingConversation] =
    useState(false);
  const [sending, setSending] = useState(false);
  const [now] = useState(() => Date.now());

  const loadInbox = useCallback(async () => {
    const response = await fetch("/api/inbox");

    if (!response.ok) {
      throw new Error("Unable to load inbox");
    }

    const data = (await response.json()) as {
      conversations: ConversationSummary[];
    };

    setConversations(data.conversations);

    if (!selectedId && data.conversations[0]) {
      setSelectedId(data.conversations[0].id);
    }
  }, [selectedId]);

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
        error instanceof Error
          ? error.message
          : "Unable to load conversation",
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
      await Promise.all([
        loadConversation(selectedId),
        loadInbox(),
      ]);
    } catch (error) {
      antMessage.error(
        error instanceof Error
          ? error.message
          : "Unable to send reply",
      );
    } finally {
      setSending(false);
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
                    selectedId === conversation.id
                      ? "#f5f5f5"
                      : "#fff",
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={conversation.unreadCount}>
                      <Avatar>
                        {name.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  }
                  title={name}
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
              <Space>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {[
                    detail.conversation.firstName,
                    detail.conversation.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                    detail.conversation.phoneNumber}
                </Typography.Title>

                {detail.conversation.serviceWindowEndsAt &&
                new Date(
                  detail.conversation.serviceWindowEndsAt,
                ).getTime() > now ? (
                  <Tag color="green">Reply window open</Tag>
                ) : (
                  <Tag color="orange">Template required</Tag>
                )}
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
                      item.direction === "outbound"
                        ? "flex-end"
                        : "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background:
                        item.direction === "outbound"
                          ? "#e6f4ff"
                          : "#fff",
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <Typography.Text>
                      {item.body ?? `[${item.status}]`}
                    </Typography.Text>

                    <div style={{ marginTop: 4 }}>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 11 }}
                      >
                        {new Date(item.createdAt).toLocaleString()}
                        {item.direction === "outbound"
                          ? ` · ${item.status}`
                          : ""}
                      </Typography.Text>
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
    </Layout>
  );
}