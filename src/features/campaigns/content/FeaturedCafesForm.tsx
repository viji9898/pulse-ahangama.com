import { Card, Form, Typography } from "antd";

const HERO_IMAGE = "best-cafes-og.jpg";
const GUIDE_LINK = "https://ahangama.com/eat";

export default function FeaturedCafesForm() {
  return (
    <>
      <Form.Item name={["content", "heroImage"]} initialValue={HERO_IMAGE} hidden>
        <input />
      </Form.Item>

      <Form.Item name={["content", "link"]} initialValue={GUIDE_LINK} hidden>
        <input />
      </Form.Item>

      <Card size="small">
        <Typography.Text strong>Featured Cafés</Typography.Text>

        <Typography.Paragraph style={{ marginTop: 12, marginBottom: 8 }}>
          Best Cafés in Ahangama
        </Typography.Paragraph>

        <Typography.Text type="secondary">
          This campaign uses the approved Meta template with a fixed image,
          restaurant list, footer, and buttons. Pulse only personalizes the
          guest&apos;s first name.
        </Typography.Text>
      </Card>
    </>
  );
}