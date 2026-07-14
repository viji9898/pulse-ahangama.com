import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

type GuestDetail = {
  guest: {
    id: string;
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
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    direction: string;
    body: string | null;
    createdAt: string;
  }>;
};

type Props = {
  guestId: string | null;
  open: boolean;
  onClose: () => void;
};

export default function GuestProfileDrawer({ guestId, open, onClose }: Props) {
  const [detail, setDetail] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !guestId) return;

    async function loadGuest() {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/guest?guestId=${encodeURIComponent(guestId!)}`,
        );

        if (!response.ok) {
          throw new Error("Unable to load guest");
        }

        setDetail((await response.json()) as GuestDetail);
      } finally {
        setLoading(false);
      }
    }

    void loadGuest();
  }, [guestId, open]);

  const name = detail
    ? [detail.guest.firstName, detail.guest.lastName]
        .filter(Boolean)
        .join(" ") || "WhatsApp guest"
    : "Guest";

  return (
    <Drawer
      width={520}
      open={open}
      onClose={onClose}
      title={name}
      destroyOnClose
    >
      {loading ? (
        <Spin />
      ) : detail ? (
        <>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Phone">
              {detail.guest.phoneNumber || "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Email">
              {detail.guest.email || "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Country">
              {detail.guest.countryCode || "—"}
            </Descriptions.Item>

            <Descriptions.Item label="WhatsApp">
              {detail.guest.whatsappOptIn ? (
                <Tag color="green">Opted in</Tag>
              ) : (
                <Tag>Not opted in</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider>Stay</Divider>

          {detail.stays.length ? (
            detail.stays.map((stay) => (
              <Descriptions key={stay.id} column={1} size="small">
                <Descriptions.Item label="Accommodation">
                  {stay.accommodationName || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Dates">
                  {stay.arrivalDate
                    ? new Date(stay.arrivalDate).toLocaleDateString()
                    : "—"}
                  {" — "}
                  {stay.departureDate
                    ? new Date(stay.departureDate).toLocaleDateString()
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Source">
                  {stay.source || "—"}
                </Descriptions.Item>
              </Descriptions>
            ))
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No stay details"
            />
          )}

          <Divider>Interests</Divider>

          <Space wrap>
            {detail.interests.length ? (
              detail.interests.map((item) => (
                <Tag key={item.id}>{item.interest}</Tag>
              ))
            ) : (
              <Typography.Text type="secondary">
                No interests recorded
              </Typography.Text>
            )}
          </Space>

          <Divider>Recent messages</Divider>

          <List
            dataSource={detail.messages.slice(0, 10)}
            locale={{ emptyText: "No messages" }}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={item.direction === "inbound" ? "Guest" : "Ahangama"}
                  description={
                    <>
                      <div>{item.body}</div>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        {new Date(item.createdAt).toLocaleString()}
                      </Typography.Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />

          <Divider>Notes</Divider>

          <List
            dataSource={detail.notes}
            locale={{ emptyText: "No internal notes" }}
            renderItem={(note) => (
              <List.Item>
                <List.Item.Meta
                  description={
                    <>
                      <div>{note.body}</div>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        {new Date(note.createdAt).toLocaleString()}
                      </Typography.Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />

          <Divider />

          <Button type="primary">Edit guest</Button>
        </>
      ) : (
        <Empty description="Guest unavailable" />
      )}
    </Drawer>
  );
}
