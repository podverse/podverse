# Plan 04 - Jenkins alpha2\_ Job Creation

## Objective

Create new Jenkins jobs with ``naming convention to test the monorepo deployment pipeline separately from existing`alpha\_` jobs.

## Status: Pending

---

## Recommended Creation Order (by dependency/functionality)

### Phase 1: Infrastructure Foundation

These jobs establish the basic infrastructure and should be created first since other jobs depend on them.

| #   | Job Name             | Jenkinsfile                      | Status |
| --- | -------------------- | -------------------------------- | ------ |
| 1   | `aux_network_create` | `Jenkinsfile.aux_network_create` | ⬜     |
| 2   | `srv_network_create` | `Jenkinsfile.srv_network_create` | ⬜     |
| 3   | `aux_ops_git_pull`   | `Jenkinsfile.aux_ops_git_pull`   | ⬜     |
| 4   | `srv_ops_git_pull`   | `Jenkinsfile.srv_ops_git_pull`   | ⬜     |
| 5   | `u_ops_git_pull`     | `Jenkinsfile.u_ops_git_pull`     | ⬜     |

### Phase 2: Database Services (Aux Server)

Database must be running before any services that depend on it.

| #   | Job Name            | Jenkinsfile                     | Status |
| --- | ------------------- | ------------------------------- | ------ |
| 6   | `aux_db_init`       | `Jenkinsfile.aux_db_init`       | ⬜     |
| 7   | `aux_db_up`         | `Jenkinsfile.aux_db_up`         | ⬜     |
| 8   | `aux_db_down`       | `Jenkinsfile.aux_db_down`       | ⬜     |
| 9   | `aux_db_reset`      | `Jenkinsfile.aux_db_reset`      | ⬜     |
| 10  | `aux_keyvaldb_up`   | `Jenkinsfile.aux_keyvaldb_up`   | ⬜     |
| 11  | `aux_keyvaldb_down` | `Jenkinsfile.aux_keyvaldb_down` | ⬜     |
| 12  | `aux_mq_up`         | `Jenkinsfile.aux_mq_up`         | ⬜     |
| 13  | `aux_mq_down`       | `Jenkinsfile.aux_mq_down`       | ⬜     |

### Phase 3: Management Database (Optional)

| #   | Job Name                  | Jenkinsfile                           | Status |
| --- | ------------------------- | ------------------------------------- | ------ |
| 14  | `aux_management_db_init`  | `Jenkinsfile.aux_management_db_init`  | ⬜     |
| 15  | `aux_management_db_up`    | `Jenkinsfile.aux_management_db_up`    | ⬜     |
| 16  | `aux_management_db_down`  | `Jenkinsfile.aux_management_db_down`  | ⬜     |
| 17  | `aux_management_db_reset` | `Jenkinsfile.aux_management_db_reset` | ⬜     |

### Phase 4: Core Services (Srv Server)

| #   | Job Name       | Jenkinsfile                | Status |
| --- | -------------- | -------------------------- | ------ |
| 18  | `srv_api_up`   | `Jenkinsfile.srv_api_up`   | ⬜     |
| 19  | `srv_api_down` | `Jenkinsfile.srv_api_down` | ⬜     |
| 20  | `srv_web_up`   | `Jenkinsfile.srv_web_up`   | ⬜     |
| 21  | `srv_web_down` | `Jenkinsfile.srv_web_down` | ⬜     |

### Phase 5: Management Services (Optional)

| #   | Job Name                  | Jenkinsfile                           | Status |
| --- | ------------------------- | ------------------------------------- | ------ |
| 22  | `srv_management_api_up`   | `Jenkinsfile.srv_management_api_up`   | ⬜     |
| 23  | `srv_management_api_down` | `Jenkinsfile.srv_management_api_down` | ⬜     |
| 24  | `srv_management_web_up`   | `Jenkinsfile.srv_management_web_up`   | ⬜     |
| 25  | `srv_management_web_down` | `Jenkinsfile.srv_management_web_down` | ⬜     |

### Phase 6: Orchestration/Deployment Jobs

| #   | Job Name                  | Jenkinsfile                                 | Status |
| --- | ------------------------- | ------------------------------------------- | ------ |
| 26  | `deploy_all`              | `Jenkinsfile.alpha_deploy_all`              | ⬜     |
| 27  | `reset_db_and_deploy_all` | `Jenkinsfile.alpha_reset_db_and_deploy_all` | ⬜     |

### Phase 7: All-Down Jobs (Convenience)

| #   | Job Name       | Jenkinsfile                | Status |
| --- | -------------- | -------------------------- | ------ |
| 28  | `aux_all_down` | `Jenkinsfile.aux_all_down` | ⬜     |
| 29  | `srv_all_down` | `Jenkinsfile.srv_all_down` | ⬜     |
| 30  | `u_all_down`   | `Jenkinsfile.u_all_down`   | ⬜     |

### Phase 8: Worker Jobs (Aux Server)

