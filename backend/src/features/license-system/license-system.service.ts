// src/license/license.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import {
  LicenseServerResponse,
  LicenseStatus,
  LicenseTokenPayload,
} from './entities/license-system.entity';
import axios from 'axios';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class LicenseSystemService {
  private readonly licensingServer = process.env.LICENSING_SERVER || '';
  private readonly publicKey =
    process.env.LICENSE_PUBLIC_KEY?.replace(/\\n/g, '\n') || '';

  constructor(private readonly prisma: PrismaService) {}

  private async fetchToken(
    cnpj: string,
    licenseKey: string,
  ): Promise<{
    success: boolean;
    token?: string;
    serverRejected: boolean;
  }> {
    try {
      const response = await axios.get<LicenseServerResponse>(
        `${this.licensingServer}/api/license/${cnpj}`,
        { params: { licenseKey }, timeout: 10000 },
      );

      if (response.data.licenseToken) {
        return {
          success: true,
          token: response.data.licenseToken,
          serverRejected: false,
        };
      }

      return { success: false, serverRejected: true };
    } catch {
      return { success: false, serverRejected: false };
    }
  }

  private verifyToken(token: string): LicenseTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'blue-pdv-licensing',
        ignoreExpiration: true, // adicione isso
      }) as jwt.JwtPayload;

      return {
        companyId: Number(decoded.companyId),
        cnpj: String(decoded.cnpj),
        plan: decoded.plan as 'basic' | 'pro',
        licenseValidUntil: Number(decoded.licenseValidUntil),
        maxOfflineDays: Number(decoded.maxOfflineDays),
        iat: Number(decoded.iat),
        exp: Number(decoded.exp),
      };
    } catch {
      return null;
    }
  }

  private checkToken(token: string): LicenseStatus {
    const payload = this.verifyToken(token);

    if (!payload) {
      return { isValid: false, plan: 'none', mode: 'expired' };
    }

    const now = Date.now();
    const nowSeconds = Math.floor(now / 1000);

    const licenseExpired = now > payload.licenseValidUntil;
    const tokenExpired = nowSeconds > payload.exp;

    // Licença expirada — verifica grace period offline a partir do exp do token
    if (licenseExpired) {
      const tokenExpDate = new Date(payload.exp * 1000);
      const diffMs = now - tokenExpDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const daysRemaining = payload.maxOfflineDays - diffDays;

      if (daysRemaining > 0) {
        return {
          isValid: true,
          plan: payload.plan,
          mode: 'offline',
          daysRemaining,
          message: `Licença expirada. Sistema em modo offline. ${daysRemaining} dia(s) restante(s) para regularizar.`,
        };
      }

      return { isValid: false, plan: 'none', mode: 'expired' };
    }

    // Token expirado mas licença ainda válida — modo offline normal
    if (tokenExpired) {
      const tokenExpDate = new Date(payload.exp * 1000);
      const diffMs = now - tokenExpDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const daysRemaining = payload.maxOfflineDays - diffDays;

      if (daysRemaining > 0) {
        return {
          isValid: true,
          plan: payload.plan,
          mode: 'offline',
          daysRemaining,
          message: `Sistema em modo offline. ${daysRemaining} dia(s) restante(s) para reconectar.`,
        };
      }

      return { isValid: false, plan: 'none', mode: 'expired' };
    }

    // Online válida — verifica se está próxima de vencer (3 dias)
    const msUntilExpiry = payload.licenseValidUntil - now;
    const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 3) {
      return {
        isValid: true,
        plan: payload.plan,
        mode: 'online',
        daysRemaining: daysUntilExpiry,
        message: `Sua licença vence em ${daysUntilExpiry} dia(s). Renove para evitar interrupções.`,
      };
    }

    return { isValid: true, plan: payload.plan, mode: 'online' };
  }

  async validate(): Promise<LicenseStatus> {
    const company = await this.prisma.client.company.findFirst();

    if (!company) {
      throw new HttpException('Empresa não encontrada', HttpStatus.NOT_FOUND);
    }

    const { cnpj, licenseKey, licenseToken } = company;

    if (!licenseKey) {
      return { isValid: false, plan: 'none', mode: 'expired' };
    }

    const result = await this.fetchToken(cnpj, licenseKey);

    // Sucesso online - atualiza token e retorna
    if (result.success && result.token) {
      await this.prisma.client.company.update({
        where: { id: company.id },
        data: { licenseToken: result.token },
      });
      return this.checkToken(result.token);
    }

    // Servidor rejeitou - licença inválida
    if (result.serverRejected) {
      await this.prisma.client.company.update({
        where: { id: company.id },
        data: { licenseToken: undefined },
      });
      return { isValid: false, plan: 'none', mode: 'expired' };
    }

    // Sem conexão - tenta usar token em cache
    if (!licenseToken) {
      return { isValid: false, plan: 'none', mode: 'expired' };
    }

    return this.checkToken(licenseToken);
  }

  async getStatus(): Promise<LicenseStatus> {
    return this.validate();
  }

  async getTokenInfo(): Promise<LicenseTokenPayload> {
    const company = await this.prisma.client.company.findFirst();

    if (!company || !company.licenseToken) {
      throw new HttpException('Token não encontrado', HttpStatus.NOT_FOUND);
    }

    const payload = this.verifyToken(company.licenseToken);

    if (!payload) {
      throw new HttpException('Token inválido', HttpStatus.BAD_REQUEST);
    }

    return payload;
  }
}
