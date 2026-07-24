import { IsOptional, IsString } from 'class-validator';

/**
 * Sent when a client app authenticates an end user (any method: OTP, email+password, ...).
 * The platform stores only the app-backend user id (pseudonymous) — never credentials.
 */
export class IdentifyDto {
  @IsString()
  deviceId: string;

  /** The app-backend user _id. Correlates engagement to a user without PII. */
  @IsString()
  externalUserId: string;

  @IsOptional()
  @IsString()
  platform?: string;

  /** How the user authenticated: otp | email | ... (reporting only, expandable). */
  @IsOptional()
  @IsString()
  authMethod?: string;
}
