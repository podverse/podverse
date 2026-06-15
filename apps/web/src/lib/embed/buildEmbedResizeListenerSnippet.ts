import { EMBED_RESIZE_MESSAGE_SOURCE, EMBED_RESIZE_MESSAGE_TYPE } from './embedResizeMessage';

type BuildEmbedResizeListenerSnippetInput = {
  embedOrigin: string;
};

export function buildEmbedResizeListenerSnippet({
  embedOrigin,
}: BuildEmbedResizeListenerSnippetInput): string {
  return `(function () {
  var EMBED_ORIGIN = ${JSON.stringify(embedOrigin)};
  var MESSAGE_SOURCE = ${JSON.stringify(EMBED_RESIZE_MESSAGE_SOURCE)};
  var MESSAGE_TYPE = ${JSON.stringify(EMBED_RESIZE_MESSAGE_TYPE)};

  window.addEventListener('message', function (event) {
    if (event.origin !== EMBED_ORIGIN) return;

    var data = event.data;
    if (!data || data.source !== MESSAGE_SOURCE || data.type !== MESSAGE_TYPE) return;
    if (typeof data.height !== 'number' || !isFinite(data.height) || data.height < 1) return;

    var iframe = document.querySelector('iframe[data-podverse-embed-resize]');
    if (!iframe) return;

    iframe.style.height = Math.ceil(data.height) + 'px';
  });
})();`;
}
