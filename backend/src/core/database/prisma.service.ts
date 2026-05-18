// src/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from './prisma.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public readonly client = prisma;

  async onModuleInit() {
    await prisma.$connect();
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }
}
