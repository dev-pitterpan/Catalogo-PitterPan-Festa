import { ShoppingCart, ArrowUpRight } from "lucide-react";
import type { Product } from "../types/catalog";
export const asset = (path?: string) =>
  "/" + String(path || "").replace(/^(\.\.\/|\.\/|\/)+/, "");
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
  return (
    <article
      className={`product-card ${isClient ? "product-card--selectable" : ""} ${quantity ? "is-selected" : ""}`}
    >
      <div className="product-card__media">
        <img src={asset(product.image)} alt={product.name} loading="lazy" />
        <span className="product-code">{product.id}</span>
      </div>
      <div className="product-card__body">
        <span className="product-category">
          {product.category || "Coleção"}
        </span>
        <h2>{product.name}</h2>
        <p>{product.description}</p>
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
            <a
              className="product-site-link"
              href={product.siteUrl || website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Ver no site</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className="product-card__footer">
            <span className="product-add-label">Catálogo do gestor</span>
          </div>
        )}
      </div>
    </article>
  );
}
