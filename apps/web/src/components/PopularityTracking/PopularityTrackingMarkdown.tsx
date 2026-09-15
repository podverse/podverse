'use client';

import { parsePopularityTrackingMarkdown } from '@podverse/helpers';

import { Link } from '../Link/Link';

type PopularityTrackingMarkdownProps = {
  markdown: string;
};

export function PopularityTrackingMarkdown({ markdown }: PopularityTrackingMarkdownProps) {
  const blocks = parsePopularityTrackingMarkdown(markdown);

  return (
    <div>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'heading') {
          return <h2 key={`heading-${blockIndex}`}>{block.text}</h2>;
        }
        if (block.type === 'list') {
          return (
            <ul key={`list-${blockIndex}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`item-${blockIndex}-${itemIndex}`}>
                  {item.map((span, spanIndex) =>
                    span.type === 'link' ? (
                      <Link href={span.href} key={`span-${blockIndex}-${itemIndex}-${spanIndex}`}>
                        {span.text}
                      </Link>
                    ) : (
                      <span key={`span-${blockIndex}-${itemIndex}-${spanIndex}`}>{span.text}</span>
                    )
                  )}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`paragraph-${blockIndex}`}>
            {block.spans.map((span, spanIndex) =>
              span.type === 'link' ? (
                <Link href={span.href} key={`span-${blockIndex}-${spanIndex}`}>
                  {span.text}
                </Link>
              ) : (
                <span key={`span-${blockIndex}-${spanIndex}`}>{span.text}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}
