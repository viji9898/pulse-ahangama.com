import { Form, Input } from "antd";

const { TextArea } = Input;

export default function VenueFeatureForm() {
  return (
    <>
      <Form.Item
        name={["content", "venueName"]}
        label="Venue"
        rules={[{ required: true }]}
      >
        <Input placeholder="Kaffi" />
      </Form.Item>

      <Form.Item
        name={["content", "description"]}
        label="Recommendation"
        rules={[{ required: true, min: 10 }]}
      >
        <TextArea
          rows={4}
          maxLength={500}
          showCount
          placeholder="A relaxed beachfront café..."
        />
      </Form.Item>

      <Form.Item
        name={["content", "offer"]}
        label="Offer or practical detail"
        rules={[{ required: true }]}
      >
        <Input placeholder="Show your Ahangama Pass for 10% off." />
      </Form.Item>

      <Form.Item
        name={["content", "url"]}
        label="Tracked venue URL"
        rules={[{ required: true }, { type: "url" }]}
      >
        <Input placeholder="https://ahangama.com/kaffi?utm_..." />
      </Form.Item>
    </>
  );
}
