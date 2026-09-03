# 20 — Complete subscription hydration

Remove the arbitrary directory subscription page ceiling. Validate page metadata, reject
non-advancing or malformed responses, preserve the previous cache when a walk fails, and replace a
successful directory cache atomically. Add focused unit coverage for known and unknown page counts,
the former ceiling boundary, and malformed metadata.

Do not run tests during implementation; provide operator verification commands in the response.
