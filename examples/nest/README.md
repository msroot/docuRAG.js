# DocuRAG.js NestJS Example

Minimal NestJS implementation of docuRAG.js.

## Quick Start

1. Start required services:
```bash
# Qdrant
docker run -p 6333:6333 qdrant/qdrant

# Ollama
ollama run llama2
```

2. Run the app:
```bash
npm install
npm run start:dev
```

## API Endpoints

- `POST /upload` - Upload PDF
- `POST /chat` - Chat with SSE streaming
- `POST /cleanup` - Cleanup resources

## Implementation

```typescript
// chat.controller.ts
@Controller()
export class ChatController {
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
}
``` 