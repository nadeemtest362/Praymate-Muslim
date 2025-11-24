// Add this controller to your NestJS prayer service

import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('api')
export class ReplicateController {
  constructor(private configService: ConfigService) {}

  @Post('replicate')
  async proxyReplicate(@Body() body: { model: string; input: any }) {
    const { model, input } = body;
    const REPLICATE_API_KEY = this.configService.get<string>('REPLICATE_API_KEY');

    if (!REPLICATE_API_KEY) {
      throw new HttpException(
        'Replicate API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      // Create prediction
      const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: model,
          input: input,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new HttpException(error, createResponse.status);
      }

      const prediction = await createResponse.json();
      console.log('Prediction created:', prediction.id);

      // Poll for completion
      let result = prediction;
      let pollCount = 0;
      const maxPolls = 60;

      while (result.status !== 'succeeded' && result.status !== 'failed' && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        pollCount++;

        const pollResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          {
            headers: {
              'Authorization': `Token ${REPLICATE_API_KEY}`,
            },
          },
        );

        result = await pollResponse.json();
        console.log(`Poll ${pollCount}: ${result.status}`);
      }

      if (result.status === 'failed') {
        throw new HttpException(
          result.error || 'Prediction failed',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (pollCount >= maxPolls) {
        throw new HttpException(
          'Prediction timed out',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      return { output: result.output };
    } catch (error) {
      console.error('Replicate proxy error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}