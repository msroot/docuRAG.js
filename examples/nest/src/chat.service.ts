import { Injectable } from '@nestjs/common';
import { DocuRAG } from 'docurag';

@Injectable()
export class ChatService {
  private docurag = new DocuRAG({
    qdrantUrl: 'http://localhost:6333',
    llmUrl: 'http://localhost:11434'
  });

  async processPdf(file: Express.Multer.File) {
    await this.docurag.processPDFBuffer(file.buffer, file.originalname);
    return { success: true };
  }

  async chat(message: string, onData: (data: any) => void) {
    return this.docurag.chat(message, { onData });
  }

  async cleanup() {
    await this.docurag.cleanup();
  }
} 