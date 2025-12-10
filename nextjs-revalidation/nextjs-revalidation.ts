import { OnApplicationBootstrap } from "@nestjs/common";
import {
  CollectionEvent,
  EventBus,
  PluginCommonModule,
  ProductEvent,
  ProductTranslation,
  TransactionalConnection,
  Type,
  VendurePlugin,
} from "@vendure/core";
import fetch from "node-fetch";

const arrayToGetParameter = (name: string, array: string[]): string =>
  array
    .map((a) => `${encodeURIComponent(name)}=${encodeURIComponent(a)}`)
    .join("&");

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class NextJsRevalidation implements OnApplicationBootstrap {
  private static REVALIDATION_SECRET: string;
  private static REVALIDATION_URL: string;

  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection
  ) {}

  static buildFetchUrl(type: string, languages: string[], slugs: string[]) {
    return `${NextJsRevalidation.REVALIDATION_URL}?secret=${
      NextJsRevalidation.REVALIDATION_SECRET
    }&type=${encodeURIComponent(type)}&${arrayToGetParameter(
      "languages",
      languages
    )}&${arrayToGetParameter("slugs", slugs)}`;
  }

  static init(
    REVALIDATION_URL: string,
    REVALIDATION_SECRET: string
  ): Type<NextJsRevalidation> {
    NextJsRevalidation.REVALIDATION_URL = REVALIDATION_URL;
    NextJsRevalidation.REVALIDATION_SECRET = REVALIDATION_SECRET;
    return this;
  }

  async onApplicationBootstrap() {
    this.eventBus.ofType(CollectionEvent).subscribe((event) => {
      // do some action when this event fires
      const languages: string[] = [];
      const slugs: string[] = [];
      event.entity.translations.forEach((t) => {
        languages.push(t.languageCode);
        slugs.push(t.slug);
      });

      fetch(
        NextJsRevalidation.buildFetchUrl("collection", languages, slugs)
      ).catch(console.error);
    });

    this.eventBus.ofType(ProductEvent).subscribe(async (event) => {
      const languages: string[] = [];
      const slugs: string[] = [];

      const translationRepository = this.connection.getRepository(
        event.ctx,
        ProductTranslation
      );

      // Fetch translation from the database to get the slugs
      const translations = await translationRepository.find({
        where: { base: { id: event.entity.id } },
      });

      translations.forEach((t) => {
        languages.push(t.languageCode);
        slugs.push(t.slug);
      });

      fetch(
        NextJsRevalidation.buildFetchUrl("product", languages, slugs)
      ).catch(console.error);
    });
  }
}
