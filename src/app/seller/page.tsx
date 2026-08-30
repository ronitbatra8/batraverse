"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Package,
  ShoppingBag,
  TrendingUp,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Store,
  User,
  Mail,
  BarChart3,
  Phone,
  CreditCard,
  Crown,
  ArrowUpRight,
  ArrowLeft,
  ImageIcon,
  Palette,
  Save,
  X,
  Upload,
  ShoppingCart,
  ClipboardList,
  Megaphone,
  Heart,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { apiFetch, apiUpload, API_URL } from "@/lib/api";
import { cn, formatPrice } from "@/lib/utils";
import SiteLayout from "@/components/layout/SiteLayout";
import ConfirmModal from "@/components/ConfirmModal";

type Tab = "overview" | "products" | "orders" | "requests" | "profile" | "addproduct" | "analytics" | "adrequests";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  confirmed: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  packed: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  out_for_delivery: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  delivered: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cancelled: "text-red-400 bg-red-500/10 border-red-500/20",
};

interface SellerProfile {
  name: string;
  email: string;
  phone: string;
  shopName: string;
  shopDescription: string;
  cardNumber: string;
  cardLevel: string;
}

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  topProducts: { name: string; brand: string; reviewCount: number; price: number }[];
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  source: string;
  price: number;
  originalPrice: number;
  description: string;
  images: string[];
  inStock: boolean;
  badge: string;
  rating: number;
  reviewCount: number;
  specifications: { key: string; value: string }[];
  keyFeatures: string[];
  colorOptions: { name: string; hex: string; colors: string[]; images: string[]; specifications: { key: string; value: string }[]; keyFeatures: string[]; price?: number; originalPrice?: number }[];
  sizeOptions: Record<string, { name: string; price?: number; originalPrice?: number }[]>;
}

interface OrderItem {
  name: string;
  brand: string;
  price: number;
  quantity: number;
  image: string;
  color?: string;
  size?: string;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  shippingName: string;
  shippingCity: string;
  items: OrderItem[];
  user: { name: string; email: string };
}

interface ProductForm {
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  source: string;
  price: number;
  originalPrice: number;
  description: string;
  images: string[];
  inStock: boolean;
  badge: string;
  specifications: { key: string; value: string }[];
  keyFeatures: string[];
  colorOptions: { name: string; hex: string; colors: string[]; images: string[]; specifications: { key: string; value: string }[]; keyFeatures: string[]; price?: number; originalPrice?: number }[];
  sizeOptions: Record<string, { name: string; price?: number; originalPrice?: number }[]>;
}

interface DbCategory {
  id: string;
  name: string;
  slug: string;
  source: string;
  subcategories: { id: string; name: string; slug: string }[];
}

interface CategoryRequest {
  id: string;
  type: string;
  source: string;
  categoryName: string;
  subCategoryName: string | null;
  reason: string | null;
  status: string;
  createdAt: string;
}

const EMPTY_PRODUCT: ProductForm = {
  name: "",
  brand: "",
  category: "",
  subCategory: "",
  source: "store",
  price: 0,
  originalPrice: 0,
  description: "",
  images: [],
  inStock: true,
  badge: "",
  specifications: [],
  keyFeatures: [],
  colorOptions: [],
  sizeOptions: {},
};

function parseImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getImageUrl(src: string) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return API_URL.replace("/api", "") + src;
}

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "products", label: "Products", icon: Package },
  { key: "addproduct", label: "Add Product", icon: Plus },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "requests", label: "Category Requests", icon: ClipboardList },
  { key: "adrequests", label: "Ad Requests", icon: Megaphone },
  { key: "profile", label: "Profile", icon: Store },
];

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [profileSaving, setProfileSaving] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopDesc, setShopDesc] = useState("");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [productSaving, setProductSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingStock, setTogglingStock] = useState<string | null>(null);

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [catRequests, setCatRequests] = useState<CategoryRequest[]>([]);
  const [catReqType, setCatReqType] = useState<"new_category" | "new_subcategory">("new_category");
  const [catReqSource, setCatReqSource] = useState("store");
  const [catReqCategory, setCatReqCategory] = useState("");
  const [catReqSub, setCatReqSub] = useState("");
  const [catReqReason, setCatReqReason] = useState("");
  const [catReqSaving, setCatReqSaving] = useState(false);

  interface AdRequest {
    id: string;
    sellerId: string;
    sellerName: string;
    img: string;
    tagline: string;
    line: string;
    href: string;
    page: string;
    duration: number;
    status: string;
    note: string;
    createdAt: string;
  }

  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [adReqForm, setAdReqForm] = useState({ img: "", tagline: "", line: "", href: "/store", page: "home", duration: 7 });
  const [adReqSaving, setAdReqSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "SELLER") {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, pr, o, cats, cr, adr] = await Promise.all([
        apiFetch("/seller/profile"),
        apiFetch("/seller/stats"),
        apiFetch("/seller/products"),
        apiFetch("/seller/orders"),
        apiFetch("/categories"),
        apiFetch("/seller/category-requests"),
        apiFetch("/seller/ad-requests"),
      ]);
      setProfile(p);
      setStats(s);
      setProducts(
        (Array.isArray(pr) ? pr : []).map((item: Product & { images: unknown; specifications?: unknown; keyFeatures?: unknown; colorOptions?: unknown; sizeOptions?: unknown }) => ({
          ...item,
          images: parseImages(item.images),
          specifications: parseJsonArray(item.specifications) as Product["specifications"],
          keyFeatures: parseJsonArray(item.keyFeatures) as Product["keyFeatures"],
          colorOptions: Array.isArray(item.colorOptions) ? (item.colorOptions as Product["colorOptions"]).map((c) => ({
            ...c,
            images: parseImages(c.images),
            colors: parseImages(c.colors),
            specifications: Array.isArray(c.specifications) ? c.specifications : [],
            keyFeatures: Array.isArray(c.keyFeatures) ? c.keyFeatures : [],
          })) : [],
          sizeOptions: (item.sizeOptions && typeof item.sizeOptions === "object" && !Array.isArray(item.sizeOptions)) ? item.sizeOptions as Product["sizeOptions"] : {},
        }))
      );
      setOrders(Array.isArray(o) ? o : []);
      setDbCategories(Array.isArray(cats?.store) && Array.isArray(cats?.mart) ? [...cats.store, ...cats.mart, ...(Array.isArray(cats?.mediverse) ? cats.mediverse : [])] : []);
      setCatRequests(Array.isArray(cr) ? cr : []);
      setAdRequests(Array.isArray(adr) ? adr : []);
      setShopName(p.shopName || "");
      setShopDesc(p.shopDescription || "");
    } catch {
      toast("Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    if (user && user.role === "SELLER") fetchDashboard();
  }, [user, fetchDashboard]);

  async function handleProfileSave() {
    setProfileSaving(true);
    try {
      await apiFetch("/seller/profile", {
        method: "PUT",
        body: JSON.stringify({ shopName, shopDescription: shopDesc }),
      });
      setProfile((p) => (p ? { ...p, shopName, shopDescription: shopDesc } : p));
      toast("Profile updated", "success");
    } catch {
      toast("Failed to update profile", "error");
    } finally {
      setProfileSaving(false);
    }
  }

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm({ ...EMPTY_PRODUCT });
    setTab("addproduct");
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      brand: p.brand,
      category: p.category,
      subCategory: p.subCategory || "",
      source: p.source || "store",
      price: p.price,
      originalPrice: p.originalPrice,
      description: p.description,
      images: p.images || [],
      inStock: p.inStock,
      badge: p.badge || "",
      specifications: Array.isArray(p.specifications) ? p.specifications : [],
      keyFeatures: Array.isArray(p.keyFeatures) ? p.keyFeatures : [],
      colorOptions: Array.isArray(p.colorOptions) ? p.colorOptions.map((c) => ({
        name: c.name || "",
        hex: c.hex || "#000000",
        colors: Array.isArray(c.colors) ? c.colors : [],
        images: Array.isArray(c.images) ? c.images : [],
        specifications: Array.isArray(c.specifications) ? c.specifications : [],
        keyFeatures: Array.isArray(c.keyFeatures) ? c.keyFeatures : [],
        price: c.price,
        originalPrice: c.originalPrice,
      })) : [],
      sizeOptions: p.sizeOptions && typeof p.sizeOptions === "object" && !Array.isArray(p.sizeOptions) ? p.sizeOptions as Record<string, { name: string; price?: number; originalPrice?: number }[]> : {},
    });
    setTab("addproduct");
  }

  async function handleProductSave() {
    const hasColors = productForm.colorOptions.length > 0;
    if (!productForm.name.trim()) {
      toast("Product name is required", "error");
      return;
    }
    if (!hasColors && productForm.price <= 0) {
      toast("Price is required", "error");
      return;
    }
    if (!productForm.source) {
      toast("Please choose Store or Mart", "error");
      return;
    }
    setProductSaving(true);
    try {
      const payload = {
        ...productForm,
        images: productForm.images,
      };
      if (editingProduct) {
        await apiFetch(`/seller/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast("Product updated", "success");
      } else {
        await apiFetch("/seller/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Product added", "success");
      }
      setTab("products");
      fetchDashboard();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save product";
      toast(msg, "error");
    } finally {
      setProductSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/seller/products/${deleteTarget.id}`, { method: "DELETE" });
      toast("Product deleted", "success");
      setDeleteTarget(null);
      fetchDashboard();
    } catch {
      toast("Failed to delete product", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleStock(id: string) {
    setTogglingStock(id);
    try {
      const res = await apiFetch(`/seller/products/${id}/stock`, { method: "PUT" });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, inStock: res.inStock } : p)));
      toast(`Product ${res.inStock ? "back in stock" : "marked out of stock"}`, "success");
    } catch {
      toast("Failed to toggle stock", "error");
    } finally {
      setTogglingStock(null);
    }
  }

  if (authLoading || loading) {
    return (
      <SiteLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      </SiteLayout>
    );
  }

  if (!user || user.role !== "SELLER") return null;

  return (
    <SiteLayout>
      <div className="min-h-screen bg-dark-950">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs text-gold-400 uppercase tracking-[0.2em] font-semibold mb-1">Seller Dashboard</p>
              <h1 className="text-2xl font-bold text-white">{profile?.shopName || "My Shop"}</h1>
            </div>
            <div className="flex items-center gap-2 text-dark-400 text-sm">
              <Store size={16} className="text-gold-400" />
              <span>{profile?.name}</span>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-dark-900/60 border border-dark-800/50 rounded-2xl mb-6 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                  tab === t.key
                    ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                    : "text-dark-400 hover:text-dark-200 border border-transparent"
                )}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewTab stats={stats} orders={orders} onTab={setTab} />}
          {tab === "analytics" && <AnalyticsTab stats={stats} orders={orders} products={products} />}
          {tab === "products" && (
            <ProductsTab
              products={products}
              togglingStock={togglingStock}
              onAdd={openAddProduct}
              onEdit={openEditProduct}
              onDelete={setDeleteTarget}
              onToggleStock={handleToggleStock}
            />
          )}
          {tab === "addproduct" && (
            <AddProductTab
              editing={!!editingProduct}
              form={productForm}
              onChange={setProductForm}
              saving={productSaving}
              onSave={handleProductSave}
              onBack={() => { setTab("products"); setEditingProduct(null); setProductForm({ ...EMPTY_PRODUCT }); }}
              dbCategories={dbCategories}
            />
          )}
          {tab === "orders" && <OrdersTab orders={orders} expandedOrder={expandedOrder} onToggle={setExpandedOrder} />}
          {tab === "requests" && (
            <CategoryRequestsTab
              requests={catRequests}
              dbCategories={dbCategories}
              catReqType={catReqType}
              setCatReqType={setCatReqType}
              catReqSource={catReqSource}
              setCatReqSource={setCatReqSource}
              catReqCategory={catReqCategory}
              setCatReqCategory={setCatReqCategory}
              catReqSub={catReqSub}
              setCatReqSub={setCatReqSub}
              catReqReason={catReqReason}
              setCatReqReason={setCatReqReason}
              saving={catReqSaving}
              onSubmit={async () => {
                if (!catReqCategory.trim()) { toast("Category name is required", "error"); return; }
                setCatReqSaving(true);
                try {
                  await apiFetch("/seller/category-requests", {
                    method: "POST",
                    body: JSON.stringify({
                      type: catReqType,
                      source: catReqSource,
                      categoryName: catReqCategory,
                      subCategoryName: catReqType === "new_subcategory" ? catReqSub : undefined,
                      reason: catReqReason,
                    }),
                  });
                  toast("Request submitted", "success");
                  setCatReqCategory("");
                  setCatReqSub("");
                  setCatReqReason("");
                  fetchDashboard();
                } catch {
                  toast("Failed to submit request", "error");
                } finally {
                  setCatReqSaving(false);
                }
              }}
            />
          )}
          {tab === "profile" && (
            <ProfileTab
              profile={profile}
              shopName={shopName}
              shopDesc={shopDesc}
              saving={profileSaving}
              onShopName={setShopName}
              onShopDesc={setShopDesc}
              onSave={handleProfileSave}
            />
          )}
          {tab === "adrequests" && (
            <AdRequestsTab
              requests={adRequests}
              form={adReqForm}
              onChange={setAdReqForm}
              saving={adReqSaving}
              onSubmit={async () => {
                if (!adReqForm.img || !adReqForm.tagline || !adReqForm.line) { toast("Image, tagline, and description are required", "error"); return; }
                setAdReqSaving(true);
                try {
                  await apiFetch("/seller/ad-requests", { method: "POST", body: JSON.stringify(adReqForm) });
                  toast("Ad request submitted", "success");
                  setAdReqForm({ img: "", tagline: "", line: "", href: "/store", page: "home", duration: 7 });
                  fetchDashboard();
                } catch { toast("Failed to submit request", "error"); } finally { setAdReqSaving(false); }
              }}
              onDelete={async (id: string) => {
                try { await apiFetch(`/seller/ad-requests/${id}`, { method: "DELETE" }); fetchDashboard(); } catch { toast("Failed to delete", "error"); }
              }}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeleteTarget(null)}
      />
    </SiteLayout>
  );
}

