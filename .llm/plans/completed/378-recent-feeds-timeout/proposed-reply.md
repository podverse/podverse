Podcast Index page requests from the recent-feeds job now wait 30 seconds and retry a timeout. If the page still does not answer, the job stops cleanly and the next run continues from the last finished page, instead of failing.

Failed-job history is unchanged. After this is on alpha, delete the old Failed Jobs in podverse-alpha so Argo CD drops the Degraded status.
