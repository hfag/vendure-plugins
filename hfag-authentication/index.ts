import {
  AuthenticationStrategy,
  ID,
  Injector,
  NativeAuthenticationMethod,
  PasswordCipher,
  RequestContext,
  TransactionalConnection,
  User,
} from "@vendure/core";
import { DocumentNode } from "graphql";
import gql from "graphql-tag";
import { IsNull } from "typeorm";

export type LegacyAuthData = {
  email: string;
  password: string;
};

export class HfagAuthenticationStrategy
  implements AuthenticationStrategy<LegacyAuthData>
{
  readonly name = "hfag";
  private connection: TransactionalConnection;
  private passwordCipher: PasswordCipher;

  constructor() {}

  init(injector: Injector) {
    this.connection = injector.get(TransactionalConnection);
    this.passwordCipher = injector.get(PasswordCipher);
  }

  defineInputType(): DocumentNode {
    // Here we define the expected input object expected by the `authenticate` mutation.
    return gql`
      input LegacyAuthInput {
        email: String!
        password: String!
      }
    `;
  }

  async authenticate(
    ctx: RequestContext,
    data: LegacyAuthData
  ): Promise<User | false> {
    // First part is copy paste from the legacy authentication strategy.

    const user = await this.getUserFromIdentifier(ctx, data.email);
    if (!user) {
      return false;
    }
    //continue as usual (native authentication strategy)
    const passwordMatch = await this.verifyUserPassword(
      ctx,
      user.id,
      data.password
    );
    if (!passwordMatch) {
      return false;
    }

    return user;
  }

  private getUserFromIdentifier(
    ctx: RequestContext,
    identifier: string
  ): Promise<User | null> {
    return this.connection.getRepository(ctx, User).findOne({
      where: { identifier, deletedAt: IsNull() },
      relations: ["roles", "roles.channels"],
    });
  }

  async verifyUserPassword(
    ctx: RequestContext,
    userId: ID,
    password: string
  ): Promise<boolean> {
    const user = await this.connection.getRepository(ctx, User).findOne({
      where: { id: userId },
      relations: ["authenticationMethods"],
    });
    if (!user) {
      return false;
    }
    const nativeAuthMethod = user.getNativeAuthenticationMethod();
    const pw =
      (
        await this.connection
          .getRepository(ctx, NativeAuthenticationMethod)
          .findOne({
            where: { id: nativeAuthMethod.id },
            select: ["passwordHash"],
          })
      )?.passwordHash ?? "";

    const passwordMatches = await this.passwordCipher.check(password, pw);
    if (!passwordMatches) {
      return false;
    }
    return true;
  }
}
