import { Card, Form, Typography } from "antd";

const IMAGE_URL =
  "https://customer-apps-techhq.s3.eu-west-2.amazonaws.com/app-ahangama-pulse/surfclub-midigama/soul_therapy.jpg";
const INSTAGRAM_URL = "https://www.instagram.com/surfclubmidigama/";
const CALL_US_NUMBER = "+94 77 662 0320";

export default function FeatureEventSoulTherapyForm() {
  return (
    <>
      <Form.Item name={["content", "imageUrl"]} initialValue={IMAGE_URL} hidden>
        <input />
      </Form.Item>

      <Form.Item
        name={["content", "instagramUrl"]}
        initialValue={INSTAGRAM_URL}
        hidden
      >
        <input />
      </Form.Item>

      <Form.Item
        name={["content", "callUsNumber"]}
        initialValue={CALL_US_NUMBER}
        hidden
      >
        <input />
      </Form.Item>

      <Card size="small">
        <Typography.Text strong>Feature Event: Soul Therapy</Typography.Text>

        <Typography.Paragraph style={{ marginTop: 12, marginBottom: 8 }}>
          Promote the Midigama Surf Club Soul Therapy Music event with the
          approved fixed-copy template.
        </Typography.Paragraph>

        <Typography.Text type="secondary">
          This campaign uses a fixed image header, fixed event copy, and the
          supplied reservation and Instagram call-to-actions. Pulse only
          personalizes the guest&apos;s name.
        </Typography.Text>
      </Card>
    </>
  );
}