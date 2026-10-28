import { formatMoney, moneyToMinor } from "../lib/money";
import Image from "next/image";
import { ShoppingCart, ArrowUpRight } from "lucide-react";
import type { Product } from "../types/catalog";
import { useState } from "react";
export const asset = (path?: string) =>
  path?.startsWith("https://")
    ? path
    : "/" + String(path || "").replace(/^(\.\.\/|\.\/|\/)+/, "");
export function Quantity({
  name,
  quantity,
  onChange,
  cart = false,
}: {
  name: string;
  quantity: number;
  onChange: (delta: number) => void;
  cart?: boolean;
}) {
  return (
    <div
      className={cart ? "quote-item__quantity" : "product-quantity"}
      aria-label={`Quantidade de ${name}`}
    >
      <button
        type="button"
        onClick={() => onChange(-1)}
        aria-label={`Diminuir quantidade de ${name}`}
      >
        −
      </button>
      {cart ? (
        <strong>{quantity}</strong>
      ) : (
        <span className="product-quantity__value">
          <small>No carrinho</small>
          <strong>{quantity}</strong>
        </span>
      )}
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label={`Aumentar quantidade de ${name}`}
      >
        +
      </button>
    </div>
  );
}
export default function ProductCard({
  product,
  isClient,
  quantity,
  onChange,
  website,
}: {
  product: Product;
  isClient: boolean;
  quantity: number;
  onChange: (delta: number) => void;
  website: string;
}) {
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");
  async function buyNow() {
    if (buying) return;
    setBuying(true);
    setBuyError("");
    try {
      const response = await fetch("/api/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: product.id, quantity: Math.max(1, quantity) }],
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível preparar a compra.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setBuyError(error instanceof Error ? error.message : "Tente novamente.");
      setBuying(false);
    }
  }
  const buyButton = product.shopifyVariantId ? (
    <button
      type="button"
      className={isClient ? "product-buy-link" : "product-buy-button"}
      disabled={buying}
      onClick={buyNow}
    >
      {!isClient && <ShoppingCart size={16} aria-hidden="true" />}
      {buying
        ? "Preparando checkout…"
        : isClient
          ? "Comprar agora"
          : "Comprar no site"}
      <ArrowUpRight size={14} aria-hidden="true" />
    </button>
  ) : null;
  return (
    <article
      className={`product-card ${isClient ? "product-card--selectable" : ""} ${quantity ? "is-selected" : ""}`}
    >
      <div className="product-card__media">
        <Image
          src={asset(product.image)}
          unoptimized={product.image.startsWith("https://")}
          alt={product.name}
          width={640}
          height={640}
          sizes="(max-width: 760px) 50vw, (max-width: 980px) 33vw, 20vw"
          loading="lazy"
        />
        <span className="product-code">{product.sku || product.id}</span>
      </div>
      <div className="product-card__body">
        <span className="product-category">
          {product.category || "Coleção"}
        </span>
        <h2>
          <a
            className="product-detail-link"
            href={product.siteUrl || website}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver detalhes no site"
          >
            {product.name}
          </a>
        </h2>
        <p>{product.description}</p>
        <div className="product-card__purchase">
          {product.price !== undefined && (
            <div className="product-price">
              {product.compareAtPrice &&
                moneyToMinor(product.compareAtPrice) >
                  moneyToMinor(product.price) && (
                  <del>
                    {formatMoney(product.compareAtPrice, product.currency)}
                  </del>
                )}
              <strong>{formatMoney(product.price, product.currency)}</strong>
              <small>Preço por unidade / variante</small>
            </div>
          )}
          {isClient ? (
            <div className="product-card__actions">
              {quantity ? (
                <Quantity
                  name={product.name}
                  quantity={quantity}
                  onChange={onChange}
                />
              ) : (
                <button
                  className="product-cart-button"
                  type="button"
                  onClick={() => onChange(1)}
                  aria-label={`Adicionar ${product.name} ao carrinho`}
                >
                  <span className="product-cart-button__icon">
                    <ShoppingCart aria-hidden="true" />
                  </span>
                  <span>Adicionar ao carrinho</span>
                </button>
              )}
              {buyButton}
            </div>
          ) : (
            <>
              {buyButton}
              <div className="product-card__footer">
                <span className="product-add-label">Catálogo do gestor</span>
              </div>
            </>
          )}
          {buyError && (
            <p className="product-buy-error" role="alert">
              {buyError}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
