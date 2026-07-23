import { IsString, IsOptional, IsNotEmpty, IsEnum, IsIn } from 'class-validator';

export enum Platform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
}

export enum Environment {
  PROD = 'prod',
  STAGING = 'staging',
  DEV = 'dev',
}

export class VersionCheckDto {
  @IsString()
  @IsOptional()
  appId?: string;

  @IsIn([Platform.ANDROID, Platform.IOS, Platform.WEB], {
    message: 'platform must be android, ios, or web',
  })
  @IsNotEmpty()
  platform: Platform;

  @IsString()
  @IsOptional()
  currentVersion?: string;

  @IsString()
  @IsOptional()
  buildNumber?: string;

  @IsEnum(Environment)
  @IsNotEmpty()
  environment: Environment;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export interface VersionCheckResponse {
  status: 'NONE' | 'SOFT_UPDATE' | 'FORCE_UPDATE' | 'KILL_SWITCH' | 'BLOCKED' | 'MAINTENANCE';
  latestVersion?: string;
  minVersion?: string;
  updateType?: 'soft' | 'force' | 'maintenance' | 'none';
  killSwitch?: boolean;
  blockVersion?: boolean;
  maintenanceMode?: boolean;

  // Message configuration
  title?: string;
  message?: string;
  buttonText?: string;
  customMessage?: any;

  // Store URLs
  storeUrl?: string;
  storeUrls?: {
    android?: string;
    ios?: string;
    web?: string;
  };

  // Metadata
  deviceTracked?: boolean;
  analytics?: boolean;
}
