import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Canonical engagement event names emitted by @codeimplants/analytics.
 * Kept as loose strings on the wire (client packages may add events without a
 * platform redeploy); only APP_OPEN / APP_BACKGROUND drive session accounting.
 */
export const SdkEventNames = {
  APP_OPEN: 'app_open',
  APP_BACKGROUND: 'app_background',
  LOGIN_SUCCESS: 'login_success',
  LOGOUT: 'logout',
  SCREEN_VIEW: 'screen_view',
} as const;

export class SdkEventDto {
  /** Event name, e.g. "app_open" | "app_background" | "login_success". */
  @IsString()
  name: string;

  /** Client-side event time (ISO 8601). Server falls back to receipt time. */
  @IsOptional()
  @IsISO8601()
  ts?: string;

  @IsString()
  deviceId: string;

  /** App-backend user id when the user is logged in (pseudonymous). */
  @IsOptional()
  @IsString()
  externalUserId?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  /** Arbitrary event properties (kept for reporting, not required). */
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class IngestEventsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SdkEventDto)
  events: SdkEventDto[];
}
