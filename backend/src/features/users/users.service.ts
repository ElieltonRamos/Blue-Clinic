/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserFiltersDto } from './dto/user-filter.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LicenseSystemService } from '../license-system/license-system.service.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma, Role } from '../../../generated/prisma/client.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private licenseService: LicenseSystemService,
  ) {}

  private omitPassword(user: User): UserResponseDto {
    const { password, ...result } = user;
    return new UserResponseDto(result);
  }

  private async findActiveUserById(id: number): Promise<User> {
    const user = await this.prisma.client.user.findFirst({
      where: { id, active: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  private guardProtectedUser(id: number, action: 'editado' | 'removido'): void {
    if (id === 1) {
      throw new BadRequestException(`Este usuário não pode ser ${action}`);
    }
  }

  private validateId(id: number): void {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException('ID inválido');
    }
  }

  async create(
    createUserDto: CreateUserDto & { companyId: number },
  ): Promise<UserResponseDto> {
    const existing = await this.prisma.client.user.findUnique({
      where: { username: createUserDto.username },
    });
    if (existing) {
      throw new ConflictException('Nome de usuário já está em uso');
    }

    if (createUserDto.role === Role.medico) {
      if (!createUserDto.name || !createUserDto.specialty) {
        throw new BadRequestException(
          'Nome e especialidade são obrigatórios para médicos',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.client.user.create({
      data: {
        companyId: createUserDto.companyId,
        username: createUserDto.username,
        password: hashedPassword,
        role: createUserDto.role ?? Role.atendimento,
        active: createUserDto.active ?? true,
      },
    });

    if (user.role === Role.medico) {
      await this.prisma.client.doctor.create({
        data: {
          companyId: createUserDto.companyId,
          name: createUserDto.name!,
          specialty: createUserDto.specialty!,
          userId: user.id,
          active: true,
        },
      });
    }

    return this.omitPassword(user);
  }

  async findAll(filters?: UserFiltersDto): Promise<UserResponseDto[]> {
    const where: Prisma.UserWhereInput = {
      active: filters?.active !== undefined ? filters.active : true,
    };

    if (filters?.username) {
      where.username = { contains: filters.username };
    }
    if (filters?.role) {
      where.role = filters.role;
    }

    const users = await this.prisma.client.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.omitPassword(user));
  }

  async findOne(id: number): Promise<UserResponseDto> {
    this.validateId(id);
    const user = await this.findActiveUserById(id);
    return this.omitPassword(user);
  }

  async findByUsername(username: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { username, active: true },
    });
    return user ? this.omitPassword(user) : null;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.validateId(id);
    this.guardProtectedUser(id, 'editado');

    const existingUser = await this.findActiveUserById(id);

    if (
      updateUserDto.username &&
      updateUserDto.username !== existingUser.username
    ) {
      const usernameExists = await this.prisma.client.user.findFirst({
        where: { username: updateUserDto.username, id: { not: id } },
      });
      if (usernameExists) {
        throw new ConflictException('Nome de usuário já está em uso');
      }
    }

    const data: Prisma.UserUpdateInput = { ...updateUserDto };

    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.client.user.update({ where: { id }, data });

    return this.omitPassword(user);
  }

  async remove(id: number): Promise<{ message: string }> {
    this.validateId(id);
    this.guardProtectedUser(id, 'removido');
    await this.findActiveUserById(id);

    await this.prisma.client.user.update({
      where: { id },
      data: { active: false },
    });

    return { message: 'Usuário removido com sucesso' };
  }

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { username, active: true },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Credenciais inválidas');

    return this.omitPassword(user);
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ token: string; licenseWarning?: string }> {
    const { username, password } = loginDto;

    const user = await this.prisma.client.user.findUnique({
      where: { username },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (!user.active) throw new UnauthorizedException('Usuário inativo');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Credenciais inválidas');

    const license = await this.licenseService.validate();
    if (!license.isValid) {
      throw new UnauthorizedException(
        'Licença inválida ou expirada. Entre em contato com o suporte via WhatsApp: (38) 98866-3580',
      );
    }

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
    };
    const token = await this.jwtService.signAsync(payload);

    return license.message
      ? { token, licenseWarning: license.message }
      : { token };
  }
}
