const FONT_FILES_BY_VARIANT = {
  full: ['Roboto-Regular.ttf', 'Roboto-Light.ttf', 'Roboto-Bold.ttf'],
  minimal: ['Roboto-Regular.ttf'],
} as const;

export type FontPreloadsVariant = keyof typeof FONT_FILES_BY_VARIANT;

export type FontPreloadsProps = {
  /** Base URL path under each app's `public/`, ending with `/`. */
  basePath?: string;
  variant?: FontPreloadsVariant;
};

export function FontPreloads({ basePath = '/fonts/Roboto/', variant = 'full' }: FontPreloadsProps) {
  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const files = FONT_FILES_BY_VARIANT[variant];

  return (
    <>
      {files.map((file) => (
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
