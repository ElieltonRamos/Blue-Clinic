// src/database/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global() // Torna disponível em toda a aplicação
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
