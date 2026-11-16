"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, X } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Gate } from "@/lib/permissions";
import { ApplicationForm } from "@/components/release-status/catalog/ApplicationForm";
import { ApplicationTable } from "@/components/release-status/catalog/ApplicationTable";
import { ConfirmDelete } from "@/components/release-status/catalog/ConfirmDelete";
import { errorParts } from "@/components/release-status/catalog/Field";
import { NOT_EMPTY_MESSAGE, ProductList } from "@/components/release-status/catalog/ProductList";
import { ProductForm } from "@/components/release-status/catalog/ProductForm";
import {
  useApplications,
  useDeleteApplication,
  useDeleteProduct,
  useProducts,
  useTriggerReleaseSync,
} from "@/hooks/useReleaseStatus";
import type { Application, Product } from "@/types/release-status";

function CatalogView() {
  const products = useProducts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const applications = useApplications(selectedId ?? undefined);
  const trigger = useTriggerReleaseSync();
  const deleteProduct = useDeleteProduct();
  const deleteApplication = useDeleteApplication();

  const [query, setQuery] = useState("");
  const [productDialog, setProductDialog] = useState<{ product: Product | null } | null>(null);
  const [appDialog, setAppDialog] = useState<{ application: Application | null } | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);

  const productList = useMemo(() => products.data ?? [], [products.data]);
  const productNames = useMemo(() => Object.fromEntries(productList.map((p) => [p.id, p.name])), [productList]);

  const closeDelete = () => {
    setProductToDelete(null);
    setAppToDelete(null);
    setDeleteError(null);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      if (selectedId === productToDelete.id) setSelectedId(null);
      closeDelete();
    } catch (error) {
      const { status } = errorParts(error);
      setDeleteError(status === 409 ? NOT_EMPTY_MESSAGE : "Impossibile eliminare il prodotto");
    }
  };

  const confirmDeleteApplication = async () => {
    if (!appToDelete) return;
    try {
      await deleteApplication.mutateAsync(appToDelete.id);
      closeDelete();
    } catch {
      setDeleteError("Impossibile eliminare l'applicazione");
    }
  };

  if (products.isLoading) {
    return <div role="status" aria-label="Caricamento catalogo" className="h-40 animate-pulse rounded-[var(--radius)] bg-subtle" />;
  }
  if (products.error) {
    return (
      <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        Impossibile caricare il catalogo
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <Link href="/releases" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Release Status
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">Catalogo</h1>
          <p className="mt-1 text-xs text-text-muted">Prodotti e applicazioni monitorati nella pagina Release Status.</p>
        </div>

        {notice && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-sm text-success"
          >
            <span>Applicazione salvata</span>
            <span className="flex items-center gap-2">
              <Gate action="sync:trigger">
                <button
                  type="button"
                  className="rounded-md border border-success/40 px-2.5 py-1 text-xs font-medium hover:bg-surface"
                  onClick={() => {
                    trigger.mutate();
                    setNotice(false);
                  }}
                >
                  Sincronizza ora
                </button>
              </Gate>
              <button type="button" aria-label="Chiudi notifica" onClick={() => setNotice(false)} className="rounded-sm p-1 hover:bg-surface">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          </div>
        )}

        <div className="grid min-w-0 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <ProductList
            products={productList}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={() => setProductDialog({ product: null })}
            onEdit={(product) => setProductDialog({ product })}
            onDelete={(product) => setProductToDelete(product)}
          />
          <ApplicationTable
            applications={applications.data ?? []}
            productNames={productNames}
            query={query}
            onQueryChange={setQuery}
            canAdd={productList.length > 0}
            onAdd={() => setAppDialog({ application: null })}
            onEdit={(application) => setAppDialog({ application })}
            onDelete={(application) => setAppToDelete(application)}
          />
        </div>
      </div>

      {productDialog && (
        <ProductForm open product={productDialog.product} onClose={() => setProductDialog(null)} />
      )}
      {appDialog && (
        <ApplicationForm
          open
          application={appDialog.application}
          products={productList}
          defaultProductId={selectedId}
          onClose={() => setAppDialog(null)}
          onSaved={() => {
            setAppDialog(null);
            setNotice(true);
          }}
        />
      )}
      <ConfirmDelete
        open={productToDelete !== null}
        title={`Eliminare il prodotto ${productToDelete?.name ?? ""}?`}
        description="Il prodotto verrà eliminato dal catalogo."
        pending={deleteProduct.isPending}
        error={deleteError}
        onConfirm={confirmDeleteProduct}
        onCancel={closeDelete}
      />
      <ConfirmDelete
        open={appToDelete !== null}
        title={`Eliminare l'applicazione ${appToDelete?.name ?? ""}?`}
        description="Verranno eliminati anche lo storico dei deploy e lo stato attuale"
        pending={deleteApplication.isPending}
        error={deleteError}
        onConfirm={confirmDeleteApplication}
        onCancel={closeDelete}
      />
    </TooltipProvider>
  );
}

export default function CatalogPage() {
  return (
    <RouteGuard action="manage:status_page">
      <CatalogView />
    </RouteGuard>
  );
}
