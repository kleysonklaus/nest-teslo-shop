import { Type } from "class-transformer";
import { IsOptional, IsPositive, Min } from "class-validator";

export class PaginationDto {

    @IsOptional()
    @IsPositive()
    // transformar
    @Type(() => Number)  /// enableImplicitConversion: true
    limit?: number;


    @IsOptional()
    // @IsPositive() // da error al hacer el get
    @Min(0)
    @Type(() => Number)  /// enableImplicitConversion: true
    offset?: number;


}