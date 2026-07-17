import { Card, Form, Typography } from "antd";

const HERO_IMAGE = "ahangama-guide-2026-27-header.jpg";
const GUIDE_LINK =
  "https://ahangama.com/guide?utm_source=whatsapp&utm_medium=message&utm_campaign=ahangama_guide_2026_27&utm_content=broadcast_v1";

export default function AhangamaGuideForm() {
  return (
    <>
      <Form.Item name={["content", "heroImage"]} initialValue={HERO_IMAGE} hidden>
        <input />
      </Form.Item>

      <Form.Item name={["content", "guideLink"]} initialValue={GUIDE_LINK} hidden>
        <input />
      </Form.Item>

      <Card size="small">
        <Typography.Text strong>Ahangama Guide 2026/27</Typography.Text>

        <Typography.Paragraph style={{ marginTop: 12, marginBottom: 8 }}>
          Welcome guests with the approved Ahangama Guide template.
        </Typography.Paragraph>

        <Typography.Text type="secondary">
          This campaign uses the approved Meta template with fixed guide copy,
          header image, footer, and buttons. Pulse only personalizes the
          guest&apos;s name.
        </Typography.Text>
      </Card>
    </>
  );
}