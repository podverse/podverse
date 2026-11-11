A brief Podcast Index outage on the recent-feeds poller no longer fails the Job. The run logs a warning, stops, and the next run continues from the last page it finished. A send failure, or a database or queue error, still fails the Job.

We are not adding a separate alert for repeated upstream errors. After this is on alpha, delete the old Failed Job for worker-recent-feeds if it is still listed, so Argo CD can clear Degraded.
