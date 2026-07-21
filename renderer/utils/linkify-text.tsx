import React, {ComponentType} from 'react';

const urlPattern = /(https?:\/\/[^\s<>]+)/g;

export const linkifyText = (
  text: string,
  Link: ComponentType<{href: string; children: React.ReactNode}>
) => text.split(urlPattern).map((part, index) => {
  if (part.startsWith('http')) {
    // The index disambiguates repeated links while preserving their source order.
    // eslint-disable-next-line react/no-array-index-key
    return <Link key={`${part}-${index}`} href={part}>{part}</Link>;
  }

  return part;
});
