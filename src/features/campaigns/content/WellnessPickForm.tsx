import { Form, Input } from "antd";

const { TextArea } = Input;

export default function WellnessPickForm() {
  return (
    <>
      <Form.Item
        name={["content", "venueName"]}
        label="Wellness venue"
        rules={[{ required: true }]}
      >
        <Input placeholder="Pura Pilates" />
      </Form.Item>

      <Form.Item
        name={["content", "description"]}
        label="Why we recommend it"
        rules={[{ required: true, min: 10 }]}
      >
        <TextArea
          rows={4}
          maxLength={500}
          showCount
          placeholder="A considered Pilates studio..."
        />
      </Form.Item>

      <Form.Item
        name={["content", "practicalDetail"]}
        label="Class, availability or offer"
        rules={[{ required: true }]}
      >
        <Input placeholder="Morning reformer classes available today." />
      </Form.Item>

      <Form.Item
        name={["content", "url"]}
        label="Tracked details URL"
        rules={[{ required: true }, { type: "url" }]}
      >
        <Input placeholder="https://ahangama.com/pura-pilates?utm_..." />
      </Form.Item>
    </>
  );
}
