import "dotenv/config";

// Demo prices, not market prices. Products start as drafts until images are added.
const groups = [
  {
    category: "Celulares",
    products: [
      ["iPhone 12", 299],
      ["iPhone 12 mini", 279],
      ["iPhone 12 Pro", 349],
      ["iPhone 12 Pro Max", 399],
      ["iPhone 13", 399],
      ["iPhone 13 mini", 379],
      ["iPhone 13 Pro", 449],
      ["iPhone 13 Pro Max", 499],
      ["iPhone 14", 499],
      ["iPhone 14 Plus", 549],
      ["iPhone 14 Pro", 599],
      ["iPhone 14 Pro Max", 649],
      ["iPhone 15", 599],
      ["iPhone 15 Plus", 649],
      ["iPhone 15 Pro", 749],
      ["iPhone 15 Pro Max", 849],
      ["iPhone 16", 699],
      ["iPhone 16 Plus", 799],
      ["iPhone 16 Pro", 899],
      ["iPhone 16 Pro Max", 999],
    ],
  },
  {
    category: "Tablets",
    products: [
      ["iPad", 349],
      ["iPad mini", 449],
      ["iPad Air", 599],
      ["iPad Pro", 999],
    ],
  },
  {
    category: "Computadoras",
    products: [
      ["MacBook Air 13", 999],
      ["MacBook Air 15", 1199],
      ["MacBook Pro 14", 1599],
      ["Mac mini", 599],
    ],
  },
  {
    category: "Audio",
    products: [
      ["AirPods 3", 129],
      ["AirPods 4", 149],
      ["AirPods Pro 2", 199],
      ["AirPods Max", 499],
    ],
  },
  {
    category: "Accesorios",
    products: [
      ["Cargador USB-C 20 W", 25],
      ["Cable USB-C de 1 metro", 15],
      ["Cargador MagSafe", 39],
      ["Funda transparente para iPhone 15", 19],
    ],
  },
] satisfies { category: string; products: [string, number][] }[];

type Category = { id: string; name: string };
type ProductPage = { items: { id: string; name: string }[]; pages: number };
const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

async function main() {
  const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3100")
    .origin;
  if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
    throw new Error("Este comando solo carga datos en el entorno local.");
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error(
      "Configurá las credenciales administrativas locales antes de ejecutar el comando.",
    );
  const login = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok)
    throw new Error(
      `No se pudo iniciar sesión administrativa (HTTP ${login.status}).`,
    );
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  if (!cookie)
    throw new Error("El servidor no devolvió una sesión administrativa.");
  async function rpc<T>(
    procedure: string,
    input?: unknown,
    mutation = false,
  ): Promise<T> {
    const query =
      !mutation && input !== undefined
        ? `?input=${encodeURIComponent(JSON.stringify(input))}`
        : "";
    const response = await fetch(`${origin}/api/trpc/${procedure}${query}`, {
      method: mutation ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: cookie,
      },
      ...(mutation ? { body: JSON.stringify(input) } : {}),
    });
    const result = await response.json();
    if (!response.ok || result.error)
      throw new Error(
        `${procedure}: ${result.error?.message ?? `HTTP ${response.status}`}`,
      );
    return result.result.data as T;
  }
  try {
    await rpc("admin.currentUser");
    const categories = await rpc<Category[]>("adminCategory.list");
    const existingNames = new Set<string>();
    let page = 1;
    let pages = 1;
    do {
      const result = await rpc<ProductPage>("adminProduct.list", {
        page,
        search: "",
      });
      for (const item of result.items) existingNames.add(normalize(item.name));
      pages = result.pages;
      page++;
    } while (page <= pages);
    let createdProducts = 0;
    let skipped = 0;
    const newCategories: string[] = [];
    for (const group of groups) {
      let category = categories.find(
        (item) => normalize(item.name) === normalize(group.category),
      );
      if (!category) {
        category = await rpc<Category>(
          "adminCategory.create",
          { name: group.category },
          true,
        );
        categories.push(category);
        newCategories.push(category.name);
      }
      let created = 0;
      for (const [name, dollars] of group.products) {
        if (existingNames.has(normalize(name))) {
          skipped++;
          continue;
        }
        await rpc(
          "adminProduct.create",
          {
            name,
            description: `${name}. Producto del catálogo de demostración, con precio de prueba en USD. Imagen pendiente de carga.`,
            priceCents: dollars * 100,
            categoryId: category.id,
          },
          true,
        );
        existingNames.add(normalize(name));
        created++;
        createdProducts++;
      }
      console.log(`${category.name}: ${created} productos nuevos en borrador.`);
    }
    console.log(
      `Total: ${createdProducts} productos creados; ${skipped} existentes conservados.`,
    );
    console.log(`Categorías nuevas: ${newCategories.join(", ") || "ninguna"}.`);
  } finally {
    await fetch(`${origin}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: cookie,
      },
      body: "{}",
    });
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudieron cargar los productos de demostración.",
  );
  process.exitCode = 1;
});
