import {
  BarChartOutlined,
  DashboardOutlined,
  MessageOutlined,
  NotificationOutlined,
  ShopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Card, Col, Layout, Menu, Row, Statistic, Typography } from "antd";
import { useState } from "react";
import GuestProfileDrawer from "./features/guests/GuestProfileDrawer";
import GuestsPage from "./features/guests/GuestsPage";
import InboxPage from "./features/inbox/InboxPage";

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: "dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "guests",
    icon: <TeamOutlined />,
    label: "Guests",
  },
  {
    key: "inbox",
    icon: <MessageOutlined />,
    label: "Inbox",
  },
  {
    key: "campaigns",
    icon: <NotificationOutlined />,
    label: "Campaigns",
  },
  {
    key: "venues",
    icon: <ShopOutlined />,
    label: "Venues",
  },
  {
    key: "analytics",
    icon: <BarChartOutlined />,
    label: "Analytics",
  },
];

export default function App() {
  const [activePage, setActivePage] = useState("inbox");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: 600,
            padding: "22px 24px",
          }}
        >
          Ahangama Pulse
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activePage]}
          onClick={({ key }) => setActivePage(key)}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            paddingInline: 24,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            Visitor engagement
          </Typography.Title>
        </Header>

        <Content style={{ margin: 24 }}>
          {activePage === "inbox" && <InboxPage />}

          {activePage === "guests" && (
            <GuestsPage onOpenGuest={(guestId) => setSelectedGuestId(guestId)} />
          )}

          {activePage !== "inbox" && activePage !== "guests" && (
            <>
              <Typography.Title level={2}>Dashboard</Typography.Title>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Active guests" value={0} />
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="WhatsApps today" value={0} />
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Unread conversations" value={0} />
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Campaign revenue"
                      value={0}
                      prefix="$"
                      precision={2}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}

          <GuestProfileDrawer
            guestId={selectedGuestId}
            open={Boolean(selectedGuestId)}
            onClose={() => setSelectedGuestId(null)}
          />
        </Content>
      </Layout>
    </Layout>
  );
}
