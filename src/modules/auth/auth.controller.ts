import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { User } from '../../common/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) { }

  /** Primary console login: send an OTP to a registered admin phone. */
  @Post('otp/request')
  requestOtp(@Body() body: { phone: string }) {
    return this.auth.requestOtp(body.phone);
  }

  /** Verify the OTP and issue the same JWT the rest of the platform consumes. */
  @Post('otp/verify')
  verifyOtp(
    @Body() body: { phone: string; sessionId: string; fullhash: string; otp: string },
  ) {
    return this.auth.verifyOtp(body);
  }

  /** Secondary login, disabled by setting ALLOW_PASSWORD_LOGIN=false. */
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Post('register')
  register(@Body() body: { email: string; password: string; name?: string }) {
    return this.auth.register(body);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  me(@User() user: { id: string }) {
    return this.auth.me(user.id);
  }
}