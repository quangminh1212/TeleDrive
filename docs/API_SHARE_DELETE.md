# API: Share & Delete

## Create Share
POST /api/files/<file_id>/share
- Auth: required (login_required)
- Body (JSON):
  - name: string
  - description: string
  - can_view: bool (default true)
  - can_download: bool (default true)
  - can_preview: bool (default true)
  - max_downloads: int (optional)
  - max_views: int (optional)
  - password: string (optional)
  - expires_in_days: int (optional) or expires_at: ISO string
- Response: { success, share_link, share_url }

## List My Shares
GET /api/share_links
- Auth: required
- Response: { success, share_links[], pagination }

## Update Share
PUT /api/share_link/<id>/update
- Auth: required; must be owner (current_user)
- Body (JSON): any of
  - name, description, is_active
  - can_view, can_download, can_preview
  - max_downloads, max_views
  - expires_at: ISO string or null
  - password: string
- Response: { success, share_link }

## Share Analytics
GET /api/share_link/<id>/analytics
- Auth: required (owner)
- Response: { success, analytics }
  - total_views, total_downloads
  - percentages, expired flags, limits

## Public Share
GET /share/<token>
- Public landing page (may require password if set)

GET /share/<token>/download
- Public download; serves from file_path (uploads/output) or output by filename

## Delete File
POST /api/delete_file
- Auth: required
- Body (JSON): one of
  - { id } – soft delete DB record; if local and safe path in uploads/output, also removes file on disk
  - { filename } – legacy: delete only in output if extension is .json/.csv/.xlsx
- Response: { success, message, removed_physical? }

