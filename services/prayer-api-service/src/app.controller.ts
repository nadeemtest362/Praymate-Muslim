import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

// Define the expected shape of the request body for prayer generation
interface GeneratePrayerDto {
  userId: string;
  slot: 'morning' | 'evening';
  instructions?: string; // The detailed instructions - now optional since we handle it in system message
  input: string; // The prayer prompt with user's intentions
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('generate-prayer')
  @HttpCode(HttpStatus.OK)
  async generatePrayer(@Body() generatePrayerDto: GeneratePrayerDto): Promise<{ prayer: string }> {
    // Pass the entire DTO to the service method
    // The service method will destructure needed fields (instructions, input, userId, slot)
    return this.appService.generatePrayer(generatePrayerDto);
  }
} 