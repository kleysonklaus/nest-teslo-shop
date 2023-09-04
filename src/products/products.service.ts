import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from "uuid";
import { Product, ProductImage } from './entities';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSoruce: DataSource,

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

      const { images = [], ...producDetails } = createProductDto;

      const producto = this.productRepository.create({
        ...producDetails,
        images: images.map(imageUrl => this.productImageRepository.create({ url: imageUrl })),
      });

      await this.productRepository.save(producto);

      return { ...producto, images };
    } catch (error) {

      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    // return this.productRepository.find({
    //   skip: offset,
    //   take: limit,
    //   // TODO: relaciones
    // });
    const products = await this.productRepository.find({
      skip: offset,
      take: limit,
      relations: {
        images: true,
      }
    });

    return products.map(product => ({
      ...product,
      images: product.images.map(image => image.url),
    }));
  }

  async findOne(term: string) {

    let product: Product;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod'); // prod es el alias
      product = await queryBuilder.where(`UPPER(title) =:title or slug =:slug`, {
        title: term.toUpperCase(),
        slug: term.toLowerCase(),
      })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();

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

    return product; // si se cambia esto afeacta el remove

  }


  async findOnePlain(term: string) {
    const { images = [], ...product } = await this.findOne(term);
    return {
      ...product,
      images: images.map(img => img.url),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...toUpdate } = updateProductDto;

    /// busca por el id, y le añade los atributos, pero no lo guarda, solo lo prepara
    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate
    });

    if (!product) {
      throw new NotFoundException(`product with ${id} not found`);
    }


    /// create query runner
    const queryRunner = this.dataSoruce.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      if (images) {
        // -----------------------------------------------------------productId
        await queryRunner.manager.delete(ProductImage, { product: { id: id } });

        product.images = images.map(
          (image) => this.productImageRepository.create({ url: image })
        );
      } else {
        // prodcut.images ?? se debe cargas las imagenes
      }

      /// intenta guardar las iamgenes
      await queryRunner.manager.save(product);
      // await this.productRepository.save(product);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      // return product;
      return this.findOnePlain(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBExceptions(error);
    }
    // return product;

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

  /// una forma de eliminar todos los productos
  /// sera utilziado para la semilla
  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');
    try {
      return await query
        .delete()
        .where({})
        .execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
