/** Base64url segment for a dynamic `[key]` route under `/storage/`. */
export function encodeStorageObjectKeyForPathSegment(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b === undefined) {
      break;
    }
    binary += String.fromCharCode(b);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeStorageObjectKeyFromPathSegment(segment: string): string | null {
  try {
    let b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(out);
  } catch {
    return null;
  }
}
