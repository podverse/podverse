const href = (override: string | undefined, fallback: string): string => {
  const trimmed = override?.trim();
  return trimmed === undefined || trimmed === '' ? fallback : trimmed;
};

export type FavIconsProps = {
  faviconPng96Url?: string;
  faviconIcoUrl?: string;
  faviconSvgUrl?: string;
  appleTouchIconUrl?: string;
};

export function FavIcons({
  faviconPng96Url,
  faviconIcoUrl,
  faviconSvgUrl,
  appleTouchIconUrl,
}: FavIconsProps) {
  return (
    <>
      <link
        rel="icon"
        type="image/png"
        sizes="96x96"
        href={href(faviconPng96Url, '/favicon/favicon-96x96.png')}
      />
      <link rel="icon" type="image/x-icon" href={href(faviconIcoUrl, '/favicon/favicon.ico')} />
      <link rel="icon" type="image/svg+xml" href={href(faviconSvgUrl, '/favicon/favicon.svg')} />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href={href(appleTouchIconUrl, '/favicon/apple-touch-icon.png')}
      />
    </>
  );
}
