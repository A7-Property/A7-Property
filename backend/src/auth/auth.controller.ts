import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { CookieOptions, Request, Response } from "express";
import { AuthIdentity, CurrentUser, Public } from "../common/auth";
import { AuthService } from "./auth.service";
import { ChangePasswordDto, EmailDto, LoginDto, PasswordConfirmationDto, RegisterDto, ResetPasswordDto, TokenDto } from "./dto";

const refreshCookie = "a7_refresh";

function cookieOptions(): CookieOptions {
  const secure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
  const [, amount, unit] = /^(\d+)([smhd])$/.exec(process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d")!;
  const maxAge = Number(amount) * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as "s" | "m" | "h" | "d"];
  // Scoping the cookie to /api/v1/auth keeps it off every other endpoint.
  return { httpOnly: true, secure, sameSite: secure ? "none" : "lax", path: "/api/v1/auth", maxAge };
}

/**
 * Cookie-authenticated endpoints need their own origin check: unlike the
 * Bearer-token routes, a browser would attach the refresh cookie to a
 * cross-site request on its own.
 */
function assertAllowedOrigin(request: Request) {
  const origin = request.headers.origin;
  if (!origin) return;
  const allowed = (process.env.FRONTEND_URL ?? "http://localhost:3000").split(",").map((url) => url.trim().replace(/\/$/, ""));
  if (!allowed.includes(origin.replace(/\/$/, ""))) throw new ForbiddenException("Origin not allowed");
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  async register(@Body() input: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(input, request);
    response.cookie(refreshCookie, result.refreshToken, cookieOptions());
    return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn, verificationEmailSent: result.verificationEmailSent };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post("login")
  async login(@Body() input: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(input, request);
    response.cookie(refreshCookie, result.refreshToken, cookieOptions());
    return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    assertAllowedOrigin(request);
    const result = await this.auth.refresh(request.cookies?.[refreshCookie], request);
    response.cookie(refreshCookie, result.refreshToken, cookieOptions());
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Public()
  @HttpCode(200)
  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    assertAllowedOrigin(request);
    await this.auth.logout(request.cookies?.[refreshCookie]);
    response.clearCookie(refreshCookie, cookieOptions());
    return { success: true };
  }

  @ApiBearerAuth()
  @HttpCode(200)
  @Post("logout-all")
  async logoutAll(@CurrentUser() user: AuthIdentity, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.logoutAll(user.id, request);
    response.clearCookie(refreshCookie, cookieOptions());
    return result;
  }

  @ApiBearerAuth()
  @Get("sessions")
  sessions(@CurrentUser() user: AuthIdentity) { return this.auth.listSessions(user.id); }

  @ApiBearerAuth()
  @Delete("sessions/:id")
  revokeSession(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Req() request: Request) {
    return this.auth.revokeSession(user.id, id, request);
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("change-password")
  async changePassword(@CurrentUser() user: AuthIdentity, @Body() body: ChangePasswordDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.changePassword(user.id, body.currentPassword, body.newPassword, request);
    response.clearCookie(refreshCookie, cookieOptions());
    return result;
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post("deactivate")
  async deactivate(@CurrentUser() user: AuthIdentity, @Body() body: PasswordConfirmationDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.deactivate(user.id, body.password, request);
    response.clearCookie(refreshCookie, cookieOptions());
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("verify-email")
  verifyEmail(@Body() body: TokenDto, @Req() request: Request) { return this.auth.verifyEmail(body.token, request); }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post("resend-verification")
  resendVerification(@Body() body: EmailDto) { return this.auth.resendVerification(body.email); }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post("forgot-password")
  forgotPassword(@Body() body: EmailDto) { return this.auth.forgotPassword(body.email); }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("reset-password")
  resetPassword(@Body() body: ResetPasswordDto, @Req() request: Request) { return this.auth.resetPassword(body.token, body.password, request); }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() identity: AuthIdentity) {
    return this.auth.me(identity.id);
  }
}
