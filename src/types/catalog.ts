/** Contratos compartilhados entre componentes, estado e acesso aos dados. */
export interface Product {
  id: string;
  name: string;
  category?: string;
  description: string;
  image: string;
  keywords?: string[];
  siteUrl?: string;
}
export interface CatalogSummary {
  name: string;
  slug: string;
  cardClass: string;
  description: string;
  accent: string;
}
export interface Catalog {
  name: string;
  slug: string;
  eyebrow?: string;
  description: string;
  banner: string;
  products: Product[];
}
export interface SiteConfig {
  brand: { name: string; website: string };
  catalog: { publicBaseUrl: string };
  whatsapp: { number: string; display: string };
}
export interface QuoteItem extends Product {
  catalog: string;
  catalogSlug: string;
  quantity: number;
}

/** Dados serializáveis enviados pelas páginas Next.js para a interface interativa. */
export interface CatalogPageData {
  catalogs: CatalogSummary[];
  catalog: Catalog | null;
  config: SiteConfig | null;
}
