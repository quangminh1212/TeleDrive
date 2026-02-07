// Auto-detect API base URL
// In Tauri production: origin = "https://tauri.localhost" or "tauri://localhost" → must use backend URL
// In dev mode: origin = "http://localhost:1420" → use origin (proxied to backend)
// In web mode: origin = "http://127.0.0.1:5000" → use origin
const origin = window.location.origin;
const isTauri = origin.includes('tauri.localhost') || origin.startsWith('tauri://');
const isDevOrWeb = !isTauri && (origin.includes('localhost') || origin.includes('127.0.0.1'));
export const API_BASE_URL = isDevOrWeb ? origin : 'http://127.0.0.1:5000';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// File data matching backend response
export interface FileInfo {
    id: number | string;
    name: string;
    filename?: string;
    type: 'file' | 'folder' | string;
    size?: number;
    file_size?: number;
    modified: string;
    mimeType?: string;
    mime_type?: string;
    file_type?: string;
    folder_name?: string;
    telegram_channel?: string;
    storage_type?: string;
    source?: string;
    owner?: string;
    path?: string;
    is_favorite?: boolean;
    created_at?: string;
}

// Pagination info from backend
export interface PaginationInfo {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_prev: boolean;
    has_next: boolean;
    prev_num: number | null;
    next_num: number | null;
}

// Files response with pagination
export interface FilesResponse {
    files: FileInfo[];
    pagination: PaginationInfo;
}

interface UserInfo {
    id: number;
    username: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    phone?: string;
}

interface StorageInfo {
    used: number;
    total: number;
    files_count: number;
}

class ApiService {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                // Provide specific error messages based on status code
                let errorMessage = data.message || data.error || 'Request failed';

                switch (response.status) {
                    case 401:
                        errorMessage = 'Session expired. Please log in again.';
                        break;
                    case 403:
                        errorMessage = 'You don\'t have permission to perform this action.';
                        break;
                    case 404:
                        errorMessage = 'Resource not found.';
                        break;
                    case 413:
                        errorMessage = 'File too large. Maximum size is 2GB.';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                    case 502:
                    case 503:
                    case 504:
                        errorMessage = 'Server is temporarily unavailable. Please try again.';
                        break;
                }

