import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

  ) { }

  async create(createProductDto: CreateProductDto) {
    try {

      // if (!createProductDto.slug) {
      //   createProductDto.slug = createProductDto.title
      //     .toLowerCase()
      //     .replaceAll(' ', '_')
      //     .replaceAll("'", '')
      // } else {
      //   createProductDto.slug = createProductDto.slug
      //     .toLowerCase()
      //     .replaceAll(' ', '_')
      //     .replaceAll("'", '')
      // }

      const producto = this.productRepository.create(createProductDto);

      await this.productRepository.save(producto);

      return producto;
    } catch (error) {

      this.handleDBExceptions(error);
    }
  }

  async findAll() {
    return this.productRepository.find({
      // skip: 2,
      // take: 2,
    });
  }

  async findOne(id: string) {


    // const product = await this.productRepository.findOne({
    //   where: {
    //     id: id,
    //   }
    // });
    const product = await this.productRepository.findOneBy({
      id: id,
    });

    if (!product) {
      throw new NotFoundException(`producto con id: ${id}, no existe`);
    }

    return product;

  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  async remove(id: string) {

    // const response = await this.productRepository.delete(id);
    // if (response.affected === 0) {
    //   throw new NotFoundException(`producto con el id: ${id}, no existe`);
    // }
    const product = await this.findOne(id);

    await this.productRepository.remove(product);
    return;
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);

    this.logger.error(error);
    throw new InternalServerErrorException(`ayuda!`);
  }
}
