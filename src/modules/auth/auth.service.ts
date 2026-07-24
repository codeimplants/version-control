import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
    ServiceUnavailableException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

const SALT_ROUNDS = 12;
const OTP_TTL_MS = 5 * 60 * 1000;
const TWOFACTOR_TEMPLATE = 'OTP1';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwt: JwtService
    ) { }

    private normalizeRole(role: string): 'ADMIN' | 'COLLABORATOR' | 'LEAD_GEN' {
        // Only known lesser roles map to themselves. Everything else (SUPER_ADMIN,
        // legacy values) maps to ADMIN — so a NEW restricted role MUST be listed
        // here explicitly, or it would be silently promoted to full access.
        if (role === 'COLLABORATOR') return 'COLLABORATOR';
        if (role === 'LEAD_GEN') return 'LEAD_GEN';
        return 'ADMIN';
    }

    private toUserPayload(admin: { id: string; email: string; name: string | null; role: string }) {
        return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: this.normalizeRole(admin.role),
        };
    }

    private signToken(admin: { id: string; email: string; role: string }) {
        return this.jwt.sign({
            id: admin.id,
            email: admin.email,
            role: this.normalizeRole(admin.role),
        });
    }

    // Note: toUserPayload/signToken derive role via normalizeRole, so both the
    // JWT and the /me payload already carry LEAD_GEN without further changes.

    // ---------------------------------------------------------------------
    // Phone + OTP (primary console login)
    //
    // Mirrors the app backends' 2Factor flow: AUTOGEN returns a sessionId, and a
    // stateless HMAC (`fullhash`) binds phone+sessionId+expiry so no OTP is ever
    // stored. Only phones belonging to an active admin are ever texted.
    // ---------------------------------------------------------------------

    private get isDevOtp(): boolean {
        return !process.env.TWOFACTOR_API_KEY || process.env.NODE_ENV === 'dev';
    }

    private signOtpHash(phone: string, sessionId: string, expires: number): string {
        const hash = crypto
            .createHmac('sha256', process.env.HASH_KEY || '234')
            .update(`${phone}.${sessionId}.${expires}`)
            .digest('hex');
        return `${hash}.${expires}`;
    }

    private verifyOtpHash(
        phone: string,
        sessionId: string,
        fullhash: string,
    ): void {
        const [, expiresRaw] = (fullhash ?? '').split('.');
        const expires = Number(expiresRaw);
        if (!expiresRaw || Number.isNaN(expires)) {
            throw new BadRequestException('Malformed verification hash');
        }
        if (Date.now() > expires) {
            throw new UnauthorizedException('OTP has expired, please request a new one');
        }

        const expected = this.signOtpHash(phone, sessionId, expires);
        const a = Buffer.from(expected);
        const b = Buffer.from(fullhash);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            throw new UnauthorizedException('Invalid verification hash');
        }
    }

    /** Look up an admin by phone; only active admins may log in. */
    private async requireAdminByPhone(phone: string) {
        const admin = await this.prisma.admin.findUnique({
            where: { phone },
            select: { id: true, email: true, name: true, role: true, isActive: true },
        });
        // Do not send an SMS to a number that is not a registered admin.
        if (!admin) throw new UnauthorizedException('This number is not registered for admin access');
        if (!admin.isActive) throw new UnauthorizedException('Account is deactivated');
        return admin;
    }

    async requestOtp(phone: string) {
        if (!phone) throw new BadRequestException('Phone is required');
        await this.requireAdminByPhone(phone);

        const expires = Date.now() + OTP_TTL_MS;

        if (this.isDevOtp) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const sessionId = `DEV_SESSION_${otp}`;
            return {
                phone,
                sessionId,
                fullhash: this.signOtpHash(phone, sessionId, expires),
                otp, // dev only — lets the console be exercised without real SMS
                success: true,
                note: 'Development mode - OTP included in response',
            };
        }

        const url = `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${phone}/AUTOGEN/${TWOFACTOR_TEMPLATE}`;
        let data: any;
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
            data = await res.json();
        } catch (error) {
            this.logger.error(`2Factor request failed: ${String(error)}`);
            throw new ServiceUnavailableException('OTP service unavailable');
        }

        if (data?.Status !== 'Success') {
            this.logger.error(`2Factor error: ${JSON.stringify(data)}`);
            throw new ServiceUnavailableException('Failed to send OTP, please try again');
        }

        const sessionId = data.Details as string;
        return {
            phone,
            sessionId,
            fullhash: this.signOtpHash(phone, sessionId, expires),
            success: true,
        };
    }

    async verifyOtp(input: { phone: string; sessionId: string; fullhash: string; otp: string }) {
        const { phone, sessionId, fullhash, otp } = input;
        if (!phone || !sessionId || !fullhash || !otp) {
            throw new BadRequestException('phone, sessionId, fullhash and otp are required');
        }

        this.verifyOtpHash(phone, sessionId, fullhash);

        if (this.isDevOtp) {
            // Dev sessions embed the expected OTP; the HMAC above proves it is ours.
            if (sessionId !== `DEV_SESSION_${otp}`) {
                throw new UnauthorizedException('Invalid OTP');
            }
        } else {
            const url = `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`;
            let data: any;
            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
                data = await res.json();
            } catch (error) {
                this.logger.error(`2Factor verify failed: ${String(error)}`);
                throw new ServiceUnavailableException('OTP service unavailable');
            }
            if (data?.Status !== 'Success') {
                throw new UnauthorizedException('Invalid OTP');
            }
        }

        const admin = await this.requireAdminByPhone(phone);
        return {
            token: this.signToken(admin),
            user: this.toUserPayload(admin),
        };
    }

    // ---------------------------------------------------------------------
    // Email + password (secondary, behind ALLOW_PASSWORD_LOGIN)
    // ---------------------------------------------------------------------

    async login(email: string, password: string) {
        if (process.env.ALLOW_PASSWORD_LOGIN === 'false') {
            throw new ForbiddenException('Password login is disabled; use phone + OTP');
        }

        const admin = await this.prisma.admin.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, password: true, role: true, isActive: true },
        });
        if (!admin) throw new UnauthorizedException('Invalid credentials');
        if (!admin.isActive) throw new UnauthorizedException('Account is deactivated');

        const match = await bcrypt.compare(password, admin.password);
        if (!match) throw new UnauthorizedException('Invalid credentials');

        const token = this.signToken(admin);
        const { password: _, isActive: __, ...rest } = admin;
        return {
            token,
            user: this.toUserPayload(rest),
        };
    }

    async register(data: { email: string; password: string; name?: string }) {
        const exists = await this.prisma.admin.findUnique({
            where: { email: data.email }
        });
        if (exists) throw new ConflictException('User with this email already exists');

        const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
        const admin = await this.prisma.admin.create({
            data: {
                email: data.email,
                password: hash,
                name: data.name ?? 'Admin',
                role: 'ADMIN',
            },
            select: { id: true, email: true, name: true, role: true },
        });

        const token = this.signToken(admin);
        return {
            token,
            user: this.toUserPayload(admin),
        };
    }

    async me(userId: string) {
        const admin = await this.prisma.admin.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true, isActive: true },
        });
        if (!admin || !admin.isActive) throw new UnauthorizedException('User not found or deactivated');
        return this.toUserPayload(admin);
    }
}
