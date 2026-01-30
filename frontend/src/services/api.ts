const API_BASE_URL = 'http://127.0.0.1:5000';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

interface FileInfo {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: number;
    modified: string;
    mimeType?: string;
    path?: string;
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
                return { success: false, error: data.message || 'Request failed' };
            }

            return { success: true, data };
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'Network error' };
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

    // File endpoints
    async getFiles(folderId?: string): Promise<ApiResponse<FileInfo[]>> {
        const query = folderId ? `?folder=${folderId}` : '';
        return this.request(`/api/files${query}`);
    }

    async searchFiles(query: string): Promise<ApiResponse<FileInfo[]>> {
        return this.request(`/api/search?q=${encodeURIComponent(query)}`);
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

    async deleteFile(fileId: string): Promise<ApiResponse<void>> {
        return this.request(`/api/file/${fileId}`, { method: 'DELETE' });
    }

    async downloadFile(fileId: string): Promise<string> {
        return `${API_BASE_URL}/api/download/${fileId}`;
    }

    // Storage info
    async getStorageInfo(): Promise<ApiResponse<StorageInfo>> {
        return this.request('/api/storage');
    }
}

export const api = new ApiService();
export type { FileInfo, UserInfo, StorageInfo, ApiResponse };
