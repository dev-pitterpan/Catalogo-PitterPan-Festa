/** Gera dois projetos autossuficientes sem modificar a aplicação em produção. */
import {
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile,
  access,
  unlink,
} from "node:fs/promises";
import { resolve, join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(
  process.argv[2] || join(root, "../independent-repositories"),
);
const originalPackage = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
async function files(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) found.push(...(await files(path)));
    else found.push(path);
  }
  return found;
}
async function copy(source: string, destination: string) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, {
    recursive: true,
    filter: (path) =>
      ![".next", "node_modules", ".well-known", ".swc"].includes(
        path.split(/[\\/]/).at(-1)!,
      ),
  });
}
for (const [app, name] of [
  ["catalogo-digital", "pitterpan-catalogo-digital"],
  ["gestao-comercial", "pitterpan-gestao-comercial"],
]) {
  const destination = join(output, name);
  try {
    await access(destination);
    throw new Error(
      `A pasta ${destination} já existe. Escolha outro destino para preservar os arquivos.`,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(destination, { recursive: true });
  for (const folder of ["public", "config"])
    await copy(join(root, folder), join(destination, folder));
  await copy(
    join(root, "packages/shared/src"),
    join(destination, "src/shared"),
  );
  await copy(join(root, "apps", app, "src/app"), join(destination, "src/app"));
  await copy(
    join(root, "apps", app, ".env.example"),
    join(destination, ".env.example"),
  );
  await writeFile(
    join(destination, ".gitignore"),
    "node_modules/\n.next/\n.swc/\n.env\n.env.*\n!.env.example\n*.log\n*.tsbuildinfo\n.workflow-data/\nsrc/app/.well-known/\n",
  );
  await writeFile(
    join(destination, "next-env.d.ts"),
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
  );
  await copy(
    join(root, "postcss.config.mjs"),
    join(destination, "postcss.config.mjs"),
  );
  const config = (
    await readFile(join(root, "packages/shared/next-config.ts"), "utf8")
  ).replaceAll(
    'new URL("../../", import.meta.url)',
    'new URL("./", import.meta.url)',
  );
  await writeFile(
    join(destination, "next.config.ts"),
    config +
      (app === "gestao-comercial"
        ? '\nimport { withWorkflow } from "workflow/next";\nexport default withWorkflow(applicationConfig("management"));\n'
        : '\nexport default applicationConfig("catalog");\n'),
  );
  const tsconfig = JSON.parse(
    await readFile(join(root, "tsconfig.json"), "utf8"),
  );
  tsconfig.compilerOptions.paths = { "@shared/*": ["./src/shared/*"] };
  tsconfig.include = [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    "scripts/**/*.ts",
    "tests/**/*.ts",
    "next.config.ts",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
  ];
  await writeFile(
    join(destination, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2) + "\n",
  );
  const scripts = Object.fromEntries(
    Object.entries(originalPackage.scripts).filter(
      ([key]) => !/^(dev:|build:|start:|test:apps|test:server)/.test(key),
    ),
  );
  scripts["format"] = "prettier --write src scripts tests *.json *.ts *.mjs";
  scripts["format:check"] =
    "prettier --check src scripts tests *.json *.ts *.mjs";
  scripts["test:server"] = "node tests/server.mjs";
  const catalogScripts = [
    "run-next.ts",
    "setup-env.ts",
    "shopify-sync.ts",
    "shopify-publish.ts",
    "shopify-report.ts",
    "shopify-validate.ts",
    "database/migrate.ts",
  ];
  const sourceScripts =
    app === "gestao-comercial"
      ? (await files(join(root, "scripts"))).filter(
          (p) =>
            p.endsWith(".ts") &&
            !["run-app.ts", "split-repositories.ts"].includes(
              p.split(/[\\/]/).at(-1)!,
            ),
        )
      : catalogScripts.map((p) => join(root, "scripts", p));
  for (const source of sourceScripts) {
    const target = join(
      destination,
      "scripts",
      relative(join(root, "scripts"), source),
    );
    await copy(source, target);
    const text = (await readFile(target, "utf8")).replaceAll(
      "packages/shared/src/",
      "src/shared/",
    );
    await writeFile(target, text);
  }
  if (app === "catalogo-digital") {
    for (const key of Object.keys(scripts))
      if (key.startsWith("sales:") || key === "admin:setup")
        delete scripts[key];
    const launcher = join(destination, "scripts/run-next.ts");
    let text = await readFile(launcher, "utf8");
    text = text.replace(
      'import { localAuthEnvironment } from "./local-auth-env.ts";\n',
      "",
    );
    text = text.replace(
      /\/\/ Falha cedo[\s\S]*?\/\/ O mesmo comando/,
      "// O mesmo comando",
    );
    text = text.replace(
      /env: localAuthEnvironment\([\s\S]*?\n    \),/,
      "env: process.env,",
    );
    await writeFile(launcher, text);
  }
  const catalogTests = [
    "application-links.test.ts",
    "catalog.test.ts",
    "checkout.test.ts",
    "departments.test.ts",
    "navigation.test.ts",
    "page-state.test.ts",
    "shopify-live.test.ts",
    "scale.test.ts",
  ];
  const sourceTests =
    app === "gestao-comercial"
      ? (await files(join(root, "tests"))).filter((p) => p.endsWith(".test.ts"))
      : catalogTests.map((p) => join(root, "tests", p));
  for (const source of sourceTests) {
    const target = join(
      destination,
      "tests",
      relative(join(root, "tests"), source),
    );
    await copy(source, target);
    await writeFile(
      target,
      (await readFile(target, "utf8")).replaceAll(
        "packages/shared/src/",
        "src/shared/",
      ),
    );
  }
  let smoke = (await readFile(join(root, "tests/apps.mjs"), "utf8")).replaceAll(
    "packages/shared/src/",
    "src/shared/",
  );
  const start = smoke.indexOf("for (const [application, port]");
  const end = smoke.indexOf("]) {", start);
  if (start < 0 || end < 0)
    throw new Error("Formato do teste HTTP não reconhecido.");
  smoke =
    smoke.slice(0, start) +
    `for (const [application, port] of [["${app}", "${app === "catalogo-digital" ? "3188" : "3189"}"]]) {` +
    smoke.slice(end + 4);
  smoke = smoke.replace(
    '["scripts/run-app.ts", application, "start"]',
    '["scripts/run-next.ts", "start"]',
  );
  await writeFile(join(destination, "tests/server.mjs"), smoke);
  const dependencies = { ...originalPackage.dependencies };
  if (app === "catalogo-digital") {
    delete dependencies.leaflet;
    delete dependencies.workflow;
  }
  const pkg = {
    name,
    version: originalPackage.version,
    private: true,
    type: "module",
    scripts,
    dependencies,
    devDependencies: originalPackage.devDependencies,
    engines: originalPackage.engines,
    overrides: originalPackage.overrides,
  };
  await writeFile(
    join(destination, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
  );
  const lock = JSON.parse(
    await readFile(join(root, "package-lock.json"), "utf8"),
  );
  lock.name = name;
  lock.packages = Object.fromEntries(
    Object.entries(lock.packages).filter(
      ([key]) =>
        !key.startsWith("apps/") &&
        !key.startsWith("packages/") &&
        !key.startsWith("node_modules/@pitterpan/"),
    ),
  );
  lock.packages[""] = {
    name,
    version: pkg.version,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
    engines: pkg.engines,
  };
  await writeFile(
    join(destination, "package-lock.json"),
    JSON.stringify(lock, null, 2) + "\n",
  );
  await writeFile(
    join(destination, "vercel.json"),
    JSON.stringify(
      {
        framework: "nextjs",
        installCommand: "npm ci",
        buildCommand: "npm run build",
      },
      null,
      2,
    ) + "\n",
  );
  const globalCss = join(destination, "src/shared/global.css");
  await writeFile(
    globalCss,
    (await readFile(globalCss, "utf8")).replace(
      "@source '../../../apps';",
      "@source '../app';",
    ),
  );
  // Remove módulos não utilizados do catálogo, incluindo vendas e autenticação.
  // Resolve imports, reexports e arquivos locais de SQL/CSS/JSON, sem depender de ../outro-projeto.
  if (app === "catalogo-digital") {
    const all = await files(join(destination, "src/shared"));
    const seeds = [
      ...(await files(join(destination, "src/app"))),
      ...(await files(join(destination, "scripts"))),
      ...(await files(join(destination, "tests"))),
    ];
    const visited = new Set<string>();
    const queue = [...seeds];
    while (queue.length) {
      const path = resolve(queue.pop()!);
      if (visited.has(path)) continue;
      visited.add(path);
      if (!/\.(tsx?|mjs|css)$/.test(path)) continue;
      const text = await readFile(path, "utf8");
      for (const match of text.matchAll(
        /["']((?:\.{1,2}\/|@shared\/)[^"'\n]+)["']/g,
      )) {
        const specifier = match[1];
        const base = specifier.startsWith("@shared/")
          ? join(destination, "src/shared", specifier.slice("@shared/".length))
          : resolve(dirname(path), specifier);
        const target = [
          base,
          ...[
            ".ts",
            ".tsx",
            ".json",
            ".css",
            ".mjs",
            ".sql",
            "/index.ts",
            "/index.tsx",
          ].map((extension) => base + extension),
        ].find(
          (candidate) => existsSync(candidate) && !candidate.endsWith("/"),
        );
        if (
          target?.startsWith(join(destination, "src")) ||
          target?.startsWith(join(destination, "scripts"))
        )
          queue.push(target);
      }
    }
    for (const path of all) if (!visited.has(resolve(path))) await unlink(path);
  }
  await writeFile(
    join(destination, "README.md"),
    `# ${app === "catalogo-digital" ? "Pitter Pan — Catálogo Digital" : "Pitter Pan — Gestão Comercial"}\n\nProjeto independente. Não depende do repositório do outro sistema.\n\n## Executar\n\nNode.js 24 ou superior.\n\n\`\`\`powershell\nnpm ci\nCopy-Item .env.example .env\nnpm run dev\n\`\`\`\n\nPreencha o .env sem sobrescrever configurações existentes. Porta padrão: ${app === "catalogo-digital" ? "3000" : "3001"}.\n\n## Verificar\n\n\`npm run typecheck\`, \`npm test\`, \`npm run build\` e \`npm run test:server\`. Os testes HTTP utilizam dados fictícios e JSON locais.\n\n## Publicar na Vercel\n\nImporte este repositório com Root Directory na raiz (\`./\`), framework Next.js e Node 24. Configure as variáveis do .env.example nas configurações do projeto. Em produção, NEXT_PUBLIC_CATALOG_URL deve apontar para https://catalogopitterpanfesta.vercel.app. Nunca envie .env ou credenciais ao GitHub.\n\n${app === "gestao-comercial" ? "Mantenha os endpoints /api/webhooks/shopify/sales/ e /api/cron/sales/ no domínio da gestão. A base de produtos pode ser compartilhada com o catálogo; isso não duplica a loja nem os pedidos.\n" : "O catálogo não contém as rotas de login, gestão, vendas, cron ou webhooks. A integração com a Shopify é executada no servidor.\n"}\n## Organização\n\nPáginas e APIs em src/app. Componentes, regras e integrações utilizadas por esta aplicação em src/shared. Recursos em public e configurações em config. Scripts e testes pertencem a este projeto.\n`,
  );
  console.log(`${name}: preparado em ${destination}`);
}