                return { success: false, error: errorMessage };
            }

            return { success: true, data };
        } catch (error) {
            console.error('API Error:', error);

            // Provide specific error message for network errors
            if (error instanceof TypeError && error.message.includes('fetch')) {
                return { success: false, error: 'Cannot connect to server. Please check your connection.' };
            }

            return { success: false, error: 'Network error - Please check your connection and try again.' };
        }
    }

    // Auth endpoints
    async checkAuth(): Promise<ApiResponse<UserInfo>> {
        return this.request('/api/check-auth');
    }

    async login(phone: string): Promise<ApiResponse<{ phone_code_hash: string }>> {
        return this.request('/api/send-code', {
            method: 'POST',
            body: JSON.stringify({ phone }),
        });
    }

    async verifyCode(phone: string, code: string, phone_code_hash: string): Promise<ApiResponse<UserInfo>> {
        return this.request('/api/verify-code', {
            method: 'POST',
            body: JSON.stringify({ phone, code, phone_code_hash }),
        });
    }

    async autoLogin(): Promise<ApiResponse<UserInfo>> {
        return this.request('/api/auto-login', { method: 'POST' });
    }

    async logout(): Promise<ApiResponse<void>> {
        return this.request('/logout', { method: 'POST' });
    }

    // File endpoints - using public API v2 (no login required)
    async getFiles(page: number = 1, perPage: number = 100): Promise<ApiResponse<FilesResponse>> {
        return this.request(`/api/v2/files?page=${page}&per_page=${perPage}`);
    }

    async searchFiles(query: string): Promise<ApiResponse<FilesResponse>> {
        // Search with query param - will filter on client side for now
        return this.request(`/api/v2/files?per_page=100&search=${encodeURIComponent(query)}`);
    }

    async uploadFile(file: File, folderId?: string): Promise<ApiResponse<{ files: FileInfo[] }>> {
        const formData = new FormData();
        formData.append('files', file);
        if (folderId) formData.append('folder_id', folderId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v2/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',  // Include session cookie for user authentication
            });

            const data = await response.json();
            return { success: data.success, data, error: data.error };
        } catch (error) {
            console.error('Upload error:', error);
            return { success: false, error: 'Upload failed' };
        }
    }

    async uploadFiles(files: File[], folderId?: string): Promise<ApiResponse<{ files: FileInfo[] }>> {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        if (folderId) formData.append('folder_id', folderId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v2/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',  // Include session cookie for user authentication
            });

            const data = await response.json();
            return { success: data.success, data, error: data.error };
        } catch (error) {
            console.error('Upload error:', error);
            return { success: false, error: 'Upload failed' };
        }
    }



    async deleteFile(fileId: number | string): Promise<ApiResponse<void>> {
        return this.request('/api/delete_file', {
            method: 'POST',
            body: JSON.stringify({ id: fileId }),
        });
    }

    async renameFile(fileId: number, newName: string): Promise<ApiResponse<FileInfo>> {
        return this.request(`/api/files/${fileId}/rename`, {
            method: 'POST',
            body: JSON.stringify({ name: newName }),
        });
    }

    async downloadFile(_fileId: number | string, filename: string): Promise<string> {
        // fileId is kept for future use when we implement direct file download by ID
        return `${API_BASE_URL}/download/${filename}`;
    }

    // Storage info
    async getStorageInfo(): Promise<ApiResponse<StorageInfo>> {
        return this.request('/api/storage');
    }

    // Start scan
    async startScan(channel: string): Promise<ApiResponse<{ message: string }>> {
        return this.request('/api/start_scan', {
            method: 'POST',
            body: JSON.stringify({ channel }),
        });
    }

    // Stop scan
    async stopScan(): Promise<ApiResponse<{ message: string }>> {
        return this.request('/api/stop_scan', { method: 'POST' });
    }

    // Rescan Saved Messages from Telegram
    async rescanSavedMessages(): Promise<ApiResponse<{
        message: string;
        stats: { total_telegram: number; added: number; removed: number };
        files: Array<{ message_id: number; filename: string; file_size: number; mime_type: string; type: string }>;
        removed_files: Array<{ id: number; filename: string; message_id: number }>;
    }>> {
        return this.request('/api/rescan_saved_messages', { method: 'POST' });
    }

    // ============== FOLDER MANAGEMENT ==============

    // Get all folders
    async getFolders(): Promise<ApiResponse<{ folders: FolderInfo[]; total: number }>> {
        return this.request('/api/v2/folders');
    }

    // Create a new folder
    async createFolder(name: string, parentId?: number): Promise<ApiResponse<{ folder: FolderInfo; message: string }>> {
        return this.request('/api/v2/folders', {
            method: 'POST',
            body: JSON.stringify({ name, parent_id: parentId }),
        });
    }

    // Move file to a folder
    async moveFileToFolder(fileId: number, folderId: number | null): Promise<ApiResponse<{
        file: { id: number; unique_id: string; filename: string; folder_id: number | null; folder_name: string };
        message: string;
    }>> {
        return this.request(`/api/v2/files/${fileId}/move`, {
            method: 'POST',
            body: JSON.stringify({ folder_id: folderId }),
        });
    }

    // Delete a folder
    async deleteFolder(folderId: number): Promise<ApiResponse<{ message: string; files_moved_to_root: number }>> {
        return this.request(`/api/v2/folders/${folderId}`, {
            method: 'DELETE',
        });
    }

    // Rename a folder
    async renameFolder(folderId: number, newName: string): Promise<ApiResponse<{ folder: FolderInfo; message: string }>> {
        return this.request(`/api/v2/folders/${folderId}/rename`, {
            method: 'POST',
            body: JSON.stringify({ name: newName }),
        });
    }

    // Get files in a specific folder
    async getFolderFiles(folderId: number, page: number = 1, perPage: number = 20): Promise<ApiResponse<{
        folder: FolderInfo;
        files: FileInfo[];
        pagination: PaginationInfo;
    }>> {
        return this.request(`/api/v2/folders/${folderId}/files?page=${page}&per_page=${perPage}`);
    }

    // Toggle star/favorite for a file
    async toggleFileStar(fileId: number): Promise<ApiResponse<{
        file: FileInfo;
        is_favorite: boolean;
        message: string;
    }>> {
        return this.request(`/api/v2/files/${fileId}/star`, {
            method: 'POST',
        });
    }

    // Toggle star/favorite for a folder
    async toggleFolderStar(folderId: number): Promise<ApiResponse<{
        folder: FolderInfo;
        is_favorite: boolean;
        message: string;
    }>> {
        return this.request(`/api/v2/folders/${folderId}/star`, {
            method: 'POST',
        });
    }

    // Get all starred items (files and folders)
    async getStarredItems(): Promise<ApiResponse<{
        files: FileInfo[];
        folders: FolderInfo[];
    }>> {
        return this.request('/api/v2/starred');
    }
}

// Folder data interface
export interface FolderInfo {
    id: number;
    name: string;
    parent_id: number | null;
    path: string;
    file_count: number;
    is_favorite?: boolean;
    created_at: string | null;
    updated_at?: string | null;
}

export const api = new ApiService();
export type { UserInfo, StorageInfo, ApiResponse };
