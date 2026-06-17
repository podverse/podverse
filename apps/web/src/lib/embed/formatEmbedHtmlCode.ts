type HtmlTagAttribute = {
  name: string;
  value?: string;
};

function formatAttributes(attributes: HtmlTagAttribute[]): string {
  let formatted = '';

  for (const attribute of attributes) {
    if (attribute.value !== undefined) {
      formatted += ` ${attribute.name}="${attribute.value}"`;
    } else {
      formatted += ` ${attribute.name}`;
    }
  }

  return formatted;
}

export function formatHtmlElement(
  tagName: string,
  attributes: HtmlTagAttribute[],
  children?: string
): string {
  const attributeString = formatAttributes(attributes);

  if (children !== undefined) {
    return `<${tagName}${attributeString}>${children}</${tagName}>`;
  }

  return `<${tagName}${attributeString}></${tagName}>`;
}

export function formatEmbedIframeElement(
  embedUrl: string,
  options: {
    title: string;
    width?: number | string;
    height?: number | string;
    borderStyleAttribute?: string;
  }
): string {
  const attributes: HtmlTagAttribute[] = [];

  if (options.width !== undefined) {
    attributes.push({ name: 'width', value: String(options.width) });
  }

  if (options.height !== undefined) {
    attributes.push({ name: 'height', value: String(options.height) });
  }

  attributes.push(
    { name: 'frameborder', value: '0' },
    { name: 'allow', value: 'autoplay' },
    { name: 'title', value: options.title }
  );

  if (options.borderStyleAttribute !== undefined && options.borderStyleAttribute !== '') {
    attributes.push({ name: 'style', value: options.borderStyleAttribute });
  }

  attributes.push({ name: 'src', value: embedUrl });

  return formatHtmlElement('iframe', attributes);
}
