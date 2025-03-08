import { Controller, Post, UseInterceptors, UploadedFile, Body, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ChatService } from './chat.service';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('pdf'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.chatService.processPdf(file);
  }

  @Post('chat')
  async chat(@Body('message') message: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    await this.chatService.chat(message, (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }

  @Post('cleanup')
  cleanup() {
    return this.chatService.cleanup();
  }
} 