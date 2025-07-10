import type { Thing, WithContext } from 'schema-dts';

type Props = {
  code: WithContext<Thing>;
};

/** A component for rendering JSON-LD data on a page */
export const JsonLd = ({ code }: Props) => (
  <script
    type="application/ld+json"
    // biome-ignore lint/security/noDangerouslySetInnerHtml: "This is a JSON-LD script, not user-generated content."
    dangerouslySetInnerHTML={{ __html: JSON.stringify(code) }}
  />
);

export * from 'schema-dts';
