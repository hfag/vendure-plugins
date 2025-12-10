import { readFile, readdir } from "fs/promises";
import path from "path";

import { Injector, RequestContext } from "@vendure/core";
import {
  LoadTemplateInput,
  Partial,
  TemplateLoader,
} from "@vendure/email-plugin";

export class HfagEmailTemplateLoader implements TemplateLoader {
  constructor(private templatePath: string) {}

  async loadTemplate(
    injector: Injector,
    ctx: RequestContext,
    { type, templateName }: LoadTemplateInput
  ) {
    // returns the content of "body.de.hbs" or "body.en.hbs" depending on ctx.languageCode

    const filePath = path.join(
      this.templatePath,
      type,
      templateName.replace(".hbs", `.${ctx.languageCode}.hbs`)
    );

    return readFile(filePath, "utf-8");
  }

  async loadPartials(): Promise<Partial[]> {
    const partialsPath = path.join(this.templatePath, "partials");
    const partialsFiles = await readdir(partialsPath);

    return Promise.all(
      partialsFiles.map(async (file) => {
        return {
          name: path.basename(file, ".hbs"),
          content: await readFile(path.join(partialsPath, file), "utf-8"),
        };
      })
    );
  }
}
