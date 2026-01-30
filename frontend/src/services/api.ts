const API_BASE_URL = 'http://127.0.0.1:5000';

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
                return { success: false, error: data.message || data.error || 'Request failed' };
            }

            return { success: true, data };
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'Network error - Backend server may not be running' };
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
        // Using get_files and filter on client side for now
        // TODO: Add server-side search endpoint
        return this.request(`/api/get_files?per_page=100`);
    }

    async uploadFile(file: File, folderId?: string): Promise<ApiResponse<FileInfo>> {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            return { success: false, error: 'Upload failed' };
        }
    }

    async createFolder(name: string, parentId?: string): Promise<ApiResponse<FileInfo>> {
        return this.request('/api/folder', {
            method: 'POST',
            body: JSON.stringify({ name, parent_id: parentId }),
        });
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

    async downloadFile(fileId: number | string, filename: string): Promise<string> {
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
}

export const api = new ApiService();
export type { UserInfo, StorageInfo, ApiResponse };
