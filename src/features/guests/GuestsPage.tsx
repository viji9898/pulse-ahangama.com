import {
  Avatar,
  Button,
  Card,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";

type Guest = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  countryCode: string | null;
  whatsappOptIn: boolean;
  accommodationName: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  lastMessageAt: string | null;
};

type Props = {
  onOpenGuest: (guestId: string) => void;
};

export default function GuestsPage({ onOpenGuest }: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadGuests(value = "") {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/guests?search=${encodeURIComponent(value)}`,
      );

      if (!response.ok) {
        throw new Error("Unable to load guests");
      }

      const data = (await response.json()) as {
        guests: Guest[];
      };

      setGuests(data.guests);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadGuests();
    });
  }, []);

  const columns: ColumnsType<Guest> = [
    {
      title: "Guest",
      key: "guest",
      render: (_, guest) => {
        const name =
          [guest.firstName, guest.lastName].filter(Boolean).join(" ") ||
          "WhatsApp guest";

        return (
          <Space>
            <Avatar>{name.charAt(0).toUpperCase()}</Avatar>

            <div>
              <Typography.Text strong>{name}</Typography.Text>
              <br />
              <Typography.Text type="secondary">
                {guest.phoneNumber}
              </Typography.Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Stay",
      key: "stay",
      render: (_, guest) => (
        <div>
          <Typography.Text>
            {guest.accommodationName || "Not recorded"}
          </Typography.Text>
          <br />
          <Typography.Text type="secondary">
            {guest.arrivalDate
              ? new Date(guest.arrivalDate).toLocaleDateString()
              : "No dates"}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "WhatsApp",
      dataIndex: "whatsappOptIn",
      render: (enabled: boolean) =>
        enabled ? <Tag color="green">Opted in</Tag> : <Tag>Not opted in</Tag>,
    },
    {
      title: "Last contact",
      dataIndex: "lastMessageAt",
      render: (value: string | null) =>
        value ? new Date(value).toLocaleString() : "-",
    },
    {
      title: "",
      key: "action",
      render: (_, guest) => (
        <Button onClick={() => onOpenGuest(guest.id)}>View</Button>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Guests
          </Typography.Title>

          <Typography.Text type="secondary">
            Visitors, communication preferences and stay details.
          </Typography.Text>
        </div>

        <Card>
          <Input.Search
            value={search}
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search name, email or phone number"
            onChange={(event) => setSearch(event.target.value)}
            onSearch={(value) => void loadGuests(value)}
            style={{ maxWidth: 420 }}
          />
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={guests}
            loading={loading}
            pagination={{ pageSize: 20 }}
            onRow={(guest) => ({
              onDoubleClick: () => onOpenGuest(guest.id),
            })}
          />
        </Card>
      </Space>
    </div>
  );
}
