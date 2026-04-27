import { getRuntimeConfig } from '../../config/runtime-config-store';

const href = (override: string | undefined, fallback: string): string => {
  const t = override?.trim();
  return t === undefined || t === '' ? fallback : t;
};

export default function FavIcons() {
  const { env } = getRuntimeConfig();
  return (
    <>
      <link
        rel="icon"
        type="image/png"
        sizes="96x96"
        href={href(env.NEXT_PUBLIC_FAVICON_PNG_96_URL, '/favicon/favicon-96x96.png')}
      />
      <link
        rel="icon"
        type="image/x-icon"
        href={href(env.NEXT_PUBLIC_FAVICON_ICO_URL, '/favicon/favicon.ico')}
      />
      <link
        rel="icon"
        type="image/svg+xml"
        href={href(env.NEXT_PUBLIC_FAVICON_SVG_URL, '/favicon/favicon.svg')}
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href={href(env.NEXT_PUBLIC_APPLE_TOUCH_ICON_URL, '/favicon/apple-touch-icon.png')}
      />
    </>
  );
}
