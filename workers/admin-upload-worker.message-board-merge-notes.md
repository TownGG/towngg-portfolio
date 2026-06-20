# Message Board moderation merge notes

This note tracks the intended safe merge into `workers/admin-upload-worker.js`.

Do not change existing upload, image management, or Community Ops functions. Only add:

- `isMessageBoardList`
- `isMessageBoardDelete`
- `isMessageBoardRoute`
- `/api/admin/message-board-list` dispatch
- `/api/admin/message-board-delete` dispatch
- GraphQL helper functions for listing and deleting GitHub Discussion comments

The existing frontend already calls:

- `/api/admin/message-board-list`
- `/api/admin/message-board-delete`

The active worker must expose these two routes for the Admin Message Board tab to work.
