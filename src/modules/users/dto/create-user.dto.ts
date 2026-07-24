import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum UserRole {
    ADMIN = 'ADMIN',
    COLLABORATOR = 'COLLABORATOR',
    // Read-only lead-generation team: sees stats/leads for assigned apps only.
    LEAD_GEN = 'LEAD_GEN',
}

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    password: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsEnum(UserRole, { message: 'Role must be ADMIN or COLLABORATOR' })
    role: UserRole;
}
