import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from 'telegram/extensions';
import config from '../config';
import logger from '../utils/logger';

class TelegramService {
  private client: TelegramClient | null = null;
  private session: StringSession;

  constructor() {
    // Tắt logger của TelegramClient trong môi trường production
    if (config.env === 'production') {
      Logger.setLevel('none');
    }

    this.session = new StringSession('');
  }

  /**
   * Tạo và kết nối client
   */
  async connect(sessionString?: string): Promise<TelegramClient> {
    if (this.client && this.client.connected) {
      return this.client;
    }

    try {
      // Tạo session từ string nếu có
      if (sessionString) {
        this.session = new StringSession(sessionString);
      }

      // Khởi tạo client
      this.client = new TelegramClient(
        this.session, 
        config.telegram.apiId, 
        config.telegram.apiHash, 
        {
          connectionRetries: 5,
          useWSS: true,
        }
      );

      // Kết nối
      await this.client.connect();

      logger.info('Đã kết nối thành công đến Telegram API');
      
      return this.client;
    } catch (error) {
      logger.error('Lỗi kết nối đến Telegram API', error);
      throw new Error(`Không thể kết nối đến Telegram: ${(error as Error).message}`);
    }
  }

  /**
   * Lấy session string hiện tại
   */
  getSessionString(): string {
    return this.session.save();
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected(): boolean {
    return this.client !== null && this.client.connected;
  }

  /**
   * Ngắt kết nối
   */
  async disconnect(): Promise<void> {
    if (this.client && this.client.connected) {
      await this.client.disconnect();
      logger.info('Đã ngắt kết nối đến Telegram API');
    }
  }

  /**
   * Tải file lên Telegram
   */
  async uploadFile(filePath: string): Promise<{ messageId: number; chatId: number }> {
    if (!this.client || !this.client.connected) {
      await this.connect();
    }

    try {
      // Gửi file đến đoạn chat với chính mình (saved messages)
      const result = await this.client!.sendFile('me', {
        file: filePath,
        caption: `TeleDrive Upload: ${new Date().toISOString()}`,
        forceDocument: true,
      });

      const messageId = result.id;
      const chatId = result.peerId.channelId || result.peerId.userId || 0;

      logger.info(`Đã tải file lên thành công vào Telegram, messageId: ${messageId}`);

      return { messageId, chatId };
    } catch (error) {
      logger.error('Lỗi khi tải file lên Telegram', error);
      throw new Error(`Không thể tải file lên Telegram: ${(error as Error).message}`);
    }
  }

  /**
   * Tải file xuống từ Telegram
   */
  async downloadFile(chatId: number, messageId: number, outputPath: string): Promise<void> {
    if (!this.client || !this.client.connected) {
      await this.connect();
    }

    try {
      // Lấy message theo ID
      const messages = await this.client!.getMessages(chatId, {
        ids: messageId,
      });

      if (!messages || !messages[0]) {
        throw new Error('Không tìm thấy file trên Telegram');
      }

      const message = messages[0];
      if (!message.media) {
        throw new Error('Message không chứa media');
      }

      // Tải file
      await this.client!.downloadMedia(message.media, {
        outputFile: outputPath,
      });

      logger.info(`Đã tải file xuống thành công từ Telegram, lưu tại: ${outputPath}`);
    } catch (error) {
      logger.error('Lỗi khi tải file xuống từ Telegram', error);
      throw new Error(`Không thể tải file từ Telegram: ${(error as Error).message}`);
    }
  }

  /**
   * Xóa file từ Telegram
   */
  async deleteFile(chatId: number, messageId: number): Promise<boolean> {
    if (!this.client || !this.client.connected) {
      await this.connect();
    }

    try {
      // Xóa message
      await this.client!.deleteMessages(chatId, [messageId], { revoke: true });
      
      logger.info(`Đã xóa file thành công từ Telegram, messageId: ${messageId}`);
      return true;
    } catch (error) {
      logger.error('Lỗi khi xóa file từ Telegram', error);
      throw new Error(`Không thể xóa file từ Telegram: ${(error as Error).message}`);
    }
  }
}

export default new TelegramService(); 