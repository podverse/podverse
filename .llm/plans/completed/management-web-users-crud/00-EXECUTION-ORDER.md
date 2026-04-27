---
name: management-web-users-crud
status: completed
---

# Execution Order

All phases are sequential.

| Phase | Plan File | Description |
|-------|-----------|-------------|
| 01 | `01-management-api-user-crud.md` | CRUD endpoints + configurable TTL |
| 02 | `02-shared-ui-table-components.md` | Table, Pagination in @podverse/ui |
| 03 | `03-users-list-page.md` | Replace "coming soon" with paginated table |
| 04 | `04-user-detail-and-edit.md` | Detail view, edit form, delete action |
| 05 | `05-invite-links-management.md` | Active invite links listing and management |
| 06 | `06-integration-tests.md` | Integration tests for all new endpoints |
