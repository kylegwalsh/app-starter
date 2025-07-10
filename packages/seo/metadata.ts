import { config } from '@repo/config';
import merge from 'lodash.merge';
import type { Metadata } from 'next';

type MetadataGeneratorProps = Omit<Metadata, 'description' | 'title'> & {
  title?: string;
  description?: string;
  image?: string;
};

/** Create standardized metadata for a page */
export const createMetadata = ({
  title,
  description,
  image,
  ...properties
}: MetadataGeneratorProps = {}): Metadata => {
  const parsedTitle = `${title ? `${title} | ` : ''}${config.app.name}`;

  /** The default metadata for the page */
  const defaultMetadata: Metadata = {
    title: parsedTitle,
    description,
    applicationName: config.app.name,
    metadataBase: config.app.url ? new URL(config.app.url) : undefined,
    authors: [
      {
        name: config.app.name,
        url: config.app.url,
      },
    ],
    creator: config.app.name,
    formatDetection: {
      telephone: false,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: parsedTitle,
    },
    openGraph: {
      title: parsedTitle,
      description,
      type: 'website',
      siteName: config.app.name,
      locale: 'en_US',
    },
    publisher: config.app.name,
  };

  // Merge the default metadata with the additional properties
  const metadata: Metadata = merge(defaultMetadata, properties);

  // Add the image to the open graph if it exists
  if (image && metadata.openGraph) {
    metadata.openGraph.images = [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: title ?? parsedTitle,
      },
    ];
  }

  return metadata;
};
