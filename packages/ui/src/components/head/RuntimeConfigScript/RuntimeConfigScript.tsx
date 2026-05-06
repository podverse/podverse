const serializeRuntimeConfig = (runtimeConfig: unknown): string => {
  return JSON.stringify(runtimeConfig).replace(/</g, '\\u003c');
};

export type RuntimeConfigScriptProps = {
  runtimeConfig: unknown;
  globalThisProperty: string;
};

export function RuntimeConfigScript({
  runtimeConfig,
  globalThisProperty,
}: RuntimeConfigScriptProps) {
  const script = `globalThis[${JSON.stringify(globalThisProperty)}] = ${serializeRuntimeConfig(runtimeConfig)};`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
