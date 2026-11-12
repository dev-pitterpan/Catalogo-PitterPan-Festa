import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  catalogCampaigns,
  shoppingDepartments,
  shoppingSubcategories,
} from "../../lib/catalog/departments";
import type { CatalogSummary } from "../../types/catalog";
import CatalogIcon from "./CatalogIcon";

export default function PublicCatalogNavigation({
  catalogs,
  slug,
  collapsed,
  onExpand,
  onSelect,
}: {
  catalogs: CatalogSummary[];
  slug: string;
  collapsed: boolean;
  onExpand: () => void;
  onSelect: () => void;
}) {
  const bySlug = new Map(catalogs.map((item) => [item.slug, item]));
  const currentSubcategory = shoppingSubcategories.find(
    (item) => item.slug === slug,
  );
  const campaigns = catalogCampaigns(catalogs);
  const dates = campaigns.find((item) => item.slug === "datas-especiais");
  const campaignItems = campaigns.filter(
    (item) => item.slug !== "datas-especiais",
  );
  const link = (item: CatalogSummary | undefined, nested = false) =>
    item && (
      <Link
        key={item.slug}
        className={`catalog-nav-item${item.slug === slug ? " is-active" : ""}${nested ? " public-catalog-nav__child" : ""}`}
        href={`/${item.slug}/`}
        prefetch={false}
        onClick={onSelect}
        aria-current={item.slug === slug ? "page" : undefined}
        title={item.name}
      >
        {!nested && (
          <span className="nav-icon">
            <CatalogIcon slug={item.slug} />
          </span>
        )}
        <span className="nav-name">{item.name}</span>
      </Link>
    );

  return (
    <div className="public-catalog-nav catalog-nav-list" key={slug}>
      {link(bySlug.get("todos"))}
      {shoppingDepartments.map((department) => {
        const item = bySlug.get(department.slug);
        if (!item) return null;
        const active =
          slug === item.slug || currentSubcategory?.parent === item.slug;
        const children = active
          ? shoppingSubcategories.filter(({ parent }) => parent === item.slug)
          : [];
        return (
          <div key={item.slug}>
            {link(item)}
            {children.some((child) => bySlug.has(child.slug)) && (
              <div
                className="public-catalog-nav__children"
                aria-label={`Subcategorias de ${item.name}`}
              >
                {children.map((child) => link(bySlug.get(child.slug), true))}
              </div>
            )}
          </div>
        );
      })}
      {campaignItems.length > 0 ? (
        <details
          className="public-catalog-nav__dates"
          open={campaigns.some((item) => item.slug === slug)}
        >
          <summary
            className="catalog-nav-item"
            title="Datas especiais"
            onClick={(event) => {
              if (collapsed) {
                if (
                  event.currentTarget.parentElement instanceof
                    HTMLDetailsElement &&
                  event.currentTarget.parentElement.open
                )
                  event.preventDefault();
                onExpand();
              }
            }}
          >
            <span className="nav-icon">
              <CatalogIcon slug="datas-especiais" />
            </span>
            <span className="nav-name">Datas especiais</span>
            <ChevronDown
              className="public-catalog-nav__chevron"
              size={15}
              aria-hidden="true"
            />
          </summary>
          <div className="public-catalog-nav__children">
            {link(dates && { ...dates, name: "Ver todas as datas" }, true)}
            {campaignItems
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
              .map((item) => link(item, true))}
          </div>
        </details>
      ) : (
        link(dates)
      )}
      {link(bySlug.get("ofertas"))}
    </div>
  );
}
