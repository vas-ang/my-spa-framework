// TODO: To run the example, copy the 'my-spa-framework.js' file in the example directory.

import { SPA } from "./my-spa-framework.js";

window.addEventListener("load", function () {
  async function main() {
    this.swap(await (await this.load("./templates/home.html")).text());
  }

  const app = SPA("#main", function () {
    this.get("/", main);
    this.get("/index.html", main);
    this.get("/home", main);

    this.get("/about", async function () {
      this.swap(await (await this.load("./templates/about.html")).text());
    });

    this.get("/register", function () {
      this.redirect(`/home/${this.params.username}`);
    });

    this.get("/home/:username", function () {
      this.swap(`<h1>Hello, ${this.params.username}!</h1>`);
    });
  });

  app.run();
});
