import ProductsPage from "../../../../components/admin/ProductsPage";
export default function Offers(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ProductsPage {...props} mode="offers" />;
}
