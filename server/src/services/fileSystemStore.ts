import fs from 'fs-extra';
import path from 'path';

// Lớp cơ sở cho việc lưu trữ dữ liệu
export class FileSystemStore<T extends { id: string }> {
  private basePath: string;
  private entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
    this.basePath = path.join(process.env.DATA_PATH || './data', entityName);
    this.initializeStore();
  }

  // Khởi tạo thư mục lưu trữ
  private initializeStore(): void {
    fs.ensureDirSync(this.basePath);
  }

  // Lưu entity vào file
  async save(entity: T): Promise<T> {
    const filePath = this.getFilePath(entity.id);
    await fs.writeJson(filePath, entity, { spaces: 2 });
    return entity;
  }

  // Lấy entity theo id
  async findById(id: string): Promise<T | null> {
    const filePath = this.getFilePath(id);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    return fs.readJson(filePath) as Promise<T>;
  }

  // Tìm kiếm entity theo điều kiện
  async findOne(condition: Partial<T>): Promise<T | null> {
    const entities = await this.findAll();
    
    return entities.find(entity => 
      Object.entries(condition).every(([key, value]) => 
        // @ts-ignore
        entity[key] === value
      )
    ) || null;
  }

  // Lấy tất cả entity
  async findAll(): Promise<T[]> {
    const files = await fs.readdir(this.basePath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const entities: T[] = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(this.basePath, file);
      const entity = await fs.readJson(filePath) as T;
      entities.push(entity);
    }
    
    return entities;
  }

  // Cập nhật entity
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const entity = await this.findById(id);
    
    if (!entity) {
      return null;
    }
    
    const updatedEntity = { ...entity, ...data };
    await this.save(updatedEntity);
    
    return updatedEntity;
  }

  // Xóa entity
  async delete(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    await fs.unlink(filePath);
    return true;
  }

  // Lấy đường dẫn file
  private getFilePath(id: string): string {
    return path.join(this.basePath, `${id}.json`);
  }
}

// Định nghĩa interface cho User
export interface User {
  id: string;
  telegramId: number;
  firstName?: string;
  lastName?: string;
  telegramUsername?: string;
  telegramPhoneNumber?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Định nghĩa interface cho File
export interface File {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  telegramFileId: string;
  messageId: number;
  path?: string;
  isPublic: boolean;
  publicLink?: string;
  folderId?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Định nghĩa interface cho Folder
export interface Folder {
  id: string;
  name: string;
  path?: string;
  isPublic: boolean;
  publicLink?: string;
  parentId?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tạo các instance lưu trữ cho từng loại entity
export const userStore = new FileSystemStore<User>('users');
export const fileStore = new FileSystemStore<File>('files');
export const folderStore = new FileSystemStore<Folder>('folders'); 