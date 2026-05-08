const ROBOTO_FILES = [
  'Roboto-Bold.ttf',
  'Roboto-Italic.ttf',
  'Roboto-Light.ttf',
  'Roboto-Medium.ttf',
  'Roboto-Regular.ttf',
] as const;

export type FontPreloadsProps = {
  /** Base URL path under each app's `public/`, ending with `/`. */
  basePath?: string;
};

export function FontPreloads({ basePath = '/fonts/Roboto/' }: FontPreloadsProps) {
  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return (
    <>
      {ROBOTO_FILES.map((file) => (
        <link
          key={file}
          rel="preload"
          href={`${prefix}${file}`}
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      ))}
    </>
  );
}
