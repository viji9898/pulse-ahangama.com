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
import InboxPage from "./features/inbox/InboxPage";

const { Header, Sider, Content } = Layout;

export default function App() {
  const [selectedPage, setSelectedPage] = useState("dashboard");

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
          selectedKeys={[selectedPage]}
          onClick={({ key }) => setSelectedPage(key)}
          items={[
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
          ]}
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
          {selectedPage === "inbox" ? (
            <InboxPage />
          ) : (
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
        </Content>
      </Layout>
    </Layout>
  );
}
