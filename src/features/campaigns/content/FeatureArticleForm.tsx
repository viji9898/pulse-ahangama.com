import { Form, Input, Typography } from "antd";

const { TextArea } = Input;
const exampleArticleUrl =
  "https://ahangama.com/inside-the-launch-of-ahangama-circle/";

function getButtonUrl(value?: string): string {
  try {
    const url = new URL(value || exampleArticleUrl);

    if (url.hostname !== "ahangama.com") {
      return exampleArticleUrl;
    }

    return new URL(url.pathname, "https://www.ahangama.com").toString();
  } catch {
    return getButtonUrl(exampleArticleUrl);
  }
}

export default function FeatureArticleForm() {
  const articleUrl = Form.useWatch(["content", "articleUrl"]);

  return (
    <>
      <Form.Item
        name={["content", "articleTitle"]}
        label="Article title"
        rules={[{ required: true, min: 2, max: 200 }]}
      >
        <Input placeholder="Inside the Launch of Ahangama Circle" />
      </Form.Item>

      <Form.Item
        name={["content", "description"]}
        label="Description"
        rules={[{ required: true, min: 10, max: 1000 }]}
      >
        <TextArea
          rows={5}
          maxLength={1000}
          showCount
          placeholder="A concise introduction to the article..."
        />
      </Form.Item>

      <Form.Item
        name={["content", "articleUrl"]}
        label="Article URL"
        extra={
          <>
            <div>Meta link tracking is enabled for this template.</div>
            <Typography.Text type="secondary">
              Button URL preview: {getButtonUrl(articleUrl)}
            </Typography.Text>
          </>
        }
        rules={[
          { required: true },
          { type: "url" },
          {
            validator: async (_, value: string | undefined) => {
              if (!value) return;

              let url: URL;

              try {
                url = new URL(value);
              } catch {
                throw new Error("Enter a valid article URL");
              }

              if (
                url.protocol !== "https:" ||
                url.hostname !== "ahangama.com" ||
                url.pathname === "/" ||
                url.search ||
                url.hash
              ) {
                throw new Error(
                  "Enter a canonical https://ahangama.com article URL",
                );
              }
            },
          },
        ]}
      >
        <Input placeholder={exampleArticleUrl} />
      </Form.Item>
    </>
  );
}