| #   | Job Name                                                           | Jenkinsfile                                                                    | Status |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------ |
| 31  | `aux_workers_pull`                                                 | `Jenkinsfile.aux_workers_pull`                                                 | ⬜     |
| 32  | `aux_workers_down`                                                 | `Jenkinsfile.aux_workers_down`                                                 | ⬜     |
| 33  | `aux_workers_archive_all`                                          | `Jenkinsfile.aux_workers_archive_all`                                          | ⬜     |
| 34  | `aux_workers_mq_rss_add`                                           | `Jenkinsfile.aux_workers_mq_rss_add`                                           | ⬜     |
| 35  | `aux_workers_mq_rss_add_all`                                       | `Jenkinsfile.aux_workers_mq_rss_add_all`                                       | ⬜     |
| 36  | `aux_workers_mq_rss_add_recently_updated_feeds_from_podcast_index` | `Jenkinsfile.aux_workers_mq_rss_add_recently_updated_feeds_from_podcast_index` | ⬜     |
| 37  | `aux_workers_mq_rss_run_parsers`                                   | `Jenkinsfile.aux_workers_mq_rss_run_parsers`                                   | ⬜     |
| 38  | `aux_workers_mq_rss_run_parsers_all`                               | `Jenkinsfile.aux_workers_mq_rss_run_parsers_all`                               | ⬜     |
| 39  | `aux_workers_mq_rss_stop_parsers`                                  | `Jenkinsfile.aux_workers_mq_rss_stop_parsers`                                  | ⬜     |
| 40  | `aux_workers_mq_rss_run_dlq_consumer`                              | `Jenkinsfile.aux_workers_mq_rss_run_dlq_consumer`                              | ⬜     |
| 41  | `aux_workers_mq_rss_run_live_item_listener`                        | `Jenkinsfile.aux_workers_mq_rss_run_live_item_listener`                        | ⬜     |
| 42  | `aux_workers_orm_feed_update_flag_status`                          | `Jenkinsfile.aux_workers_orm_feed_update_flag_status`                          | ⬜     |
| 43  | `aux_workers_orm_on_demand_parser_event_delete_outdated`           | `Jenkinsfile.aux_workers_orm_on_demand_parser_event_delete_outdated`           | ⬜     |
| 44  | `aux_workers_orm_on_demand_parser_event_generate_reports`          | `Jenkinsfile.aux_workers_orm_on_demand_parser_event_generate_reports`          | ⬜     |
| 45  | `aux_workers_parser_rss_parse_feed`                                | `Jenkinsfile.aux_workers_parser_rss_parse_feed`                                | ⬜     |
| 46  | `aux_workers_podcast_index_dead_feeds_delete_cache`                | `Jenkinsfile.aux_workers_podcast_index_dead_feeds_delete_cache`                | ⬜     |
| 47  | `aux_workers_podcast_index_dead_feeds_flag_and_merge`              | `Jenkinsfile.aux_workers_podcast_index_dead_feeds_flag_and_merge`              | ⬜     |

### Phase 9: Cleanup/Utility Jobs

| #   | Job Name                  | Jenkinsfile                           | Status |
| --- | ------------------------- | ------------------------------------- | ------ |
| 48  | `aux_docker_prune_images` | `Jenkinsfile.aux_docker_prune_images` | ⬜     |
| 49  | `srv_docker_prune_images` | `Jenkinsfile.srv_docker_prune_images` | ⬜     |
| 50  | `aux_network_remove`      | `Jenkinsfile.aux_network_remove`      | ⬜     |
| 51  | `srv_network_remove`      | `Jenkinsfile.srv_network_remove`      | ⬜     |

---

## Summary by Priority

| Priority                                            | Jobs          | Count |
| --------------------------------------------------- | ------------- | ----- |
| **Critical** (must create to test basic deployment) | Phases 1-4, 6 | ~27   |
| **Important** (for full functionality)              | Phases 5, 7-8 | ~20   |
| **Nice to have** (maintenance/cleanup)              | Phase 9       | ~4    |

---

## Minimum Viable Set for Testing

If you want to test the basic deployment pipeline first, create these 15 jobs in order:

| #   | Job Name             | Purpose                       |
| --- | -------------------- | ----------------------------- |
| 1   | `aux_network_create` | Create Docker network on aux  |
| 2   | `srv_network_create` | Create Docker network on srv  |
| 3   | `aux_ops_git_pull`   | Pull latest code on aux       |
| 4   | `srv_ops_git_pull`   | Pull latest code on srv       |
| 5   | `aux_db_init`        | Initialize database container |
| 6   | `aux_db_up`          | Start database                |
| 7   | `aux_keyvaldb_up`    | Start Redis                   |
| 8   | `aux_mq_up`          | Start message queue           |
| 9   | `srv_api_up`         | Start API server              |
| 10  | `srv_web_up`         | Start web app                 |
| 11  | `deploy_all`         | Full deployment orchestration |
| 12  | `aux_db_down`        | Stop database                 |
| 13  | `srv_api_down`       | Stop API                      |
| 14  | `srv_web_down`       | Stop web app                  |
| 15  | `aux_all_down`       | Stop all on aux               |

---

## Job Creation Method

Each job is created in Jenkins using the `scm-job.xml` template with the script path replaced:

1. In Jenkins, navigate to `pipelines/alpha` folder
2. Create new Pipeline job with name `<job_suffix>`
3. Configure Pipeline from SCM:
   - Repository: `https://github.com/podverse/podverse.git`
   - Branch: `*/v5-develop`
   - Script Path: `pipelines/jenkins/alpha/Jenkinsfile.<job_suffix>`
   - Enable sparse checkout (same paths as in `scm-job.xml`)

Or use Jenkins CLI / Job DSL to automate creation from the template.

---

## Notes

- All Jenkinsfiles are located in `podverse/pipelines/jenkins/alpha/`
- The `scm-job.xml` template uses sparse checkout for: `pipelines/jenkins/`, `infra/docker/`, `infra/config/`, `scripts/`, `Makefile`, `Makefile.alpha`
- These jobs will use the monorepo paths (`/opt/podverse/infra/config/alpha/`) configured via Ansible
