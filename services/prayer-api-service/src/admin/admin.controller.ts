import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
// import { AdminAuthGuard } from './admin-auth.guard'; // Placeholder for auth

@Controller('admin')
// @UseGuards(AdminAuthGuard) // Uncomment when auth guard is implemented
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('prayer-logs')
    async getPrayerLogs(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('userId') userId?: string,
        @Query('dateFrom') dateFrom?: string,      // Expected format: YYYY-MM-DD
        @Query('dateTo') dateTo?: string,          // Expected format: YYYY-MM-DD
        @Query('successful') successful?: string // Expected: 'true' or 'false'
    ) {
        const pageNum = page ? parseInt(page, 10) : undefined;
        const limitNum = limit ? parseInt(limit, 10) : undefined;
        
        let successfulBool: boolean | undefined = undefined;
        if (successful === 'true') successfulBool = true;
        if (successful === 'false') successfulBool = false;

        // Basic validation or use class-validator DTOs for more robust validation
        if (page && isNaN(pageNum)) throw new Error('Invalid page number');
        if (limit && isNaN(limitNum)) throw new Error('Invalid limit number');
        // Add date validation if needed

        return this.adminService.getPrayerLogs({
            page: pageNum,
            limit: limitNum,
            userId,
            dateFrom, // Pass as string, Supabase client handles date string conversion
            dateTo,   // Pass as string
            successful: successfulBool,
        });
    }

    // Example of a simple protected route to verify auth (if guard is active)
    // @Get('test-auth')
    // testAuth(@Req() req) {
    //   return { message: 'Admin auth is working!', user: req.user };
    // }
}
