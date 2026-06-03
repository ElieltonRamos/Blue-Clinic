import { Injectable } from '@nestjs/common';
import { CreateWhatssapDto } from './dto/create-whatssap.dto';
import { UpdateWhatssapDto } from './dto/update-whatssap.dto';

@Injectable()
export class WhatssapService {
  create(createWhatssapDto: CreateWhatssapDto) {
    return 'This action adds a new whatssap';
  }

  findAll() {
    return `This action returns all whatssap`;
  }

  findOne(id: number) {
    return `This action returns a #${id} whatssap`;
  }

  update(id: number, updateWhatssapDto: UpdateWhatssapDto) {
    return `This action updates a #${id} whatssap`;
  }

  remove(id: number) {
    return `This action removes a #${id} whatssap`;
  }
}
