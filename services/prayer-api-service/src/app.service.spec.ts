import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';

// Mock implementation for OpenAI client
const mockOpenAI = {
  responses: {
    create: jest.fn(),
  },
};

// Mock implementation for Supabase Admin client
const mockSupabaseAdmin = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

describe('AppService', () => {
  let service: AppService;
  let configService: ConfigService;
  let supabaseClient: SupabaseClient;
  let openaiClient: OpenAI;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-openai-key';
              if (key === 'SUPABASE_URL') return 'http://test-supabase-url';
              if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-supabase-service-key';
              return null;
            }),
          },
        },
        // Provide the mock OpenAI client
        {
          provide: OpenAI,
          useValue: mockOpenAI,
        },
         // Provide the mock Supabase Admin Client
         // We need to trick Nest's dependency injection here as SupabaseClient isn't typically injected
         // We achieve this by overriding the client within the service instance after creation,
         // or by mocking the createClient function if it were imported directly.
         // For simplicity, we'll mock the methods we expect to be called.
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    configService = module.get<ConfigService>(ConfigService);

    // Inject mock Supabase client manually AFTER service instance creation
    // This bypasses complex DI setup for external clients
    (service as any).supabaseAdmin = mockSupabaseAdmin as any;
    // Similarly for OpenAI if constructor injection is complex (though constructor handles it here)
    // (service as any).openai = mockOpenAI as any;

  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePrayer', () => {
    const inputData = {
      userId: 'user-123',
      slot: 'morning' as 'morning' | 'evening',
      instructions: 'Test instructions',
      currentContextSummary: 'Test context summary'
    };
    const mockResponseId = 'resp_12345';
    const mockPrayerContent = 'This is a test prayer.';

    it('should generate prayer without previous ID if none found', async () => {
      // Arrange: Mock Supabase profile fetch returning null for the ID
      mockSupabaseAdmin.single.mockResolvedValueOnce({ data: { last_openai_response_id: null }, error: null });
      // Arrange: Mock OpenAI call
      mockOpenAI.responses.create.mockResolvedValueOnce({ id: mockResponseId, output_text: mockPrayerContent });
      // Arrange: Mock Supabase profile update
      mockSupabaseAdmin.update.mockResolvedValueOnce({ error: null });

      // Act
      const result = await service.generatePrayer(inputData);

      // Assert
      expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('last_openai_response_id');
      expect(mockOpenAI.responses.create).toHaveBeenCalledWith({
        model: "gpt-4o",
        instructions: inputData.instructions,
        input: [{ role: "user", content: `Generate the ${inputData.slot} prayer. Consider this update: ${inputData.currentContextSummary}` }],
        // previous_response_id should NOT be included
        store: true,
      });
      expect(mockOpenAI.responses.create).not.toHaveBeenCalledWith(expect.objectContaining({ previous_response_id: expect.anything() }));
      expect(mockSupabaseAdmin.update).toHaveBeenCalledWith({ last_openai_response_id: mockResponseId });
      expect(result).toEqual({ prayer: mockPrayerContent });
    });

    it('should generate prayer using previous ID if found', async () => {
      const previousId = 'prev_resp_abc';
      // Arrange: Mock Supabase profile fetch returning a previous ID
      mockSupabaseAdmin.single.mockResolvedValueOnce({ data: { last_openai_response_id: previousId }, error: null });
      // Arrange: Mock OpenAI call
      mockOpenAI.responses.create.mockResolvedValueOnce({ id: mockResponseId, output_text: mockPrayerContent });
      // Arrange: Mock Supabase profile update
      mockSupabaseAdmin.update.mockResolvedValueOnce({ error: null });

      // Act
      const result = await service.generatePrayer(inputData);

      // Assert
      expect(mockSupabaseAdmin.select).toHaveBeenCalledWith('last_openai_response_id');
      expect(mockOpenAI.responses.create).toHaveBeenCalledWith({
        model: "gpt-4o",
        instructions: inputData.instructions,
        input: [{ role: "user", content: `Generate the ${inputData.slot} prayer. Consider this update: ${inputData.currentContextSummary}` }],
        previous_response_id: previousId, // <-- Should be included
        store: true,
      });
      expect(mockSupabaseAdmin.update).toHaveBeenCalledWith({ last_openai_response_id: mockResponseId });
      expect(result).toEqual({ prayer: mockPrayerContent });
    });

    it('should throw NotFoundException if profile fetch fails', async () => {
      // Arrange: Mock Supabase profile fetch to throw an error
      const fetchError = { message: 'DB error', code: 'PGRST116' }; // Example error
      mockSupabaseAdmin.single.mockResolvedValueOnce({ data: null, error: fetchError });

      // Act & Assert
      await expect(service.generatePrayer(inputData)).rejects.toThrow(
        new NotFoundException('Profile not found or error fetching profile data.')
      );
      expect(mockOpenAI.responses.create).not.toHaveBeenCalled();
      expect(mockSupabaseAdmin.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if OpenAI call fails', async () => {
        // Arrange: Mock profile fetch success
        mockSupabaseAdmin.single.mockResolvedValueOnce({ data: { last_openai_response_id: null }, error: null });
        // Arrange: Mock OpenAI call to throw an error
        const openAIError = new Error('OpenAI API error');
        mockOpenAI.responses.create.mockRejectedValueOnce(openAIError);

        // Act & Assert
        await expect(service.generatePrayer(inputData)).rejects.toThrow(
            new InternalServerErrorException(`Prayer generation failed: ${openAIError.message}`)
        );
        expect(mockSupabaseAdmin.update).not.toHaveBeenCalled(); // Should not update profile if OpenAI fails
    });

    it('should return prayer but log error if profile update fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      // Arrange: Mock profile fetch success
      mockSupabaseAdmin.single.mockResolvedValueOnce({ data: { last_openai_response_id: null }, error: null });
      // Arrange: Mock OpenAI call success
      mockOpenAI.responses.create.mockResolvedValueOnce({ id: mockResponseId, output_text: mockPrayerContent });
      // Arrange: Mock Supabase profile update to fail
      const updateError = { message: 'DB update failed', code: '23505' }; // Example error
      mockSupabaseAdmin.update.mockResolvedValueOnce({ error: updateError });

      // Act
      const result = await service.generatePrayer(inputData);

      // Assert
      expect(result).toEqual({ prayer: mockPrayerContent }); // Still returns prayer
      expect(mockSupabaseAdmin.update).toHaveBeenCalledWith({ last_openai_response_id: mockResponseId });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `[${inputData.userId}] Failed to update profile with new response ID ${mockResponseId}:`,
        expect.objectContaining(updateError) // Check if the error object is logged
      );
      consoleErrorSpy.mockRestore(); // Restore console.error
    });

    it('should throw InternalServerErrorException if OpenAI response is invalid', async () => {
        // Arrange: Mock profile fetch success
        mockSupabaseAdmin.single.mockResolvedValueOnce({ data: { last_openai_response_id: null }, error: null });
        // Arrange: Mock OpenAI call with invalid response (missing fields)
        mockOpenAI.responses.create.mockResolvedValueOnce({ id: null, output_text: null });

        // Act & Assert
        await expect(service.generatePrayer(inputData)).rejects.toThrow(
            new InternalServerErrorException('Prayer generation failed: Invalid response from OpenAI.')
        );
        expect(mockSupabaseAdmin.update).not.toHaveBeenCalled();
    });

  });
}); 