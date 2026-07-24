import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Explicit device registration.
 *
 * The published @codeimplants/version-control client posts only
 * {appId, platform, currentVersion, environment} to /sdk/version/check — it sends
 * no deviceId, so trackDevice() there can never populate the Device table. This
 * endpoint lets the platform analytics client register the device (and its
 * make/model) directly, which is what backs install counts and the device split.
 */
export class DeviceRegisterDto {
  @IsString()
  deviceId: string;

  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  buildNumber?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
