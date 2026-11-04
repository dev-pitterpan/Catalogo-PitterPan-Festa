import ProductsPage from "@shared/components/admin/ProductsPage";
export default function Stock(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ProductsPage {...props} mode="stock" />;
}
