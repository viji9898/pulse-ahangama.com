import { Card, DatePicker, Form, Input, Space, Typography } from "antd";
import dayjs from "dayjs";

const initialEvents = [
  { id: crypto.randomUUID() },
  { id: crypto.randomUUID() },
  { id: crypto.randomUUID() },
];

export default function WhatsOnTodayForm() {
  return (
    <>
      <Form.Item
        name={["content", "date"]}
        label="Events date"
        initialValue={dayjs()}
        getValueFromEvent={(value) => (value ? value.format("YYYY-MM-DD") : "")}
        getValueProps={(value) => ({
          value: value ? dayjs(value) : null,
        })}
        rules={[{ required: true }]}
      >
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>

      <Typography.Title level={5}>Featured events</Typography.Title>

      <Typography.Paragraph type="secondary">
        Select exactly three events. The buttons are already configured in the
        approved WhatsApp template.
      </Typography.Paragraph>

      <Form.List name={["content", "events"]} initialValue={initialEvents}>
        {(fields) => (
          <Space direction="vertical" style={{ width: "100%" }}>
            {fields.map((field, index) => (
              <Card
                key={field.key}
                size="small"
                title={`Event ${index + 1}`}
              >
                <Form.Item name={[field.name, "id"]} hidden>
                  <Input />
                </Form.Item>

                <Form.Item
                  name={[field.name, "title"]}
                  label="Event"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Live music" />
                </Form.Item>

                <Form.Item
                  name={[field.name, "venue"]}
                  label="Venue"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Kai Ahangama" />
                </Form.Item>

                <Form.Item
                  name={[field.name, "time"]}
                  label="Time"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="7:00 PM" />
                </Form.Item>

                <Form.Item
                  name={[field.name, "url"]}
                  label="Internal event URL"
                  tooltip="Stored for analytics; it is not inserted into this WhatsApp template."
                  rules={[{ type: "url" }]}
                >
                  <Input placeholder="https://ahangama.com/events/..." />
                </Form.Item>
              </Card>
            ))}
          </Space>
        )}
      </Form.List>
    </>
  );
}
