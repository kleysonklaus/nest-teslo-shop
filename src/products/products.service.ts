import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from "uuid";

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

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return this.productRepository.find({
      skip: offset,
      take: limit,
      // TODO: relaciones
    });
  }

  async findOne(term: string) {

    let product: Product;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder.where(`UPPER(title) =:title or slug =:slug`, {
        title: term.toUpperCase(),
        slug: term.toLowerCase(),
      }).getOne();

      // el title y slug, son los nombres de la columna en la tablael otro es el valor
    }

    // const product = await this.productRepository.findOne({
    //   where: {
    //     id: id,
    //   }
    // });
    // const product = await this.productRepository.findOneBy({
    //   id: id,
    // });

    if (!product) {
      throw new NotFoundException(`producto con id: ${term}, no existe`);
    }

    return product;

  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    /// busca por el id, y le añade los atributos, pero no lo guarda, solo lo prepara
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto,
    });

    if (!product) {
      throw new NotFoundException(`product with ${id} not found`);
    }

    try {
      await this.productRepository.save(product);

    } catch (error) {
      this.handleDBExceptions(error);
    }
    return product;

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
    // console.log(error);
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException(`ayuda!`);
  }
}
