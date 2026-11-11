# 381 recent-feeds upstream exit

One change. Issue: https://github.com/podverse/podverse/issues/381

| Order | Plan | What it does |
| ----- | ---- | ------------ |
| 1 | `01-upstream-error-exit.md` | `/recent/data` retryable failures return `upstream_error` and the Job exits 0 |

The repeated-failure alert in the issue is out of scope.
