import * as djot from "./djot.ts";
import * as templates from "./templates.ts";
import { mkdir } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { stat } from "node:fs";
import { join } from "node:path";

async function build() {
    const t = performance.now();
    await mkdir("./out", { recursive: true });

    const paths = [
      "css/*",
    ];
    for (const path of paths) {
     await update_path(path);
    }

    const posts = await collect_posts();
    await update_file("out/index.html", templates.post_list(posts).value);
    await update_file("out/index.html", templates.post_list(posts).value);
    for (const post of posts) {
      await update_file(`./out/${post.path}`,
            templates.post(post, false).value,
      )
    }
    const pages = ["about", "favourites"];
    for (const page of pages) {
    const file = Bun.file(`content/${page}.dj`);
    const text = await file.text();
    const ast = await djot.parse(text);
    const html = djot.render(ast, {});
    await update_file(`out/${page}.html`, templates.page(page, html).value);
  }
}

async function update_path(path: string) {
  if (path.endsWith("*")) {
    const dir = path.replace("*", "");
    const futs = [];

    const dir_entries = await readdirSync(`./content/${dir}`, { recursive: true, withFileTypes: true, });
    for await (const entry_name of dir_entries.filter(dir_entry => dir_entry.isFile()).map(dir_entry => dir_entry.name)) {
        futs.push(update_path(`${dir}/${entry_name}`));
    }
    await Promise.all(futs);
  } else {
    const current = Bun.file(`content/${path}`);
    await update_file(
      `out/${path}`,
      await current.text(),
    );
  }
}


async function update_file(path: string, content: Uint8Array | string) {
  if (!content) return;
  await Bun.write(path, content);
}


export type Post = {
  year: number;
  month: number;
  day: number;
  date: Date;
  path: string;
  content: djot.HtmlString;
};
//export type Post = {
//  year: number;
//  month: number;
//  day: number;
//  slug: string;
//  date: Date;
//  title: string;
//  path: string;
//  src: string;
//  content: HtmlString;
//};

async function collect_posts(): Promise<Post[]> {
    const start = performance.now();
    const posts = [];

    const dir_entries = await readdirSync("./content/posts", { recursive: true, withFileTypes: true, });
    const end = performance.now() - start;

    for (const f of dir_entries.filter(dir_entry => dir_entry.isFile()).map(dir_entry => dir_entry.name)) {
      const path = join("./content/posts", f)
      
      if (stat(path, (err, stats) => { return stats.isDirectory()})) {
        continue;
      }

      const file = Bun.file(path);
      const [y, m, d, ...rest] = f.split(/[-.]/);
      const slug = rest.join("-");

     // const [, y, m, d, slug] = path.match(
     //   /^(\d\d\d\d)-(\d\d)-(\d\d)-(.*)\.dj$/,
     // )!;
     const [year, month, day] = [y, m, d].map((it) => parseInt(it, 10));
     const date = new Date(Date.UTC(year, month - 1, day));
     const render_ctx = { date, summary: undefined, title: undefined };

      // TODO: Unfortunately this seems to be the type for .dj files
      if (file.type !== "application/octet-stream") {
        continue;
      }
      
      const text = await file.text();
      const ast = djot.parse(text);
      const html = djot.render(ast, render_ctx);
      posts.push({
        year,
        month,
        day,
        date,
        path: `/${y}/${m}/${d}/${slug}.html`,
        title: render_ctx.title,
        content: html,
      });
    }
    return posts;
}

async function serve() {
    const BASE_PATH = "./out";
    Bun.serve({
    port: 3000,
    async fetch(req) {
      var path = BASE_PATH + new URL(req.url).pathname;
      if (path.endsWith("/")) {
        path += "index.html";
      }
      const file = Bun.file(path);
      return new Response(file);
    },
  })
}


async function main() {
  const subcommand = Bun.argv[2];

  if (subcommand === "build") {
    build();
  } else if (subcommand === "serve") {
    serve();
  }
}

if (Bun.main) await main();