function OverviewTab({ stats, orders, onTab }: { stats: Stats | null; orders: Order[]; onTab: (t: Tab) => void }) {
  if (!stats) return null;
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: stats.totalProducts, icon: Package, color: "text-sky-400", bg: "from-sky-500/20 to-sky-500/10", border: "border-sky-500/30" },
          { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "text-violet-400", bg: "from-violet-500/20 to-violet-500/10", border: "border-violet-500/30" },
          { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: TrendingUp, color: "text-gold-400", bg: "from-gold-500/20 to-gold-500/10", border: "border-gold-500/30" },
          { label: "Pending Orders", value: stats.pendingOrders, icon: Clock, color: "text-amber-400", bg: "from-amber-500/20 to-amber-500/10", border: "border-amber-500/30" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5`}>
            <s.icon size={20} className={s.color} />
            <p className="text-2xl font-display font-bold text-white mt-3">{s.value}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-dark-900/60 border border-l-4 border-l-sky-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50 flex items-center justify-between">
            <h3 className="text-sm font-display font-bold text-white">Recent Orders</h3>
            <button onClick={() => onTab("orders")} className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors">
              View All <ArrowUpRight size={12} />
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={32} className="text-dark-700 mx-auto mb-3" />
              <p className="text-dark-500 text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-800/30">
              {recentOrders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => {
                    onTab("orders");
                    setTimeout(() => {
                      const el = document.getElementById(`order-${o.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 100);
                  }}
                  className="px-6 py-3 flex items-center justify-between hover:bg-dark-800/20 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-dark-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-gold-400 transition-colors">{o.shippingName}</p>
                      <p className="text-xs text-dark-500">#{o.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-medium text-white">{formatPrice(o.totalAmount)}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border", STATUS_COLORS[o.status] || "")}>
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50">
            <h3 className="text-sm font-display font-bold text-white">Top Products</h3>
          </div>
          {stats.topProducts.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp size={32} className="text-dark-700 mx-auto mb-3" />
              <p className="text-dark-500 text-sm">No product data yet</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-800/30">
              {stats.topProducts.slice(0, 5).map((p, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-gold-400">{i + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-xs text-dark-500">{p.brand}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-medium text-white">{formatPrice(p.price)}</p>
                    <p className="text-xs text-dark-500">{p.reviewCount} reviews</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsTab({
  products,
  togglingStock,
  onAdd,
  onEdit,
  onDelete,
  onToggleStock,
}: {
  products: Product[];
  togglingStock: string | null;
  onAdd: () => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onToggleStock: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Products ({products.length})</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-dark-950 rounded-xl text-sm font-semibold transition-all"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <Package className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm mb-4">No products yet</p>
          <button onClick={onAdd} className="text-sm text-gold-400 hover:text-gold-300 font-medium">
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const cardImage = (p.images && p.images.length > 0 && p.images[0]) || (p.colorOptions && p.colorOptions.length > 0 && p.colorOptions[0].images && p.colorOptions[0].images.length > 0 && p.colorOptions[0].images[0]) || "";
            let cardPrice = p.price;
            let cardOriginalPrice = p.originalPrice || 0;
            if (cardPrice <= 0 && p.sizeOptions && typeof p.sizeOptions === "object") {
              const firstColorName = p.colorOptions && p.colorOptions.length > 0 ? p.colorOptions[0].name : "";
              const firstSizes = p.sizeOptions[firstColorName] || Object.values(p.sizeOptions)[0] || [];
              const withPrice = firstSizes.find((s) => s.price != null && s.price > 0);
              if (withPrice && withPrice.price != null) {
                cardPrice = withPrice.price;
                if (withPrice.originalPrice != null && withPrice.originalPrice > cardPrice) {
                  cardOriginalPrice = withPrice.originalPrice;
                }
              }
            }
            return (
            <div key={p.id} className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden group">
              <div className="aspect-[4/3] bg-dark-800 relative overflow-hidden">
                {cardImage ? (
                  <img src={getImageUrl(cardImage)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={32} className="text-dark-600" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  {p.badge && (
                    <span className="px-2 py-0.5 bg-gold-500/90 text-dark-950 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border", p.inStock ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30")}>
                    {p.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border", p.source === "mart" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-sky-500/15 text-sky-400 border-sky-500/30")}>
                    {p.source === "mart" ? "Mart" : "Store"}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider">{p.brand}{p.category ? ` / ${p.category}` : ""}{p.subCategory ? ` / ${p.subCategory}` : ""}</p>
                  <h3 className="text-sm font-semibold text-white mt-0.5 truncate">{p.name}</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white">{formatPrice(cardPrice)}</span>
                  {cardOriginalPrice && cardOriginalPrice > cardPrice && (
                    <span className="text-sm text-dark-500 line-through">{formatPrice(cardOriginalPrice)}</span>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-dark-400 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onEdit(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/60 border border-dark-700/50 rounded-lg text-xs text-dark-300 hover:text-white hover:border-gold-500/30 transition-all"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => onToggleStock(p.id)}
                    disabled={togglingStock === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/60 border border-dark-700/50 rounded-lg text-xs text-dark-300 hover:text-white hover:border-gold-500/30 transition-all disabled:opacity-50"
                  >
                    {togglingStock === p.id ? <Loader2 size={12} className="animate-spin" /> : p.inStock ? <EyeOff size={12} /> : <Eye size={12} />}
                    {p.inStock ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/60 border border-dark-700/50 rounded-lg text-xs text-dark-300 hover:text-red-400 hover:border-red-500/30 transition-all ml-auto"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrdersTab({
  orders,
  expandedOrder,
  onToggle,
}: {
  orders: Order[];
  expandedOrder: string | null;
  onToggle: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState("all");
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const filtered = filter === "all" ? sorted : sorted.filter((o) => o.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-white">Orders ({orders.length})</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-dark-800/60 border border-dark-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer"
        >
          <option value="all">All Status</option>
          {["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div
                key={order.id}
                id={`order-${order.id}`}
                className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => onToggle(isExpanded ? null : order.id)}
                  className="w-full px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-dark-800/20 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-white font-mono text-sm font-medium">#{order.id.slice(0, 8)}</span>
                      <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit capitalize border", STATUS_COLORS[order.status] || "")}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                      <span className="text-dark-300 text-sm">{order.shippingName || "Unknown"}</span>
                      <span className="text-dark-500 text-sm hidden sm:block">�</span>
                      <span className="text-dark-500 text-sm hidden sm:block">{order.shippingCity || "N/A"}</span>
                      <span className="text-dark-500 text-sm hidden sm:block">�</span>
                      <span className="text-dark-500 text-sm hidden sm:block">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm text-dark-400">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}</p>
                    <p className="text-white font-semibold">{formatPrice(order.totalAmount)}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-dark-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-dark-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 space-y-4 border-t border-dark-800/30 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-dark-800/30 rounded-xl p-4 space-y-2">
                        <h4 className="text-xs text-dark-500 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <User size={12} /> Customer
                        </h4>
                        <p className="text-white text-sm font-medium">{order.shippingName}</p>
                        <p className="text-dark-400 text-xs">{order.user?.email || "N/A"}</p>
                      </div>
                      <div className="bg-dark-800/30 rounded-xl p-4 space-y-2">
                        <h4 className="text-xs text-dark-500 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <CreditCard size={12} /> Order Info
                        </h4>
                        <p className="text-white text-sm font-medium">{formatPrice(order.totalAmount)}</p>
                        <p className="text-dark-400 text-xs">{order.shippingCity}</p>
                      </div>
                    </div>

                    <div className="bg-gold-500/5 border border-gold-500/10 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs text-gold-400 uppercase tracking-wider font-semibold">Items in this order</h4>
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-dark-900/30">
                          {item.image && (
                            <img src={getImageUrl(item.image)} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{item.name}</p>
                            <p className="text-dark-500 text-xs">
                              Qty: {item.quantity}
                              {item.color ? ` � ${item.color}` : ""}
                              {item.size ? ` � ${item.size}` : ""}
                            </p>
                          </div>
                          <span className="text-white text-sm font-medium">{formatPrice(item.price * (item.quantity || 1))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileTab({
  profile,
  shopName,
  shopDesc,
  saving,
  onShopName,
  onShopDesc,
  onSave,
}: {
  profile: SellerProfile | null;
  shopName: string;
  shopDesc: string;
  saving: boolean;
  onShopName: (v: string) => void;
  onShopDesc: (v: string) => void;
  onSave: () => void;
}) {
  if (!profile) return null;
  const changed = shopName !== (profile.shopName || "") || shopDesc !== (profile.shopDescription || "");

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-bold text-white">Shop Profile</h2>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Shop Name</label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => onShopName(e.target.value)}
            className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors"
            placeholder="Enter your shop name"
          />
        </div>
        <div>
          <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Shop Description</label>
          <textarea
            value={shopDesc}
            onChange={(e) => onShopDesc(e.target.value)}
            rows={4}
            className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors resize-none"
            placeholder="Describe your shop..."
          />
        </div>
        <button
          onClick={onSave}
          disabled={saving || !changed}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:hover:bg-gold-500 text-dark-950 rounded-xl text-sm font-semibold transition-all"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-display font-bold text-white">Account Details</h3>
        {[
          { label: "Name", value: profile.name, icon: User },
          { label: "Email", value: profile.email, icon: Mail },
          { label: "Phone", value: profile.phone, icon: Phone },
          { label: "Card Number", value: profile.cardNumber || "N/A", icon: CreditCard },
          { label: "Card Level", value: profile.cardLevel || "N/A", icon: Crown },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-dark-800/60 border border-dark-700/50 flex items-center justify-center shrink-0">
              <f.icon size={14} className="text-dark-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-dark-500 uppercase tracking-wider">{f.label}</p>
              <p className="text-sm text-white truncate">{f.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddProductTab({
  editing,
  form,
  onChange,
  saving,
  onSave,
  onBack,
  dbCategories,
}: {
  editing: boolean;
  form: ProductForm;
  onChange: (f: ProductForm) => void;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  dbCategories: DbCategory[];
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorUrlRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [colorUploading, setColorUploading] = useState<number | null>(null);

  const categories = dbCategories.filter((c) => c.source === form.source);
  const selectedCat = categories.find((c) => c.slug === form.category);
  const subcategories = selectedCat?.subcategories || [];

  function handleSourceChange(source: string) {
    onChange({ ...form, source, category: "", subCategory: "" });
  }

  const [urlInput, setUrlInput] = useState("");

  function handleAddUrl() {
    const url = urlInput.trim();
    if (!url) return;
    onChange({ ...form, images: [...form.images, url] });
    setUrlInput("");
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const file of Array.from(files)) {
        fd.append("images", file);
      }
      const result = await apiUpload("/seller/upload", fd);
      onChange({ ...form, images: [...form.images, ...result.urls] });
      toast(`${files.length} image${files.length > 1 ? "s" : ""} uploaded`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast(msg, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }

  function removeImage(index: number) {
    const updated = form.images.filter((_, i) => i !== index);
    onChange({ ...form, images: updated });
  }

  const hasColors = form.colorOptions.length > 0;
  const hasSizes = Object.values(form.sizeOptions).some((arr) => arr && arr.length > 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-xs sm:text-sm">
          <ArrowLeft size={14} />
          Back to Products
        </button>
        <div className="h-4 w-px bg-dark-700/50 hidden sm:block" />
        <h2 className="text-base sm:text-lg font-semibold text-white">{editing ? "Edit Product" : "Add New Product"}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column � main info (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div>
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Product Name</label>
              <input type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })}
                className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 sm:px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                placeholder="Enter product name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Sell On</label>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                  <button type="button" onClick={() => handleSourceChange("store")}
                    className={cn("flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl border text-[11px] font-medium transition-all",
                      form.source === "store" ? "bg-sky-500/10 border-sky-500/40 text-sky-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400 hover:text-dark-200")}>
                    <Store size={16} /> Store
                  </button>
                  <button type="button" onClick={() => handleSourceChange("mart")}
                    className={cn("flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl border text-[11px] font-medium transition-all",
                      form.source === "mart" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400 hover:text-dark-200")}>
                    <ShoppingCart size={16} /> Mart
                  </button>
                  <button type="button" onClick={() => handleSourceChange("mediverse")}
                    className={cn("flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl border text-[11px] font-medium transition-all",
                      form.source === "mediverse" ? "bg-violet-500/10 border-violet-500/40 text-violet-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400 hover:text-dark-200")}>
                    <Heart size={16} /> Mediverse
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Brand</label>
                <input type="text" value={form.brand} onChange={(e) => onChange({ ...form, brand: e.target.value })}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                  placeholder="Brand name" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Category</label>
                <select value={form.category} onChange={(e) => onChange({ ...form, category: e.target.value, subCategory: "" })}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer">
                  <option value="">Select category</option>
                  {categories.map((c) => (<option key={c.id} value={c.slug}>{c.name}</option>))}
                </select>
              </div>
              {form.category && subcategories.length > 0 && (
                <div>
                  <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Subcategory</label>
                  <select value={form.subCategory} onChange={(e) => onChange({ ...form, subCategory: e.target.value })}
                    className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer">
                    <option value="">None</option>
                    {subcategories.map((s) => (<option key={s.id} value={s.slug}>{s.name}</option>))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} rows={3}
                className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 resize-none"
                placeholder="Product description..." />
            </div>
          </div>

          {/* Product Images */}
          <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6">
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-3 block">Product Images</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                className={cn("border-2 border-dashed rounded-xl p-4 sm:p-5 text-center transition-all cursor-pointer",
                  dragOver ? "border-gold-500/50 bg-gold-500/5" : "border-dark-700/50 bg-dark-800/30 hover:border-dark-600")}
                onClick={() => fileInputRef.current?.click()}>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={20} className="text-gold-400 animate-spin" />
                    <p className="text-xs text-dark-400">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload size={20} className="text-dark-500" />
                    <p className="text-xs text-dark-300 font-medium">Upload from device</p>
                    <p className="text-[10px] text-dark-500">Drag & drop or click</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
                  className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                  placeholder="Paste image URL..." />
                <button type="button" onClick={handleAddUrl} disabled={!urlInput.trim()}
                  className="px-3 py-2 bg-dark-800/60 border border-dark-700/50 rounded-xl text-xs text-dark-300 hover:text-white hover:border-gold-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Add URL
                </button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)} />
            {form.images.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {form.images.map((url, i) => (
                  <div key={i} className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-dark-700/50 bg-dark-800 group/img">
                    <img src={getImageUrl(url)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Color Variants */}
          {form.source === "store" && (
            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Color Variants</label>
                <button type="button" onClick={() => onChange({ ...form, colorOptions: [...form.colorOptions, { name: "", hex: "#000000", colors: [], images: [], specifications: [], keyFeatures: [] }] })}
                  className="px-3 py-2 bg-gold-500 text-dark-950 rounded-xl text-xs font-semibold hover:bg-gold-400 transition-all flex items-center gap-1.5">
                  <Plus size={14} /> Add Color
                </button>
              </div>
              {form.colorOptions.length === 0 && <p className="text-sm text-dark-500 italic">No color variants yet. Add colors for multi-variant products.</p>}

              <div className="space-y-5">
                {form.colorOptions.map((color, i) => {
                  const colorName = color.name || `Color ${i + 1}`;
                  const colorSizes = form.sizeOptions[colorName] || [];
                  const hasColorSizes = colorSizes.length > 0;
                  const isMultiple = form.colorOptions.length > 1;

                  return (
                    <div key={i} className={`rounded-2xl border border-dark-700/50 bg-dark-800/30 p-4 sm:p-5 space-y-3 sm:space-y-4 ${isMultiple && i > 0 ? "border-t-2 border-t-dark-600/30" : ""}`}>

                      <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative shrink-0">
                          <input type="color" value={color.hex}
                            onChange={(e) => { const u = [...form.colorOptions]; u[i] = { ...u[i], hex: e.target.value }; onChange({ ...form, colorOptions: u }); }}
                            className="w-12 h-12 rounded-xl border border-dark-700/50 bg-transparent cursor-pointer" />
                          {(color.colors?.length || 0) > 1 && (() => {
                            const cols = color.colors || [];
                            const cnt = cols.length;
                            let bg = "";
                            if (cnt === 2) bg = `linear-gradient(135deg, ${cols[0]} 50%, ${cols[1]} 50%)`;
                            else if (cnt === 3) bg = `conic-gradient(from 60deg, ${cols[0]} 0deg 120deg, ${cols[1]} 120deg 240deg, ${cols[2]} 240deg 360deg)`;
                            else bg = `conic-gradient(from 30deg, ${cols.map((h, j) => `${h} ${(j * 360) / cnt}deg ${((j + 1) * 360) / cnt}deg`).join(", ")})`;
                            return (
                              <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
                                <div className="w-full h-full rounded-xl" style={{ background: bg }} />
                              </div>
                            );
                          })()}
                        </div>
                        <input type="text" value={color.name}
                          onChange={(e) => { const u = [...form.colorOptions]; const oldName = u[i].name; u[i] = { ...u[i], name: e.target.value }; const so = { ...form.sizeOptions }; if (oldName && so[oldName]) { so[e.target.value] = so[oldName]; delete so[oldName]; } onChange({ ...form, colorOptions: u, sizeOptions: so }); }}
                          className="flex-1 min-w-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                          placeholder="Color name (e.g. Midnight Black)" />
                        <button type="button" onClick={() => { const deletedName = form.colorOptions[i]?.name; const so = { ...form.sizeOptions }; if (deletedName && so[deletedName]) delete so[deletedName]; onChange({ ...form, colorOptions: form.colorOptions.filter((_, j) => j !== i), sizeOptions: so }); }}
                          className="px-3 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                          <Trash2 size={14} />
                        </button>
                        <button type="button"
                          onClick={() => { const u = [...form.colorOptions]; const current = u[i].colors && u[i].colors.length > 0 ? u[i].colors : [u[i].hex]; u[i] = { ...u[i], colors: [...current, "#808080"] }; onChange({ ...form, colorOptions: u }); }}
                          className="px-3 py-3 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-xl hover:text-white hover:border-gold-500/30 transition-all shrink-0">
                          <Palette size={14} />
                        </button>
                      </div>

                      {(color.colors?.length || 0) > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-dark-500">Palette:</span>
                          {(color.colors || []).map((hex, ci) => (
                            <div key={ci} className="relative group/swatch">
                              <input type="color" value={hex}
                                onChange={(e) => { const u = [...form.colorOptions]; const cols = [...(u[i].colors || [])]; cols[ci] = e.target.value; u[i] = { ...u[i], colors: cols }; onChange({ ...form, colorOptions: u }); }}
                                className="w-8 h-8 rounded-lg border border-dark-700/50 bg-transparent cursor-pointer" />
                              <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], colors: (u[i].colors || []).filter((_, j) => j !== ci) }; onChange({ ...form, colorOptions: u }); }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity">
                                <X size={8} className="text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-2 block">Images</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-2">
                            <input type="file" accept="image/*" multiple className="hidden" id={`color-img-${i}`}
                              onChange={async (e) => {
                                if (!e.target.files?.length) return;
                                setColorUploading(i);
                                const fd = new FormData();
                                for (const f of Array.from(e.target.files)) fd.append("images", f);
                                try {
                                  const result = await apiUpload("/seller/upload", fd);
                                  const u = [...form.colorOptions];
                                  u[i] = { ...u[i], images: [...(u[i].images || []), ...result.urls] };
                                  onChange({ ...form, colorOptions: u });
                                  toast(`${e.target.files.length} image${e.target.files.length > 1 ? "s" : ""} uploaded`, "success");
                                } catch (err: unknown) {
                                  const msg = err instanceof Error ? err.message : "Upload failed";
                                  toast(msg, "error");
                                } finally {
                                  setColorUploading(null);
                                  e.target.value = "";
                                }
                              }} />
                            <label htmlFor={`color-img-${i}`}
                              className="border-2 border-dashed border-dark-700/50 bg-dark-800/30 hover:border-dark-600 rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all">
                              <div className="flex flex-col items-center gap-1.5">
                                {colorUploading === i ? (
                                  <Loader2 size={20} className="text-gold-400 animate-spin" />
                                ) : (
                                  <Upload size={20} className="text-dark-500" />
                                )}
                                <p className="text-xs text-dark-300 font-medium">{colorUploading === i ? "Uploading..." : "Upload images"}</p>
                                <p className="text-[10px] text-dark-500">Click to browse</p>
                              </div>
                            </label>
                          </div>
                          <div className="flex flex-col gap-2">
                            <input type="text"
                              ref={(el) => { colorUrlRefs.current[i] = el; }}
                              className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                              placeholder="Paste image URL..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val) {
                                    const u = [...form.colorOptions];
                                    u[i] = { ...u[i], images: [...(u[i].images || []), val] };
                                    onChange({ ...form, colorOptions: u });
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }} />
                            <button type="button"
                              onClick={() => {
                                const input = colorUrlRefs.current[i];
                                if (!input) return;
                                const val = input.value.trim();
                                if (val) {
                                  const u = [...form.colorOptions];
                                  u[i] = { ...u[i], images: [...(u[i].images || []), val] };
                                  onChange({ ...form, colorOptions: u });
                                  input.value = "";
                                }
                              }}
                              className="px-3 py-2 bg-dark-800/60 border border-dark-700/50 rounded-xl text-xs text-dark-300 hover:text-white hover:border-gold-500/30 transition-all">
                              Add URL
                            </button>
                          </div>
                        </div>
                        {(color.images || []).length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {(color.images || []).map((img, ii) => (
                                <div key={ii} className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-dark-700/50 bg-dark-800 group/ci">
                                <img src={img.startsWith("http") ? img : `${API_URL.replace("/api", "")}${img}`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                <button onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], images: (u[i].images || []).filter((_, j) => j !== ii) }; onChange({ ...form, colorOptions: u }); }}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover/ci:opacity-100 transition-opacity flex items-center justify-center">
                                  <X size={14} className="text-white" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {!hasColorSizes && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Price (₹)</label>
                            <input type="number" value={color.price || ""}
                              onChange={(e) => { const u = [...form.colorOptions]; u[i] = { ...u[i], price: e.target.value ? Number(e.target.value) : undefined }; onChange({ ...form, colorOptions: u }); }}
                              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                              placeholder="Selling price" min="0" />
                          </div>
                          <div>
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Original Price (₹)</label>
                            <input type="number" value={color.originalPrice || ""}
                              onChange={(e) => { const u = [...form.colorOptions]; u[i] = { ...u[i], originalPrice: e.target.value ? Number(e.target.value) : undefined }; onChange({ ...form, colorOptions: u }); }}
                              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                              placeholder="M.R.P" min="0" />
                          </div>
                        </div>
                      )}

                      {form.source === "store" && (() => {
                        const SIZE_PRESETS: Record<string, string[]> = {
                          fashion: ["XS", "S", "M", "L", "XL", "XXL"],
                          footwear: ["6", "7", "8", "9", "10", "11", "12"],
                          accessories: ["Free Size"],
                          watches: ["Small", "Medium", "Large"],
                        };
                        const presets = SIZE_PRESETS[form.category] || [];
                        const existingNames = colorSizes.map((s) => s.name);

                        return (
                          <div>
                            {presets.length > 0 && (
                              <div className="mb-3">
                                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-2 block">Quick Add Sizes</label>
                                <div className="flex flex-wrap gap-2">
                                  {presets.map((ps) => {
                                    const exists = existingNames.includes(ps);
                                    return (
                                      <button key={ps} type="button" disabled={exists}
                                        onClick={() => { if (!exists) onChange({ ...form, sizeOptions: { ...form.sizeOptions, [colorName]: [...(form.sizeOptions[colorName] || []), { name: ps }] } }); }}
                                        className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${exists ? "bg-dark-800/40 text-dark-600 cursor-not-allowed" : "bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500/20"}`}>
                                        {exists ? `${ps} ✓` : ps}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {colorSizes.length > 0 && (
                              <div className="space-y-2 mb-3">
                                <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold block">Added Sizes</label>
                                {colorSizes.map((sz, si) => (
                                  <div key={si} className="flex flex-wrap gap-2">
                                    <span className="text-sm text-white font-medium bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 min-w-[60px] text-center shrink-0">{sz.name}</span>
                                    <input type="number" value={sz.price ?? ""}
                                      onChange={(e) => { const updated = { ...form.sizeOptions }; const sizes = [...(updated[colorName] || [])]; sizes[si] = { ...sizes[si], price: e.target.value ? Number(e.target.value) : undefined }; updated[colorName] = sizes; onChange({ ...form, sizeOptions: updated }); }}
                                      className="w-full sm:flex-1 sm:min-w-[80px] bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                      placeholder="Price ₹" min={0} />
                                    <input type="number" value={sz.originalPrice ?? ""}
                                      onChange={(e) => { const updated = { ...form.sizeOptions }; const sizes = [...(updated[colorName] || [])]; sizes[si] = { ...sizes[si], originalPrice: e.target.value ? Number(e.target.value) : undefined }; updated[colorName] = sizes; onChange({ ...form, sizeOptions: updated }); }}
                                      className="w-full sm:flex-1 sm:min-w-[80px] bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                      placeholder="M.R.P ₹" min={0} />
                                    <button type="button" onClick={() => { const updated = { ...form.sizeOptions }; updated[colorName] = (updated[colorName] || []).filter((_, j) => j !== si); onChange({ ...form, sizeOptions: updated }); }}
                                      className="px-3 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input type="text" id={`size-input-${i}`}
                                className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Custom size name..."
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val && !existingNames.includes(val)) { onChange({ ...form, sizeOptions: { ...form.sizeOptions, [colorName]: [...(form.sizeOptions[colorName] || []), { name: val }] } }); (e.target as HTMLInputElement).value = ""; } } }} />
                              <button type="button"
                                onClick={() => { const input = document.getElementById(`size-input-${i}`) as HTMLInputElement; if (!input) return; const val = input.value.trim(); if (val && !existingNames.includes(val)) { onChange({ ...form, sizeOptions: { ...form.sizeOptions, [colorName]: [...(form.sizeOptions[colorName] || []), { name: val }] } }); input.value = ""; } }}
                                className="px-4 py-3 bg-gold-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-all shrink-0 flex items-center gap-1.5">
                                <Plus size={14} /> Add
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Color specs & features */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Specifications</label>
                            <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], specifications: [...(u[i].specifications || []), { key: "", value: "" }] }; onChange({ ...form, colorOptions: u }); }}
                              className="px-3 py-2 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-xl text-xs font-semibold hover:text-white hover:border-gold-500/30 transition-all flex items-center gap-1.5">
                              <Plus size={14} /> Add
                            </button>
                          </div>
                          {(color.specifications || []).map((spec, si) => (
                            <div key={si} className="flex gap-2 items-center mb-2">
                              <input type="text" value={spec.key}
                                onChange={(e) => { const u = [...form.colorOptions]; const specs = [...(u[i].specifications || [])]; specs[si] = { ...specs[si], key: e.target.value }; u[i] = { ...u[i], specifications: specs }; onChange({ ...form, colorOptions: u }); }}
                                className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Specification name" />
                              <input type="text" value={spec.value}
                                onChange={(e) => { const u = [...form.colorOptions]; const specs = [...(u[i].specifications || [])]; specs[si] = { ...specs[si], value: e.target.value }; u[i] = { ...u[i], specifications: specs }; onChange({ ...form, colorOptions: u }); }}
                                className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Value" />
                              <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], specifications: (u[i].specifications || []).filter((_, j) => j !== si) }; onChange({ ...form, colorOptions: u }); }}
                                className="px-2.5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Key Features</label>
                            <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], keyFeatures: [...(u[i].keyFeatures || []), ""] }; onChange({ ...form, colorOptions: u }); }}
                              className="px-3 py-2 bg-dark-800/60 border border-dark-700/50 text-dark-300 rounded-xl text-xs font-semibold hover:text-white hover:border-gold-500/30 transition-all flex items-center gap-1.5">
                              <Plus size={14} /> Add
                            </button>
                          </div>
                          {(color.keyFeatures || []).map((feat, fi) => (
                            <div key={fi} className="flex gap-2 items-center mb-2">
                              <span className="text-dark-500 text-sm w-5 text-center shrink-0">{fi + 1}</span>
                              <input type="text" value={feat}
                                onChange={(e) => { const u = [...form.colorOptions]; const feats = [...(u[i].keyFeatures || [])]; feats[fi] = e.target.value; u[i] = { ...u[i], keyFeatures: feats }; onChange({ ...form, colorOptions: u }); }}
                                className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Feature" />
                              <button type="button" onClick={() => { const u = [...form.colorOptions]; u[i] = { ...u[i], keyFeatures: (u[i].keyFeatures || []).filter((_, j) => j !== fi) }; onChange({ ...form, colorOptions: u }); }}
                                className="px-2.5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all shrink-0">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Specifications & Features */}
          {form.source === "store" && !hasColors && (
            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Specifications</label>
                    <button type="button" onClick={() => onChange({ ...form, specifications: [...form.specifications, { key: "", value: "" }] })}
                      className="text-[10px] text-gold-400 hover:text-gold-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Plus size={10} /> Add
                    </button>
                  </div>
                  {form.specifications.length === 0 && <p className="text-[11px] text-dark-600 italic">No specifications</p>}
                  {form.specifications.map((spec, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input type="text" value={spec.key} onChange={(e) => { const u = [...form.specifications]; u[i] = { ...u[i], key: e.target.value }; onChange({ ...form, specifications: u }); }}
                        className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Key" />
                      <input type="text" value={spec.value} onChange={(e) => { const u = [...form.specifications]; u[i] = { ...u[i], value: e.target.value }; onChange({ ...form, specifications: u }); }}
                        className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Value" />
                      <button type="button" onClick={() => onChange({ ...form, specifications: form.specifications.filter((_, j) => j !== i) })} className="text-dark-500 hover:text-red-400 px-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold">Key Features</label>
                    <button type="button" onClick={() => onChange({ ...form, keyFeatures: [...form.keyFeatures, ""] })}
                      className="text-[10px] text-gold-400 hover:text-gold-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Plus size={10} /> Add
                    </button>
                  </div>
                  {form.keyFeatures.length === 0 && <p className="text-[11px] text-dark-600 italic">No features</p>}
                  {form.keyFeatures.map((feat, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <span className="text-dark-500 text-xs mt-1.5">{i + 1}.</span>
                      <input type="text" value={feat} onChange={(e) => { const u = [...form.keyFeatures]; u[i] = e.target.value; onChange({ ...form, keyFeatures: u }); }}
                        className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Feature" />
                      <button type="button" onClick={() => onChange({ ...form, keyFeatures: form.keyFeatures.filter((_, j) => j !== i) })} className="text-dark-500 hover:text-red-400 px-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column � sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Price */}
          {!hasSizes && (
            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6 space-y-4">
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold block">Price</label>
              <div>
                <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1 block">Selling Price (?)</label>
                <input type="number" value={form.price || ""} onChange={(e) => onChange({ ...form, price: Number(e.target.value) })}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                  placeholder="0" min="0" />
              </div>
              <div>
                <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1 block">M.R.P (?)</label>
                <input type="number" value={form.originalPrice || ""} onChange={(e) => onChange({ ...form, originalPrice: Number(e.target.value) })}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                  placeholder="0" min="0" />
              </div>
              {hasColors && <p className="text-[9px] text-dark-600 italic">Fallback when a color has no price set</p>}
            </div>
          )}

          {/* Badge + Stock */}
          <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4 sm:p-6 space-y-4">
            <div>
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Badge</label>
              <input type="text" value={form.badge} onChange={(e) => onChange({ ...form, badge: e.target.value })}
                className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                placeholder="e.g. New, Sale" />
            </div>
            <div>
              <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Stock Status</label>
              <button type="button" onClick={() => onChange({ ...form, inStock: !form.inStock })}
                className={cn("w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                  form.inStock ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400")}>
                {form.inStock ? <Eye size={14} /> : <EyeOff size={14} />}
                {form.inStock ? "In Stock" : "Out of Stock"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-xl text-sm font-medium transition-all">
          Cancel
        </button>
        <button onClick={onSave}
          disabled={saving || !form.name.trim() || (!hasColors && form.price <= 0) || !form.source || uploading}
          className="px-8 py-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-dark-950 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : editing ? "Update Product" : "Add Product"}
        </button>
      </div>
    </div>
  );
}

function AdRequestsTab({ requests, form, onChange, saving, onSubmit, onDelete }: {
  requests: { id: string; sellerName: string; img: string; tagline: string; line: string; href: string; page: string; duration: number; status: string; note: string; createdAt: string }[];
  form: { img: string; tagline: string; line: string; href: string; page: string; duration: number };
  onChange: (f: typeof form) => void;
  saving: boolean;
  onSubmit: () => void;
  onDelete: (id: string) => void;
}) {
  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-dark-900/60 border border-dark-700/50 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-500/40 transition-colors";
  const STATUS_BADGES: Record<string, string> = {
    pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    rejected: "text-red-400 bg-red-500/10 border-red-500/20",
  };
  return (
    <div className="space-y-6">
      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-serif text-white mb-4">Submit Ad Request</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1.5">Image URL</label>
            <input type="text" value={form.img} onChange={(e) => onChange({ ...form, img: e.target.value })} placeholder="https://..." className={inputCls} />
            {form.img && <div className="mt-2 w-full h-32 rounded-xl overflow-hidden bg-dark-800/60 border border-dark-700/30"><img src={form.img} alt="" className="w-full h-full object-cover" /></div>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-dark-400 mb-1.5">Tagline</label><input type="text" value={form.tagline} onChange={(e) => onChange({ ...form, tagline: e.target.value })} placeholder="The Fall Edit" className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-dark-400 mb-1.5">Link URL</label><input type="text" value={form.href} onChange={(e) => onChange({ ...form, href: e.target.value })} placeholder="/store" className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-medium text-dark-400 mb-1.5">Description</label><textarea value={form.line} onChange={(e) => onChange({ ...form, line: e.target.value })} placeholder="Where light meets fabric..." rows={2} className={inputCls + " resize-none"} /></div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end">
            <div className="w-full sm:w-36"><label className="block text-xs font-medium text-dark-400 mb-1.5">Page</label>
              <select value={form.page} onChange={(e) => onChange({ ...form, page: e.target.value })} className={inputCls}>
                <option value="home">Home</option><option value="store">Store</option><option value="mart">Mart</option><option value="mediverse">Mediverse</option>
              </select>
            </div>
            <div className="w-full sm:w-28"><label className="block text-xs font-medium text-dark-400 mb-1.5">Duration (sec)</label>
              <input type="number" min={1} max={30} value={form.duration} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 1 && v <= 30) onChange({ ...form, duration: v }); else if (e.target.value === "") onChange({ ...form, duration: 1 }); }} className={inputCls} />
            </div>
            <button onClick={onSubmit} disabled={saving || !form.img || !form.tagline || !form.line} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
      {requests.length > 0 && (
        <div>
          <h3 className="text-lg font-serif text-white mb-3">Your Requests</h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-4 flex flex-col sm:flex-row items-stretch gap-4">
                <div className="w-full sm:w-32 h-32 sm:h-20 rounded-xl overflow-hidden bg-dark-800/60 shrink-0 border border-dark-700/30">
                  <img src={r.img} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">{r.tagline}</h4>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGES[r.status] || "text-dark-500 bg-dark-800/60 border-dark-700/50"}`}>{r.status}</span>
                    <span className="text-[10px] text-dark-500">{r.page}</span>
                    <span className="text-[10px] text-dark-500">{r.duration}s</span>
                  </div>
                  <p className="text-xs text-dark-400 mt-1 truncate">{r.line}</p>
                  {r.status === "rejected" && r.note && <p className="text-xs text-red-400 mt-1">Reason: {r.note}</p>}
                </div>
                <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                  {r.status === "pending" && <button onClick={() => onDelete(r.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryRequestsTab({
  requests,
  dbCategories,
  catReqType,
  setCatReqType,
  catReqSource,
  setCatReqSource,
  catReqCategory,
  setCatReqCategory,
  catReqSub,
  setCatReqSub,
  catReqReason,
  setCatReqReason,
  saving,
  onSubmit,
}: {
  requests: CategoryRequest[];
  dbCategories: DbCategory[];
  catReqType: string;
  setCatReqType: (v: "new_category" | "new_subcategory") => void;
  catReqSource: string;
  setCatReqSource: (v: string) => void;
  catReqCategory: string;
  setCatReqCategory: (v: string) => void;
  catReqSub: string;
  setCatReqSub: (v: string) => void;
  catReqReason: string;
  setCatReqReason: (v: string) => void;
  saving: boolean;
  onSubmit: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const matchingCat = dbCategories.find((c) => c.slug === catReqCategory && c.source === catReqSource);

  const STATUS_STYLES: Record<string, string> = {
    pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    denied: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Category Requests</h2>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-display font-bold text-white">Request New Category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCatReqType("new_category")}
                className={cn("px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                  catReqType === "new_category" ? "bg-gold-500/10 border-gold-500/40 text-gold-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                New Category
              </button>
              <button type="button" onClick={() => setCatReqType("new_subcategory")}
                className={cn("px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                  catReqType === "new_subcategory" ? "bg-gold-500/10 border-gold-500/40 text-gold-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                New Subcategory
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Source</label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setCatReqSource("store")}
                className={cn("px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                  catReqSource === "store" ? "bg-sky-500/10 border-sky-500/40 text-sky-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                Store
              </button>
              <button type="button" onClick={() => setCatReqSource("mart")}
                className={cn("px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                  catReqSource === "mart" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                Mart
              </button>
              <button type="button" onClick={() => setCatReqSource("mediverse")}
                className={cn("px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                  catReqSource === "mediverse" ? "bg-violet-500/10 border-violet-500/40 text-violet-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                Mediverse
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">
            {catReqType === "new_category" ? "Category Name" : "Parent Category"}
          </label>
          {catReqType === "new_category" ? (
            <input value={catReqCategory} onChange={(e) => setCatReqCategory(e.target.value)}
              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
              placeholder="e.g. Organic, Stationery..." />
          ) : (
            <select value={catReqCategory} onChange={(e) => { setCatReqCategory(e.target.value); setCatReqSub(""); }}
              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500/50 appearance-none cursor-pointer">
              <option value="">Select existing category</option>
              {dbCategories.filter((c) => c.source === catReqSource).map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {catReqType === "new_subcategory" && (
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Subcategory Name</label>
            <input value={catReqSub} onChange={(e) => setCatReqSub(e.target.value)}
              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
              placeholder="e.g. Organic Milk, Almond Butter..." />
          </div>
        )}

        {catReqType === "new_subcategory" && matchingCat && (
          <div className="bg-dark-800/30 rounded-xl p-3">
            <p className="text-xs text-dark-500 mb-1">Existing subcategories in {matchingCat.name}:</p>
            <div className="flex flex-wrap gap-1.5">
              {matchingCat.subcategories.map((s) => (
                <span key={s.id} className="px-2 py-0.5 bg-dark-800/60 border border-dark-700/50 rounded-full text-[10px] text-dark-400">{s.name}</span>
              ))}
              {matchingCat.subcategories.length === 0 && <span className="text-xs text-dark-600">None yet</span>}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Reason (optional)</label>
          <textarea value={catReqReason} onChange={(e) => setCatReqReason(e.target.value)} rows={2}
            className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 resize-none"
            placeholder="Why do you need this category?" />
        </div>

        <button onClick={onSubmit} disabled={saving || !catReqCategory.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-dark-950 rounded-xl text-sm font-semibold transition-all">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
          {saving ? "Submitting..." : "Submit Request"}
        </button>
      </div>

      <div className="flex gap-2">
        {["pending", "approved", "denied", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              filter === f ? "bg-gold-500/10 text-gold-400 border-gold-500/20" : "text-dark-400 border-dark-700/50 hover:text-dark-200")}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <ClipboardList className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No {filter === "all" ? "" : filter} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border", STATUS_STYLES[req.status] || "")}>{req.status}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">{req.type === "new_category" ? "New Category" : "New Subcategory"}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-dark-800 text-dark-300 border border-dark-700">{req.source}</span>
              </div>
              <p className="text-white text-sm font-medium">
                {req.categoryName}
                {req.subCategoryName && <span className="text-dark-400"> / {req.subCategoryName}</span>}
              </p>
              {req.reason && <p className="text-dark-500 text-xs mt-1">Reason: {req.reason}</p>}
              <p className="text-dark-600 text-[10px] mt-2">{new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ stats, orders, products }: { stats: Stats | null; orders: Order[]; products: Product[] }) {
  if (!stats) return null;

  const ordersByStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const monthlyRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce<Record<string, number>>((acc, o) => {
      const month = new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      acc[month] = (acc[month] || 0) + o.totalAmount;
      return acc;
    }, {});

  const avgOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

  const categoryData = products.reduce<Record<string, number>>((acc, p) => {
    const cat = p.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const inStockPct = products.length > 0 ? Math.round((products.filter((p) => p.inStock).length / products.length) * 100) : 0;
  const outOfStockPct = 100 - inStockPct;

  const months = Object.keys(monthlyRevenue).slice(-6);
  const maxRevenue = Math.max(...months.map((m) => monthlyRevenue[m] || 0), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg Order Value", value: formatPrice(avgOrderValue), bg: "from-sky-500/20 to-sky-500/10", border: "border-sky-500/30" },
          { label: "Total Revenue", value: formatPrice(stats.totalRevenue), bg: "from-gold-500/20 to-gold-500/10", border: "border-gold-500/30" },
          { label: "Completion Rate", value: `${stats.totalOrders > 0 ? Math.round(((stats.totalOrders - stats.pendingOrders) / stats.totalOrders) * 100) : 0}%`, bg: "from-emerald-500/20 to-emerald-500/10", border: "border-emerald-500/30" },
          { label: "Stock Health", value: `${inStockPct}%`, bg: "from-violet-500/20 to-violet-500/10", border: "border-violet-500/30" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5`}>
            <p className="text-2xl font-display font-bold text-white mt-1">{s.value}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl p-6">
          <h3 className="text-sm font-display font-bold text-white mb-4">Revenue by Month</h3>
          {months.length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-8">No revenue data</p>
          ) : (
            <div className="space-y-3">
              {months.map((month) => {
                const val = monthlyRevenue[month] || 0;
                const pct = (val / maxRevenue) * 100;
                return (
                  <div key={month} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-dark-400">{month}</span>
                      <span className="text-white font-medium">{formatPrice(val)}</span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-sky-400/50 border-dark-800/50 rounded-2xl p-6">
          <h3 className="text-sm font-display font-bold text-white mb-4">Orders by Status</h3>
          {Object.keys(ordersByStatus).length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-8">No order data</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(ordersByStatus).sort(([, a], [, b]) => b - a).map(([status, count]) => {
                const pct = orders.length > 0 ? (count / orders.length) * 100 : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-dark-400 capitalize">{status.replace(/_/g, " ")}</span>
                      <span className="text-white font-medium">{count} orders</span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-violet-400/50 border-dark-800/50 rounded-2xl p-6">
          <h3 className="text-sm font-display font-bold text-white mb-4">Top Categories</h3>
          {topCategories.length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-8">No category data</p>
          ) : (
            <div className="space-y-2">
              {topCategories.map(([cat, count], i) => (
                <div key={cat} className="flex items-center justify-between py-2 border-b border-dark-800/30 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-violet-400">{i + 1}</span>
                    </div>
                    <span className="text-sm text-white capitalize">{cat}</span>
                  </div>
                  <span className="text-xs text-dark-400">{count} products</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-dark-900/60 border border-l-4 border-l-emerald-400/50 border-dark-800/50 rounded-2xl p-6">
          <h3 className="text-sm font-display font-bold text-white mb-4">Stock Overview</h3>
          <div className="flex items-center gap-6 justify-center py-6">
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgb(52, 211, 153)" strokeWidth="3" strokeDasharray={`${inStockPct}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{inStockPct}%</span>
                </div>
              </div>
              <p className="text-xs text-emerald-400 mt-2">In Stock ({products.filter((p) => p.inStock).length})</p>
            </div>
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgb(248, 113, 113)" strokeWidth="3" strokeDasharray={`${outOfStockPct}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{outOfStockPct}%</span>
                </div>
              </div>
              <p className="text-xs text-red-400 mt-2">Out of Stock ({products.filter((p) => !p.inStock).length})</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
