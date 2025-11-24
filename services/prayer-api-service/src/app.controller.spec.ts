import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InternalServerErrorException } from '@nestjs/common';

// Mock the AppService
const mockAppService = {
  generatePrayer: jest.fn(),
  getHello: jest.fn(() => 'Mock Hello'),
};

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);

    // Reset mocks before each test if needed (useValue handles basic state reset)
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHello', () => {
    it('should return the hello message from the service', () => {
      expect(controller.getHello()).toBe('Mock Hello');
      expect(service.getHello).toHaveBeenCalledTimes(1);
    });
  });

  describe('generatePrayer', () => {
    it('should call appService.generatePrayer with the DTO and return the result', async () => {
      const dto = {
        userId: 'test-user',
        slot: 'evening' as 'morning' | 'evening',
        instructions: 'Test instructions',
        inputContext: 'Test input context'
      };
      const expectedResult = { prayer: 'Generated test prayer' };

      // Arrange: Mock the service method
      mockAppService.generatePrayer.mockResolvedValueOnce(expectedResult);

      // Act
      const result = await controller.generatePrayer(dto);

      // Assert
      expect(service.generatePrayer).toHaveBeenCalledTimes(1);
      expect(service.generatePrayer).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });

     it('should handle errors from the service', async () => {
      const dto = {
        userId: 'test-user',
        slot: 'evening' as 'morning' | 'evening',
        instructions: 'Test instructions',
        inputContext: 'Test input context'
      };
       const serviceError = new InternalServerErrorException('Service failed');

      // Arrange: Mock the service method to throw an error
       mockAppService.generatePrayer.mockRejectedValueOnce(serviceError);

      // Act & Assert
       await expect(controller.generatePrayer(dto)).rejects.toThrow(serviceError);
       expect(service.generatePrayer).toHaveBeenCalledWith(dto);
    });
  });
}); 