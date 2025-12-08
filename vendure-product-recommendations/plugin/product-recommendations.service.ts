import { Injectable } from "@nestjs/common";
import {
  DeletionResponse,
  DeletionResult,
} from "@vendure/common/lib/generated-types";
import {
  ID,
  assertFound,
  Product,
  TransactionalConnection,
  RequestContext,
} from "@vendure/core";
import { In } from "typeorm";
import { FindManyOptions } from "typeorm/find-options/FindManyOptions";

import { ProductRecommendationInput } from "./index";
import { ProductRecommendation } from "./product-recommendation.entity";

@Injectable()
export class ProductRecommendationService {
  constructor(private connection: TransactionalConnection) {}

  findAll(
    ctx: RequestContext,
    options: FindManyOptions<ProductRecommendation> | undefined
  ): Promise<ProductRecommendation[]> {
    return this.connection
      .getRepository(ctx, ProductRecommendation)
      .find(options);
  }
  findOne(
    ctx: RequestContext,
    recommendationId: ID
  ): Promise<ProductRecommendation | null> {
    return this.connection
      .getRepository(ctx, ProductRecommendation)
      .findOne({ where: { id: recommendationId }, loadEagerRelations: true });
  }

  async create(
    ctx: RequestContext,
    input: ProductRecommendationInput
  ): Promise<ProductRecommendation> {
    const recommendation = new ProductRecommendation({
      product: await this.connection
        .getRepository(ctx, Product)
        .findOne({ where: { id: input.product } }),
      recommendation: await this.connection
        .getRepository(ctx, Product)
        .findOne({ where: { id: input.recommendation } }),
      type: input.type,
    });
    const newRecommendation = await this.connection
      .getRepository(ctx, ProductRecommendation)
      .save(recommendation);

    return assertFound(this.findOne(ctx, newRecommendation.id));
  }

  async delete(ctx: RequestContext, ids: ID[]): Promise<DeletionResponse> {
    try {
      await this.connection.rawConnection
        .createQueryBuilder()
        .delete()
        .from(ProductRecommendation)
        .where({ id: In(ids) })
        .execute();

      return {
        result: DeletionResult.DELETED,
      };
    } catch (e) {
      return {
        result: DeletionResult.NOT_DELETED,
        message: e instanceof Error ? e.toString() : "",
      };
    }
  }
}
