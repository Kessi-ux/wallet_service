import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects the user to Google login page',
  })
  async googleAuth() {
    // initiates Google OAuth2 login
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback, returns JWT' })
  @ApiResponse({
    status: 200,
    description: 'Returns a JWT token for authenticated user',
    schema: {
      example: {
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NTI4ODUyMi1iZGUzLTQ3M2QtODYzOS0yOTJhO...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or redirect URI mismatch' })
  async googleAuthRedirect(@Req() req: any) {
    // user is attached to req.user by GoogleStrategy
    return this.authService.login(req.user);
  }
}
