Finished runs of the manual notifications test Job now stay until newer runs replace them (the last 5 failures and the last 5 successes). A failed run no longer disappears after 10 minutes, so CronJobLastRunFailed stays until a later run succeeds, and the Job logs are still there for that check.

The failures in this thread were hand-triggered runs. A later run completed, and those logs were already gone, so the worker command is unchanged. The next failed run can be read with kubectl -n podverse-alpha logs job/<job-name> --tail=100.
