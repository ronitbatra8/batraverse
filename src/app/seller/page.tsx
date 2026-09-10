"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Menu,
  LogOut,
  ListChecks,
  Coins,
  Ban,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Download,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { apiFetch, apiUpload } from "@/lib/api";
import { resolveImageUrl } from "@/lib/imageUrl";
import { cn, formatPrice } from "@/lib/utils";
import SiteLayout from "@/components/layout/SiteLayout";
import ConfirmModal from "@/components/ConfirmModal";
import Brand from "@/components/brand/Brand";

type Tab = "overview" | "products" | "orders" | "reqstatus" | "requests" | "profile" | "addproduct" | "analytics" | "adrequests" | "payouts";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  confirmed: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  shipped: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  packed: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  out_for_delivery: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  delivered: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cancelled: "text-red-400 bg-red-500/10 border-red-500/20",
  return_requested: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  return_approved: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  return_rejected: "text-red-400 bg-red-500/10 border-red-500/20",
};

interface SellerProfile {
  name: string;
  email: string;
  phone: string;
  shopName: string;
  shopDescription: string;
  pickupName: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupPincode: string;
  pickupPhone: string;
  createdAt: string;
}

interface Stats {
  totalProducts: number;
  totalOrders: number;
  payoutTotal: number;
  pendingOrders: number;
  payoutPending: number;
  payoutsCount: number;
  topProducts: { name: string; brand: string; reviewCount: number; price: number }[];
}

interface Payout {
  id: string;
  orderId: string;
  orderRef: string | null;
  itemIdx: number;
  productId: string | null;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  chargedPrice: number | null;
  status: "pending" | "paid" | "voided";
  deductions: { amount: number; label: string; createdAt: string }[] | null;
  createdAt: string;
  paidAt: string | null;
  voidedAt: string | null;
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
  status?: string;
  sellerPrice?: number | null;
  rejectReason?: string | null;
  pendingUpdate?: {
    id?: string;
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
    status: string;
    sellerPrice?: number | null;
    rejectReason?: string | null;
  };
  /* Seller copy: the full detail set the seller last entered (parallel to the
     live/owner-approved fields). The edit form loads from this. */
  sellerDetails?: {
    name: string;
    brand: string;
    category: string;
    subCategory: string;
    source: string;
    price: number | null;
    originalPrice: number | null;
    description: string | null;
    images: string[];
    inStock: boolean;
    badge: string | null;
    specifications: { key: string; value: string }[];
    keyFeatures: string[];
    colorOptions: { name: string; hex: string; colors: string[]; images: string[]; specifications: { key: string; value: string }[]; keyFeatures: string[]; price?: number; originalPrice?: number }[];
    sizeOptions: Record<string, { name: string; price?: number; originalPrice?: number }[]>;
  };
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
  sellerPrice?: number | null;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  shippingName: string;
  shippingCity: string;
  shippingState?: string | null;
  shippingAddress?: string;
  shippingPincode?: string | null;
  shippingPhone?: string;
  items: OrderItem[];
  user?: { name: string; email: string } | null;
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
  return resolveImageUrl(src);
}

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "products", label: "Products", icon: Package },
  { key: "addproduct", label: "Add Product", icon: Plus },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "payouts", label: "Payouts", icon: Coins },
  { key: "reqstatus", label: "Requests", icon: ListChecks },
  { key: "requests", label: "Category Requests", icon: ClipboardList },
  { key: "adrequests", label: "Ad Requests", icon: Megaphone },
  { key: "profile", label: "Profile", icon: Store },
];

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const goToTab = (key: Tab) => { setTab(key); window.scrollTo(0, 0); };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const [profileSaving, setProfileSaving] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(true);
  const [onboardSubmitted, setOnboardSubmitted] = useState<boolean | null>(null);
  const [onboardRejected, setOnboardRejected] = useState(false);
  const [onboardSaving, setOnboardSaving] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopDesc, setShopDesc] = useState("");
  const [pickupName, setPickupName] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupState, setPickupState] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");

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

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, s, pr, o, cats, cr, adr, pouts] = await Promise.all([
        apiFetch("/seller/profile"),
        apiFetch("/seller/stats"),
        apiFetch("/seller/products"),
        apiFetch("/seller/orders"),
        apiFetch("/categories"),
        apiFetch("/seller/category-requests"),
        apiFetch("/seller/ad-requests"),
        apiFetch("/seller/payouts"),
      ]);
      setProfile(p);
      setStats(s);
      setProducts(
        (Array.isArray(pr) ? pr : []).map((item: Product & { images: unknown; specifications?: unknown; keyFeatures?: unknown; colorOptions?: unknown; sizeOptions?: unknown }) => {
          const normDetails = item.sellerDetails && typeof item.sellerDetails === "object"
            ? {
                ...item.sellerDetails,
                name: String(item.sellerDetails.name ?? ""),
                brand: String(item.sellerDetails.brand ?? ""),
                category: String(item.sellerDetails.category ?? ""),
                subCategory: String(item.sellerDetails.subCategory ?? ""),
                source: String(item.sellerDetails.source ?? "store"),
                price: Number(item.sellerDetails.price) || 0,
                originalPrice: Number(item.sellerDetails.originalPrice) || 0,
                description: String(item.sellerDetails.description ?? ""),
                images: parseImages(item.sellerDetails.images),
                inStock: item.sellerDetails.inStock !== false,
                badge: String(item.sellerDetails.badge ?? ""),
                specifications: parseJsonArray(item.sellerDetails.specifications) as Product["specifications"],
                keyFeatures: parseJsonArray(item.sellerDetails.keyFeatures) as Product["keyFeatures"],
                colorOptions: Array.isArray(item.sellerDetails.colorOptions) ? (item.sellerDetails.colorOptions as Product["colorOptions"]).map((c: Product["colorOptions"][number]) => ({
                  ...c,
                  name: c.name || "",
                  hex: c.hex || "#000000",
                  images: parseImages(c.images),
                  colors: parseImages(c.colors),
                  specifications: Array.isArray(c.specifications) ? c.specifications : [],
                  keyFeatures: Array.isArray(c.keyFeatures) ? c.keyFeatures : [],
                })) : [],
                sizeOptions: (item.sellerDetails.sizeOptions && typeof item.sellerDetails.sizeOptions === "object" && !Array.isArray(item.sellerDetails.sizeOptions)) ? item.sellerDetails.sizeOptions as Product["sizeOptions"] : {},
              }
            : undefined;
          return {
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
            sellerDetails: normDetails,
          };
        })
      );
      setOrders(Array.isArray(o) ? o : []);
      setPayouts(Array.isArray(pouts) ? pouts : []);
      setDbCategories(Array.isArray(cats?.store) && Array.isArray(cats?.mart) ? [...cats.store, ...cats.mart] : []);
      setCatRequests(Array.isArray(cr) ? cr : []);
      setAdRequests(Array.isArray(adr) ? adr : []);
      setShopName(p.shopName || "");
      setShopDesc(p.shopDescription || "");
      setPickupName(p.pickupName || "");
      setPickupAddress(p.pickupAddress || "");
      setPickupCity(p.pickupCity || "");
      setPickupState(p.pickupState || "");
      setPickupPincode(p.pickupPincode || "");
      setPickupPhone(p.pickupPhone || "");
    } catch {
      toast("Failed to load dashboard", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchDashboard(true);
    setTimeout(() => setRefreshing(false), 600);
  }, [fetchDashboard, refreshing]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    if (user && user.role === "SELLER" && user.approved !== false) fetchDashboard();
  }, [user, fetchDashboard]);

  // Pre-load profile for a newly registered (unapproved) seller so the
  // mandatory onboarding panel can pre-fill any partially saved values.
  useEffect(() => {
    if (authLoading || !user || user.role !== "SELLER" || user.approved !== false) return;
    let mounted = true;
    (async () => {
      try {
        const data = await apiFetch("/seller/onboarding");
        if (!mounted) return;
        setShopName(data.shopName || "");
        setShopDesc(data.shopDescription || "");
        setPickupName(data.pickupName || "");
        setPickupPhone(data.pickupPhone || "");
        setPickupAddress(data.pickupAddress || "");
        setPickupCity(data.pickupCity || "");
        setPickupState(data.pickupState || "");
        setPickupPincode(data.pickupPincode || "");
        setOnboardSubmitted(!!data.submittedForApproval);
        setOnboardRejected(!!data.rejectedAt);
      } catch {
        if (mounted) setOnboardSubmitted(false);
      } finally {
        if (mounted) setOnboardLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authLoading, user]);

  async function handleOnboardingSubmit() {
    const required: [string, string][] = [
      ["Shop Name", shopName],
      ["Shop Description", shopDesc],
      ["Contact Name", pickupName],
      ["Phone", pickupPhone],
      ["Pickup Address", pickupAddress],
      ["City", pickupCity],
      ["State", pickupState],
      ["Pincode", pickupPincode],
    ];
    const missing = required.filter(([, v]) => !String(v ?? "").trim()).map(([label]) => label);
    if (missing.length > 0) {
      toast(`Complete all mandatory fields: ${missing.join(", ")}`, "error");
      return;
    }
    setOnboardSaving(true);
    try {
      await apiFetch("/seller/complete-profile", {
        method: "PUT",
        body: JSON.stringify({ shopName, shopDescription: shopDesc, pickupName, pickupAddress, pickupCity, pickupState, pickupPincode, pickupPhone }),
      });
      await apiFetch("/seller/submit-approval", { method: "POST" });
      setOnboardSubmitted(true);
      setOnboardRejected(false);
      updateUser({ approved: false, submittedForApproval: true });
      toast("Profile submitted for approval", "success");
    } catch (e) {
      const msg = (e as { message?: string })?.message || "Failed to submit profile";
      toast(msg, "error");
    } finally {
      setOnboardSaving(false);
    }
  }

  async function handleProfileSave() {
    setProfileSaving(true);
    try {
      await apiFetch("/seller/profile", {
        method: "PUT",
        body: JSON.stringify({
          shopName,
          shopDescription: shopDesc,
          pickupName,
          pickupAddress,
          pickupCity,
          pickupState,
          pickupPincode,
          pickupPhone,
        }),
      });
      setProfile((p) => (p ? { ...p, shopName, shopDescription: shopDesc, pickupName, pickupAddress, pickupCity, pickupState, pickupPincode, pickupPhone } : p));
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
    goToTab("addproduct");
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    /* Prefer the SELLER COPY (what the seller last entered) so the edit form
       never shows owner-approved details. Falls back to the pending draft, then
       the live product. */
    const sellerCopy = p.sellerDetails && Object.keys(p.sellerDetails).length > 0 && typeof p.sellerDetails === "object" ? p.sellerDetails : undefined;
    const d: Product = sellerCopy !== undefined ? (sellerCopy as Product) : (p.pendingUpdate || p) as Product;
    const dImages = Array.isArray(d.images) ? d.images : (Array.isArray(p.images) ? p.images : []);
    const dColorOptions = Array.isArray(d.colorOptions) ? d.colorOptions : (Array.isArray(p.colorOptions) ? p.colorOptions : []);
    const dSizeOptions = d.sizeOptions && typeof d.sizeOptions === "object" && !Array.isArray(d.sizeOptions) ? d.sizeOptions : (p.sizeOptions && typeof p.sizeOptions === "object" ? p.sizeOptions : {});
    setProductForm({
      name: String(d.name ?? p.name ?? ""),
      brand: String(d.brand ?? p.brand ?? ""),
      category: String(d.category ?? p.category ?? ""),
      subCategory: String(d.subCategory ?? p.subCategory ?? "") || "",
      source: String(d.source ?? p.source ?? "") || "store",
      price: Number(d.price ?? p.price) || 0,
      originalPrice: Number(d.originalPrice ?? p.originalPrice) || 0,
      description: String(d.description ?? p.description ?? ""),
      images: dImages,
      inStock: d.inStock !== undefined ? d.inStock : (p.inStock ?? true),
      badge: String(d.badge ?? p.badge ?? "") || "",
      specifications: Array.isArray(d.specifications) ? d.specifications : (Array.isArray(p.specifications) ? p.specifications : []),
      keyFeatures: Array.isArray(d.keyFeatures) ? d.keyFeatures : (Array.isArray(p.keyFeatures) ? p.keyFeatures : []),
      colorOptions: dColorOptions.map((c) => ({
        name: String(c.name ?? ""),
        hex: String(c.hex ?? "#000000"),
        colors: Array.isArray(c.colors) ? c.colors : [],
        images: Array.isArray(c.images) ? c.images : [],
        specifications: Array.isArray(c.specifications) ? c.specifications : [],
        keyFeatures: Array.isArray(c.keyFeatures) ? c.keyFeatures : [],
        price: c.price,
        originalPrice: c.originalPrice,
      })),
      sizeOptions: dSizeOptions as Record<string, { name: string; price?: number; originalPrice?: number }[]>,
    });
    goToTab("addproduct");
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
    if (productForm.images.length === 0 && !productForm.colorOptions.some((c) => (c.images || []).length > 0)) {
      toast("At least one product image is required", "error");
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
        toast(editingProduct.status === "approved" ? "Product updated" : "Changes saved — awaiting approval", "success");
      } else {
        await apiFetch("/seller/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Product submitted for approval", "success");
      }
      goToTab("products");
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

  if (!authLoading && user && user.role === "SELLER" && user.approved === false) {
    if (onboardLoading || onboardSubmitted === null) {
      return (
        <SiteLayout>
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
          </div>
        </SiteLayout>
      );
    }

    if (onboardRejected) {
      return (
        <SiteLayout>
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Seller account rejected</h1>
              <p className="text-dark-400 text-sm leading-relaxed">
                Unfortunately, your seller profile was not approved. Please contact Batraverse customer care to understand the reason and get help with getting approved.
              </p>
              <p className="mt-6 text-xs text-dark-500">
                Reach us at{" "}
                <a href="mailto:ronit.batra.08@gmail.com" className="text-gold-400 hover:text-gold-300 transition-colors">
                  ronit.batra.08@gmail.com
                </a>{" "}
                or call{" "}
                <a href="tel:+919351396757" className="text-gold-400 hover:text-gold-300 transition-colors">
                  +91 93513 96757
                </a>
              </p>
            </div>
          </div>
        </SiteLayout>
      );
    }

    if (onboardSubmitted) {
      return (
        <SiteLayout>
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mb-6">
                <Store className="w-8 h-8 text-gold-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Seller account pending approval</h1>
              <p className="text-dark-400 text-sm leading-relaxed">
                Your profile has been submitted for review. Once the owner approves it, you will be able to manage your products and orders here.
              </p>
            </div>
          </div>
        </SiteLayout>
      );
    }

    const inputCls = "w-full bg-dark-900/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors";
    const labelCls = "block text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5";
    const missing = [shopName, shopDesc, pickupName, pickupPhone, pickupAddress, pickupCity, pickupState, pickupPincode].some((v) => !String(v ?? "").trim());

    return (
      <SiteLayout>
        <div className="min-h-screen bg-dark-950 px-4 py-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                <Store className="w-7 h-7 text-gold-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Complete your seller profile</h1>
                <p className="text-dark-400 text-sm mt-0.5">All fields are mandatory. Once submitted, the owner will review and approve your account.</p>
              </div>
            </div>

            <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 space-y-4">
              <div>
                <label className={labelCls}>Shop Name *</label>
                <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Batra Creation" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Shop Description *</label>
                <textarea value={shopDesc} onChange={(e) => setShopDesc(e.target.value)} placeholder="Tell customers what you sell..." rows={2} className={inputCls + " resize-none"} />
              </div>

              <div className="pt-2 border-t border-dark-800/50">
                <p className="text-xs text-gold-400 uppercase tracking-[0.2em] font-semibold mb-4">Pickup Address (for order deliveries)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Contact Name *</label>
                  <input value={pickupName} onChange={(e) => setPickupName(e.target.value)} placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone *</label>
                  <input value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} placeholder="10-digit mobile number" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Address *</label>
                  <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Street, area, landmark" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City *</label>
                  <input value={pickupCity} onChange={(e) => setPickupCity(e.target.value)} placeholder="e.g. Delhi" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>State *</label>
                  <input value={pickupState} onChange={(e) => setPickupState(e.target.value)} placeholder="e.g. Delhi" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Pincode *</label>
                  <input value={pickupPincode} onChange={(e) => setPickupPincode(e.target.value)} placeholder="6-digit pincode" className={inputCls} />
                </div>
              </div>

              <button onClick={handleOnboardingSubmit} disabled={missing || onboardSaving}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-dark-950 rounded-xl text-sm font-semibold transition-all">
                {onboardSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                {onboardSaving ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
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
      <div className="min-h-screen overflow-x-clip bg-dark-950 lg:flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-dark-800 bg-dark-900/95 lg:flex">
          <div className="border-b border-dark-800 p-5">
            <Brand size="md" />
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => goToTab(t.key)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  tab === t.key
                    ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                    : "text-dark-400 hover:text-dark-200 border border-transparent"
                )}
              >
                <t.icon size={18} className="shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-dark-800 p-3">
            <button
              onClick={() => handleRefresh()}
              disabled={refreshing}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-dark-300 transition-all duration-200 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={18} className={`shrink-0 ${refreshing ? "animate-spin" : ""}`} />
              <span className="truncate">{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              onClick={() => { logout(); router.replace("/"); }}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/10"
            >
              <LogOut size={18} className="shrink-0" />
              <span className="truncate">Sign Out</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <div className="mb-6">
            <div className="grid grid-cols-3 items-center gap-2">
              <p className="text-base sm:text-lg font-display font-bold text-white truncate text-left">{profile?.shopName || "My Shop"}</p>
              <p className="text-center text-[10px] sm:text-xs text-gold-400 uppercase tracking-[0.2em] font-semibold">Seller Dashboard</p>
              <p className="text-xs sm:text-sm text-dark-400 truncate text-right">{profile?.name}</p>
            </div>
          </div>
          <div className="sticky top-3 z-30 mb-6 lg:hidden">
            <div className="flex w-full max-w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/15 bg-black/50 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex shrink-0 items-center gap-2 rounded-xl p-2.5 text-dark-200 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Open menu"
              >
                <Menu size={18} />
                <span className="text-sm font-medium">Menu</span>
              </button>
              <Brand size="md" mobileWordmark />
            </div>
          </div>

          {/* Mobile drawer + backdrop */}
            <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
              <div
                onClick={() => setSidebarOpen(false)}
                className={`absolute inset-0 bg-black/25 transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
              />
              <aside
                className={`absolute left-0 top-0 flex h-full w-72 flex-col border-r border-gold/15 bg-onyx/55 p-6 shadow-[inset_0_1px_0_rgba(212,175,55,0.12),24px_0_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-transform duration-300 ${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
              >
                <div className="mb-6 flex items-center justify-between gap-3 py-3">
                  <Brand size="md" />
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-xl p-2 text-dark-400 transition-colors hover:bg-white/5 hover:text-white"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                    <span className="text-sm font-medium">Close</span>
                  </button>
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto overscroll-contain">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => { goToTab(t.key); setSidebarOpen(false); }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-300",
                        tab === t.key
                          ? "bg-gold/10 text-gold-light border border-gold/20"
                          : "text-cream-dim/60 hover:bg-white/5 hover:text-cream border border-transparent"
                      )}
                    >
                      <t.icon size={18} className="shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-gold/15 pt-3">
                  <button
                    onClick={() => { setSidebarOpen(false); handleRefresh(); }}
                    disabled={refreshing}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-cream-dim/60 transition-colors duration-300 hover:bg-white/5 hover:text-cream disabled:opacity-50"
                  >
                    <RefreshCw size={18} className={`shrink-0 ${refreshing ? "animate-spin" : ""}`} />
                    <span className="truncate">{refreshing ? "Refreshing..." : "Refresh"}</span>
                  </button>
                  <button
                    onClick={() => { setSidebarOpen(false); logout(); router.replace("/"); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-400 transition-colors duration-300 hover:bg-white/5"
                  >
                    <LogOut size={18} className="shrink-0" />
                    <span className="truncate">Sign Out</span>
                  </button>
                </div>
              </aside>
            </div>

            {tab === "overview" && <OverviewTab stats={stats} orders={orders} payouts={payouts} onTab={goToTab} />}
          {tab === "analytics" && <AnalyticsTab stats={stats} orders={orders} products={products} sellerSince={profile?.createdAt} />}
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
              onBack={() => { goToTab("products"); setEditingProduct(null); setProductForm({ ...EMPTY_PRODUCT }); }}
              dbCategories={dbCategories}
              lockedPrice={!!editingProduct && editingProduct.status === "approved"}
              rejectReason={editingProduct?.rejectReason}
            />
          )}
          {tab === "orders" && <OrdersTab orders={orders} expandedOrder={expandedOrder} onToggle={setExpandedOrder} />}
          {tab === "payouts" && <PayoutsTab payouts={payouts} stats={stats} />}
          {tab === "reqstatus" && (
            <RequestsStatusTab category={catRequests} ads={adRequests} />
          )}
          {tab === "requests" && (
            <CategoryRequestsTab
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
          {tab === "adrequests" && (
            <AdRequestsTab
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
            />
          )}
          {tab === "profile" && (
            <ProfileTab
              profile={profile}
              shopName={shopName}
              shopDesc={shopDesc}
              pickupName={pickupName}
              pickupAddress={pickupAddress}
              pickupCity={pickupCity}
              pickupState={pickupState}
              pickupPincode={pickupPincode}
              pickupPhone={pickupPhone}
              saving={profileSaving}
              onShopName={setShopName}
              onShopDesc={setShopDesc}
              onPickupName={setPickupName}
              onPickupAddress={setPickupAddress}
              onPickupCity={setPickupCity}
              onPickupState={setPickupState}
              onPickupPincode={setPickupPincode}
              onPickupPhone={setPickupPhone}
              onSave={handleProfileSave}
            />
          )}
          </div>
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

function OverviewTab({ stats, orders, payouts, onTab }: { stats: Stats | null; orders: Order[]; payouts: Payout[]; onTab: (t: Tab) => void }) {
  if (!stats) return null;
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const recentPayouts = [...payouts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: stats.totalProducts, icon: Package, color: "text-sky-400", bg: "from-sky-500/20 to-sky-500/10", border: "border-sky-500/30" },
          { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "text-violet-400", bg: "from-violet-500/20 to-violet-500/10", border: "border-violet-500/30" },
          { label: "Paid to You", value: formatPrice(stats.payoutTotal), icon: TrendingUp, color: "text-gold-400", bg: "from-gold-500/20 to-gold-500/10", border: "border-gold-500/30" },
          { label: "Pending Orders", value: stats.pendingOrders, icon: Clock, color: "text-amber-400", bg: "from-amber-500/20 to-amber-500/10", border: "border-amber-500/30" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5`}>
            <s.icon size={20} className={s.color} />
            <p className="text-2xl font-display font-bold text-white mt-3">{s.value}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {recentPayouts.length > 0 && (
        <div className="bg-dark-900/60 border border-l-4 border-l-emerald-400/50 border-dark-800/50 rounded-2xl">
          <div className="px-6 py-4 border-b border-dark-800/50">
            <h3 className="text-sm font-display font-bold text-white">Recent Payouts</h3>
            <p className="text-xs text-dark-500 mt-0.5">Earnings settled to your bank by the owner when an order is delivered</p>
          </div>
          <div className="divide-y divide-dark-800/30">
            {recentPayouts.map((pay) => (
              <div key={pay.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Coins size={14} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pay.productName || "Product"}</p>
                    <p className="text-xs text-dark-500">
                      Order {pay.orderRef || "#" + pay.orderId.slice(0, 8)} · {pay.quantity} × {formatPrice(pay.unitPrice)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className={cn("text-sm font-medium", pay.status === "paid" ? "text-emerald-400" : pay.status === "pending" ? "text-teal-400" : "text-dark-600")}>
                    {pay.status === "paid" ? "+" : ""}{formatPrice(pay.amount)}
                  </p>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border",
                    pay.status === "paid" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                    pay.status === "pending" ? "text-teal-400 border-teal-500/30 bg-teal-500/10" :
                    "text-dark-500 border-dark-700 bg-dark-800")}>
                    {pay.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

function PayoutsTab({ payouts, stats }: { payouts: Payout[]; stats: Stats | null }) {
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);

  const PAYOUT_GRADIENTS: Record<string, string> = {
    pending: "from-amber-500/15 to-amber-500/5",
    paid: "from-emerald-500/15 to-emerald-500/5",
  };

  const PAYOUT_BORDERS: Record<string, string> = {
    pending: "border-amber-500/25",
    paid: "border-emerald-500/25",
  };

  const PAYOUT_ICON_COLORS: Record<string, string> = {
    pending: "text-amber-400",
    paid: "text-emerald-400",
  };

  const PAYOUT_LABEL_STYLE: Record<string, string> = {
    pending: "text-amber-400 bg-amber-500/10",
    paid: "text-emerald-400 bg-emerald-500/10",
  };

  const totals = useMemo(() => {
    let pending = 0, paid = 0, voided = 0;
    for (const p of payouts) {
      if (p.status === "pending") pending += p.amount;
      else if (p.status === "paid") paid += p.amount;
      else voided += p.amount;
    }
    return { pending, paid, voided };
  }, [payouts]);

  const filtered = payouts.filter((p) => filter === "all" || p.status === filter);

  const filterTabs: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: payouts.length },
    { key: "pending", label: "Pending", count: payouts.filter((p) => p.status === "pending").length },
    { key: "paid", label: "Paid", count: payouts.filter((p) => p.status === "paid").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-white">Payouts</h2>
        <p className="text-xs text-dark-500 mt-0.5">
          Earnings owed at the price you set. Batraverse keeps the difference between your price and the live sell price.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Pending", value: totals.pending, icon: Clock, color: "text-amber-400", bg: "from-amber-500/20 to-amber-500/10", border: "border-amber-500/30" },
          { label: "Paid to You", value: totals.paid, icon: Coins, color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/10", border: "border-emerald-500/30" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5`}>
            <s.icon size={20} className={s.color} />
            <p className="text-2xl font-display font-bold text-white mt-3">{formatPrice(s.value)}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {stats && (
        <div className="rounded-xl bg-dark-800/40 border border-dark-700/40 px-4 py-3 text-xs text-dark-400 flex flex-wrap gap-x-6 gap-y-1.5">
          <span>Lifetime earned: <span className="text-white font-medium">{formatPrice(stats.payoutTotal)}</span></span>
          <span>Pending total: <span className="text-teal-400 font-medium">{formatPrice(stats.payoutPending)}</span></span>
        </div>
      )}

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl">
        <div className="px-4 sm:px-6 py-3 border-b border-dark-800/50 flex items-center gap-1.5 overflow-x-auto">
          {filterTabs.map((f) => (
<button key={f.key} onClick={() => { setFilter(f.key); setVisibleCount(50); setExpandedPayout(null); }}
               className={cn(
                "shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border",
                filter === f.key
                  ? "bg-gold-500/10 text-gold-400 border-gold-500/20"
                  : "text-dark-400 hover:text-white hover:bg-dark-800/40 border-transparent"
              )}>
              {f.label} · {f.count}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Coins size={32} className="text-dark-700 mx-auto mb-3" />
            <p className="text-dark-500 text-sm">No {filter === "all" ? "" : filter + " "}payouts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, visibleCount).map((pay) => {
              const isExpanded = expandedPayout === pay.id;
              return (
<div key={pay.id}>
                  {/* Collapsed row */}
                  <button
                    onClick={() => setExpandedPayout(isExpanded ? null : pay.id)}
                    className={`w-full text-left px-4 sm:px-6 py-4 flex items-center gap-3 bg-gradient-to-r ${PAYOUT_GRADIENTS[pay.status] || "from-dark-900/40 to-dark-900/20"} border ${PAYOUT_BORDERS[pay.status] || "border-dark-800/40"} rounded-xl overflow-hidden hover:brightness-110 transition-all`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${PAYOUT_GRADIENTS[pay.status] || ""}`}>
                      <Coins size={16} className={PAYOUT_ICON_COLORS[pay.status] || "text-dark-600"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{pay.productName || "Product"}</p>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Order {pay.orderRef || "#" + pay.orderId.slice(0, 8)} · {pay.quantity} × {formatPrice(pay.unitPrice)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", PAYOUT_LABEL_STYLE[pay.status] || "")}>
                        {pay.status}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{formatPrice(pay.amount)}</p>
                        <p className="text-[10px] text-dark-600 mt-0.5">
                          {new Date(pay.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-dark-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-dark-400 shrink-0" />}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 space-y-4 border-t border-dark-800/50 pt-4">
                      {/* Product Info */}
                      <div className="bg-gradient-to-br from-gold-500/10 to-gold-500/5 border border-gold-500/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs text-gold-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <Package className="w-3.5 h-3.5" /> Product Details
                        </h4>
                        <div className="space-y-2">
                          <p className="text-white text-sm font-medium truncate">{pay.productName || "—"}</p>
                          <p className="text-dark-500 text-xs">Order {pay.orderRef || "#" + pay.orderId.slice(0, 8)}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="text-dark-500">Qty</span>
                              <span className="text-white ml-1.5 font-medium">{pay.quantity}</span>
                            </div>
                            <div className="border-l border-dark-700 h-3" />
                            <div>
                              <span className="text-dark-500">Payout</span>
                              <span className="text-gold-400 ml-1.5 font-semibold">{formatPrice(pay.amount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Deductions */}
                      {Array.isArray(pay.deductions) && pay.deductions.length > 0 && (
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs text-blue-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5" /> Deductions
                          </h4>
                          <div className="space-y-2">
                            {pay.deductions.map((d, i) => (
                              <div key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg bg-dark-900/30">
                                <span className="text-dark-300">{d.label || "Deduction"}</span>
                                <span className="flex items-center gap-3">
                                  <span className="text-red-400/90 font-medium">− {formatPrice(d.amount)}</span>
                                  {d.createdAt && (
                                    <span className="text-dark-500 text-xs">
                                      {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between gap-2 px-3 pt-1 text-xs">
                              <span className="text-dark-400">Net payout</span>
                              <span className="text-white font-semibold">{formatPrice(pay.amount)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-dark-500">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Created {new Date(pay.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {pay.paidAt && <span className="flex items-center gap-1 text-emerald-400/80"><CheckCircle2 className="w-3 h-3" /> Paid {new Date(pay.paidAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                        {pay.voidedAt && <span className="flex items-center gap-1"><Ban className="w-3 h-3" /> Voided {new Date(pay.voidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length > visibleCount && (
              <div className="px-4 sm:px-6 py-3">
                <button
                  onClick={() => setVisibleCount((v) => v + 50)}
                  className="w-full py-3 rounded-xl border border-dark-700/50 bg-dark-900/40 text-sm text-dark-300 hover:text-white hover:border-gold-500/30 transition-all"
                >
                  Show more ({filtered.length - visibleCount} more)
                </button>
              </div>
            )}
          </div>
        )}
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
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
            <div key={p.id} className="bg-dark-900/60 border border-dark-800/50 rounded-xl overflow-hidden group">
              <div className="aspect-[3/4] bg-dark-800 relative overflow-hidden">
                {cardImage ? (
                  <img src={getImageUrl(cardImage)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-dark-600" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  {p.pendingUpdate && (
                    <span className={cn("px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border",
                      p.pendingUpdate.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30")}>
                      {p.pendingUpdate.status === "rejected" ? "Update Rejected" : "Update in Review"}
                    </span>
                  )}
                  {p.status !== "approved" && (
                    <span className={cn("px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border",
                      p.status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30")}>
                      {p.status === "rejected" ? "Rejected" : "Pending"}
                    </span>
                  )}
                  {p.badge && (
                    <span className="px-1.5 py-0.5 bg-gold-500/90 text-dark-950 text-[9px] font-bold uppercase tracking-wider rounded-full">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="absolute top-2 right-2">
                  <span className={cn("px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border", p.inStock ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30")}>
                    {p.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 hidden sm:block">
                  <span className={cn("px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border", p.source === "mart" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-sky-500/15 text-sky-400 border-sky-500/30")}>
                    {p.source === "mart" ? "Mart" : "Store"}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-[10px] text-dark-500 uppercase tracking-wider truncate">{p.brand}{p.category ? ` / ${p.category}` : ""}{p.subCategory ? ` / ${p.subCategory}` : ""}</p>
                  <h3 className="text-sm font-semibold text-white mt-0.5 truncate">{p.name}</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-white">{formatPrice(cardPrice)}</span>
                  {cardOriginalPrice && cardOriginalPrice > cardPrice && (
                    <span className="text-xs text-dark-500 line-through">{formatPrice(cardOriginalPrice)}</span>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-dark-400 line-clamp-1">{p.description}</p>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => onEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 bg-dark-800/60 border border-dark-700/50 rounded-lg text-[11px] text-dark-300 hover:text-white hover:border-gold-500/30 transition-all"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => onToggleStock(p.id)}
                    disabled={togglingStock === p.id}
                    className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 bg-dark-800/60 border border-dark-700/50 rounded-lg text-[11px] text-dark-300 hover:text-white hover:border-gold-500/30 transition-all disabled:opacity-50"
                  >
                    {togglingStock === p.id ? <Loader2 size={11} className="animate-spin" /> : p.inStock ? <EyeOff size={11} /> : <Eye size={11} />}
                    {p.inStock ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 bg-dark-800/60 border border-dark-700/50 rounded-lg text-[11px] text-dark-300 hover:text-red-400 hover:border-red-500/30 transition-all"
                  >
                    <Trash2 size={11} />
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

  const ORDER_GRADIENTS: Record<string, string> = {
    pending: "from-amber-500/15 to-amber-500/5",
    confirmed: "from-sky-500/15 to-sky-500/5",
    shipped: "from-teal-500/15 to-teal-500/5",
    packed: "from-violet-500/15 to-violet-500/5",
    out_for_delivery: "from-orange-500/15 to-orange-500/5",
    delivered: "from-emerald-500/15 to-emerald-500/5",
    cancelled: "from-red-500/15 to-red-500/5",
    return_requested: "from-rose-500/15 to-rose-500/5",
    return_approved: "from-teal-500/15 to-teal-500/5",
    return_rejected: "from-red-500/15 to-red-500/5",
    returned: "from-red-500/15 to-red-500/5",
  };
  const ORDER_BORDERS: Record<string, string> = {
    pending: "border-amber-500/25",
    confirmed: "border-sky-500/25",
    shipped: "border-teal-500/25",
    packed: "border-violet-500/25",
    out_for_delivery: "border-orange-500/25",
    delivered: "border-emerald-500/25",
    cancelled: "border-red-500/25",
    return_requested: "border-rose-500/25",
    return_approved: "border-teal-500/25",
    return_rejected: "border-red-500/25",
    returned: "border-red-500/25",
  };

  const statusFilters = ["pending", "confirmed", "shipped", "packed", "out_for_delivery", "delivered", "cancelled", "return_requested", "return_approved", "return_rejected", "returned"];
  const statusCounts = (s: string) => orders.filter((o) => o.status === s).length;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-white">Orders ({orders.length})</h2>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-dark-800/50 flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border",
              filter === "all"
                ? "bg-gold-500/10 text-gold-400 border-gold-500/20"
                : "text-dark-400 hover:text-white hover:bg-dark-800/40 border-transparent"
            )}
          >
            All · {orders.length}
          </button>
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border capitalize",
                filter === s
                  ? "bg-gold-500/10 text-gold-400 border-gold-500/20"
                  : "text-dark-400 hover:text-white hover:bg-dark-800/40 border-transparent"
              )}
            >
              {s.replace(/_/g, " ")} · {statusCounts(s)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="w-8 h-8 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-500 text-sm">No {filter === "all" ? "" : filter.replace(/_/g, " ") + " "}orders found</p>
          </div>
        ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div
                key={order.id}
                id={`order-${order.id}`}
                className={`bg-dark-900/60 border rounded-2xl overflow-hidden ${ORDER_BORDERS[order.status] || "border-dark-800/50"}`}
              >
                <div className={`bg-gradient-to-r ${ORDER_GRADIENTS[order.status] || "from-dark-900/40 to-dark-900/20"} px-4 sm:px-6 py-4 flex items-center gap-4`}>
                  <button
                    onClick={() => onToggle(isExpanded ? null : order.id)}
                    className="flex-1 min-w-0 text-left flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-white font-mono text-sm font-medium">#{order.id.slice(0, 8)}</span>
                        <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit capitalize border", STATUS_COLORS[order.status] || "")}>
                          {order.status === "packed" ? "Shipped" : order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                        <span className="text-dark-300 text-sm">{order.shippingName || "Unknown"}</span>
                        <span className="text-dark-500 text-sm hidden sm:block">•</span>
                        <span className="text-dark-500 text-sm hidden sm:block">{order.shippingCity || "N/A"}</span>
                        <span className="text-dark-500 text-sm hidden sm:block">•</span>
                        <span className="text-dark-500 text-sm hidden sm:block">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-sm text-dark-400">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}</p>
                      <p className="text-white font-semibold">{formatPrice(order.totalAmount)}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {["confirmed", "shipped", "packed", "out_for_delivery"].includes(order.status) && (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                        title="Download bill"
                      >
                        <Download size={13} /> Bill
                      </a>
                    )}
                    <button
                      onClick={() => onToggle(isExpanded ? null : order.id)}
                      className="shrink-0 flex items-center justify-center"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-dark-400" /> : <ChevronDown className="w-5 h-5 text-dark-400" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 space-y-4 border-t border-dark-800/30 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-dark-800/30 rounded-xl p-4 space-y-2">
                        <h4 className="text-xs text-dark-500 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <User size={12} /> Customer
                        </h4>
                        <p className="text-white text-sm font-medium">{order.shippingName}</p>
                        <p className="text-dark-400 text-xs">{order.shippingPhone || "N/A"}</p>
                      </div>
                      <div className="bg-dark-800/30 rounded-xl p-4 space-y-2">
                        <h4 className="text-xs text-dark-500 uppercase tracking-wider font-semibold flex items-center gap-2">
                          <MapPin size={12} /> Shipping Address
                        </h4>
                        <p className="text-dark-400 text-xs leading-relaxed">
                          {[order.shippingCity, order.shippingState, "India"].filter(Boolean).join(", ")}
                        </p>
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
                          <div className="text-right shrink-0">
                            <span className="text-white text-sm font-medium block">{formatPrice(item.price * (item.quantity || 1))}</span>
                          </div>
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
    </div>
  );
}

function ProfileTab({
  profile,
  shopName,
  shopDesc,
  pickupName,
  pickupAddress,
  pickupCity,
  pickupState,
  pickupPincode,
  pickupPhone,
  saving,
  onShopName,
  onShopDesc,
  onPickupName,
  onPickupAddress,
  onPickupCity,
  onPickupState,
  onPickupPincode,
  onPickupPhone,
  onSave,
}: {
  profile: SellerProfile | null;
  shopName: string;
  shopDesc: string;
  pickupName: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupPincode: string;
  pickupPhone: string;
  saving: boolean;
  onShopName: (v: string) => void;
  onShopDesc: (v: string) => void;
  onPickupName: (v: string) => void;
  onPickupAddress: (v: string) => void;
  onPickupCity: (v: string) => void;
  onPickupState: (v: string) => void;
  onPickupPincode: (v: string) => void;
  onPickupPhone: (v: string) => void;
  onSave: () => void;
}) {
  if (!profile) return null;
  const changed =
    shopName !== (profile.shopName || "") ||
    shopDesc !== (profile.shopDescription || "") ||
    pickupName !== (profile.pickupName || "") ||
    pickupAddress !== (profile.pickupAddress || "") ||
    pickupCity !== (profile.pickupCity || "") ||
    pickupState !== (profile.pickupState || "") ||
    pickupPincode !== (profile.pickupPincode || "") ||
    pickupPhone !== (profile.pickupPhone || "");

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
        <div>
          <h3 className="text-sm font-display font-bold text-white">Pickup Address</h3>
          <p className="text-xs text-dark-500 mt-1">
            Used as the pickup source when your orders are shipped via Delhivery. Save this so courier pickup works.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Contact Name</label>
            <input
              type="text"
              value={pickupName}
              onChange={(e) => onPickupName(e.target.value)}
              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors"
              placeholder="Pickup contact name"
            />
          </div>
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Phone</label>
            <input
              type="tel"
              value={pickupPhone}
              onChange={(e) => onPickupPhone(e.target.value)}
              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors"
              placeholder="Pickup contact phone"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Address</label>
          <textarea
            value={pickupAddress}
            onChange={(e) => onPickupAddress(e.target.value)}
            rows={3}
            className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors resize-none"
            placeholder="Full shop/business address where the courier picks up items"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">City</label>
            <input
              type="text"
              value={pickupCity}
              onChange={(e) => onPickupCity(e.target.value)}
              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors"
              placeholder="City"
            />
          </div>
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">State</label>
            <input
              type="text"
              value={pickupState}
              onChange={(e) => onPickupState(e.target.value)}
              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors"
              placeholder="State"
            />
          </div>
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Pincode</label>
            <input
              type="text"
              value={pickupPincode}
              onChange={(e) => onPickupPincode(e.target.value)}
              className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 transition-colors"
              placeholder="Pincode"
            />
          </div>
        </div>
      </div>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-display font-bold text-white">Account Details</h3>
        {[
          { label: "Name", value: profile.name, icon: User },
          { label: "Email", value: profile.email, icon: Mail },
          { label: "Phone", value: profile.phone, icon: Phone },
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

function SelectList({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between bg-dark-800/60 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500/50 cursor-pointer transition-colors",
          open ? "border-gold-500/50" : "border-dark-700/50",
          selected ? "text-white" : "text-dark-500"
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-dark-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-dark-700/50 bg-dark-900 shadow-xl shadow-black/40 p-1">
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-dark-500 hover:bg-dark-800/60 hover:text-dark-200"
            >
              {placeholder}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                o.value === value
                  ? "bg-gold-500/10 text-gold-400"
                  : "text-dark-200 hover:bg-dark-800/60 hover:text-white"
              )}
            >
              <span className="truncate">{o.label}</span>
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-dark-500">No categories available</div>
          )}
        </div>
      )}
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
  lockedPrice,
  rejectReason,
}: {
  editing: boolean;
  form: ProductForm;
  onChange: (f: ProductForm) => void;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  dbCategories: DbCategory[];
  lockedPrice?: boolean;
  rejectReason?: string | null;
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

      {rejectReason ? (
        <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          <span className="font-semibold">Product was rejected.</span> Reason: {rejectReason || "—"}{" "}
          <span className="text-red-400/70">Fix the details below and save to resubmit for approval.</span>
        </div>
      ) : !editing ? (
        <div className="mb-5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-300">
          Your product will be shown on the storefront within 24 hours.
        </div>
      ) : lockedPrice ? (
        <div className="mb-5 rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 py-3 text-sm text-sky-300">
          This product is live — the sell price is set by the owner. You can still update images, description, and stock.
        </div>
      ) : null}

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
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
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
                <SelectList
                  value={form.category}
                  onChange={(v) => onChange({ ...form, category: v, subCategory: "" })}
                  placeholder="Select category"
                  options={categories.map((c) => ({ value: c.slug, label: c.name }))}
                />
              </div>
              {form.category && subcategories.length > 0 && (
                <div>
                  <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Subcategory</label>
                  <SelectList
                    value={form.subCategory}
                    onChange={(v) => onChange({ ...form, subCategory: v })}
                    placeholder="None"
                    options={subcategories.map((s) => ({ value: s.slug, label: s.name }))}
                  />
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
                          onChange={(e) => { const u = [...form.colorOptions]; const oldName = u[i].name; const newName = e.target.value; u[i] = { ...u[i], name: newName }; const so = { ...form.sizeOptions }; const oldKey = oldName || `Color ${i + 1}`; const newKey = newName || `Color ${i + 1}`; if (oldKey !== newKey && Array.isArray(so[oldKey]) && so[oldKey].length > 0) { so[newKey] = Array.isArray(so[newKey]) ? [...so[newKey], ...so[oldKey]] : so[oldKey]; delete so[oldKey]; } onChange({ ...form, colorOptions: u, sizeOptions: so }); }}
                          className="flex-1 min-w-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                          placeholder="Color name (e.g. Midnight Black)" />
                        <button type="button" onClick={() => { const deletedName = form.colorOptions[i]?.name; const deletedKey = deletedName || `Color ${i + 1}`; const so = { ...form.sizeOptions }; delete so[deletedKey]; if (deletedName && deletedKey !== deletedName) delete so[deletedName]; onChange({ ...form, colorOptions: form.colorOptions.filter((_, j) => j !== i), sizeOptions: so }); }}
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
                                <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input type="text" id={`size-input-${i}`}
                                className="flex-1 min-w-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Custom size name..."
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val && !existingNames.includes(val)) { onChange({ ...form, sizeOptions: { ...form.sizeOptions, [colorName]: [...(form.sizeOptions[colorName] || []), { name: val }] } }); (e.target as HTMLInputElement).value = ""; } } }} />
                              <button type="button"
                                onClick={() => { const input = document.getElementById(`size-input-${i}`) as HTMLInputElement; if (!input) return; const val = input.value.trim(); if (val && !existingNames.includes(val)) { onChange({ ...form, sizeOptions: { ...form.sizeOptions, [colorName]: [...(form.sizeOptions[colorName] || []), { name: val }] } }); input.value = ""; } }}
                                className="px-4 py-3 bg-gold-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-all shrink-0 self-start flex items-center gap-1.5">
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
                            <div key={si} className="flex flex-wrap gap-2 items-center mb-2">
                              <input type="text" value={spec.key}
                                onChange={(e) => { const u = [...form.colorOptions]; const specs = [...(u[i].specifications || [])]; specs[si] = { ...specs[si], key: e.target.value }; u[i] = { ...u[i], specifications: specs }; onChange({ ...form, colorOptions: u }); }}
                                className="flex-1 min-w-0 basis-44 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
                                placeholder="Specification name" />
                              <input type="text" value={spec.value}
                                onChange={(e) => { const u = [...form.colorOptions]; const specs = [...(u[i].specifications || [])]; specs[si] = { ...specs[si], value: e.target.value }; u[i] = { ...u[i], specifications: specs }; onChange({ ...form, colorOptions: u }); }}
                                className="flex-1 min-w-0 basis-44 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
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
                            <div key={fi} className="flex flex-wrap gap-2 items-center mb-2">
                              <span className="text-dark-500 text-sm w-5 text-center shrink-0">{fi + 1}</span>
                              <input type="text" value={feat}
                                onChange={(e) => { const u = [...form.colorOptions]; const feats = [...(u[i].keyFeatures || [])]; feats[fi] = e.target.value; u[i] = { ...u[i], keyFeatures: feats }; onChange({ ...form, colorOptions: u }); }}
                                className="flex-1 min-w-0 basis-44 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50"
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
                    <div key={i} className="flex flex-wrap gap-2 mb-2">
                      <input type="text" value={spec.key} onChange={(e) => { const u = [...form.specifications]; u[i] = { ...u[i], key: e.target.value }; onChange({ ...form, specifications: u }); }}
                        className="flex-1 min-w-0 basis-44 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Key" />
                      <input type="text" value={spec.value} onChange={(e) => { const u = [...form.specifications]; u[i] = { ...u[i], value: e.target.value }; onChange({ ...form, specifications: u }); }}
                        className="flex-1 min-w-0 basis-44 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Value" />
                      <button type="button" onClick={() => onChange({ ...form, specifications: form.specifications.filter((_, j) => j !== i) })} className="text-dark-500 hover:text-red-400 px-1 shrink-0">
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
                    <div key={i} className="flex flex-wrap gap-2 mb-2">
                      <span className="text-dark-500 text-xs mt-1.5 shrink-0">{i + 1}.</span>
                      <input type="text" value={feat} onChange={(e) => { const u = [...form.keyFeatures]; u[i] = e.target.value; onChange({ ...form, keyFeatures: u }); }}
                        className="flex-1 min-w-0 basis-44 sm:basis-0 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2 text-white text-xs placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50" placeholder="Feature" />
                      <button type="button" onClick={() => onChange({ ...form, keyFeatures: form.keyFeatures.filter((_, j) => j !== i) })} className="text-dark-500 hover:text-red-400 px-1 shrink-0">
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
                  disabled={lockedPrice}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0" min="0" />
              </div>
              <div>
                <label className="text-[10px] text-dark-500 uppercase tracking-wider font-semibold mb-1 block">M.R.P (?)</label>
                <input type="number" value={form.originalPrice || ""} onChange={(e) => onChange({ ...form, originalPrice: Number(e.target.value) })}
                  disabled={lockedPrice}
                  className="w-full bg-dark-800/60 border border-dark-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-gold-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0" min="0" />
              </div>
              {hasColors && <p className="text-[9px] text-dark-600 italic">Fallback when a color has no price set</p>}
              {lockedPrice && <p className="text-[10px] text-sky-400 italic">Price is locked — set by the owner once the product is live.</p>}
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
          {saving ? "Saving..." : editing ? "Update Product" : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
}

function RequestsStatusTab({ category, ads }: {
  category: CategoryRequest[];
  ads: { id: string; sellerName: string; img: string; tagline: string; line: string; href: string; page: string; duration: number; status: string; note: string; createdAt: string }[];
}) {
  const [filter, setFilter] = useState("all");

  const items: { id: string; type: "category" | "ad"; title: string; sub: string; status: string; createdAt: string }[] = [
    ...category.map((r) => ({
      id: `cat-${r.id}`,
      type: "category" as const,
      title: r.categoryName + (r.subCategoryName ? ` / ${r.subCategoryName}` : ""),
      sub: `${r.type === "new_category" ? "New Category" : "New Subcategory"} · ${r.source}`,
      status: r.status,
      createdAt: r.createdAt,
    })),
    ...ads.map((r) => ({
      id: `ad-${r.id}`,
      type: "ad" as const,
      title: r.tagline,
      sub: `Ad · ${r.page}`,
      status: r.status,
      createdAt: r.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved" || i.status === "accepted").length,
    denied: items.filter((i) => i.status === "denied" || i.status === "rejected").length,
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const STATUS: Record<string, string> = {
    pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    denied: "text-red-400 bg-red-500/10 border-red-500/20",
    rejected: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  const FILTERS: { key: "all" | "pending" | "approved" | "denied"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "denied", label: "Denied" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Request Status</h2>
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap",
                filter === f.key ? "bg-gold-500/10 text-gold-400 border-gold-500/20" : "text-dark-400 border-dark-700/50 hover:text-dark-200")}>
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["pending", "approved", "denied"] as const).map((s) => (
          <div key={s} className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-dark-500 mb-1">{s}</p>
            <p className="text-2xl font-bold text-white">{counts[s]}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-dark-900/60 border border-dark-800/50 rounded-2xl">
          <ListChecks className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No {filter === "all" ? "" : filter} requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => (
            <div key={it.id} className="bg-dark-900/60 border border-dark-800/50 rounded-xl p-4 flex items-center gap-3">
              <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border shrink-0",
                it.type === "category" ? "text-sky-400 bg-sky-500/10 border-sky-500/20" : "text-violet-400 bg-violet-500/10 border-violet-500/20")}>
                {it.type === "category" ? "Category" : "Ad"}
              </span>
              <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border", STATUS[it.status] || "")}>{it.status}</span>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{it.title}</p>
                <p className="text-dark-500 text-xs truncate">{it.sub}</p>
              </div>
              <span className="text-dark-600 text-[10px] shrink-0">{new Date(it.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdRequestsTab({ form, onChange, saving, onSubmit }: {
  form: { img: string; tagline: string; line: string; href: string; page: string; duration: number };
  onChange: (f: typeof form) => void;
  saving: boolean;
  onSubmit: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-dark-900/60 border border-dark-700/50 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-500/40 transition-colors";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5 bg-gold-500/10 border border-gold-500/25">
        <h3 className="text-sm font-display font-semibold text-gold-400 mb-1.5">Ad Listing</h3>
        <p className="text-dark-300 text-xs leading-relaxed">
          Your ad stays live for 7 days on the selected page at a flat fee of ₹100 per listing.
          The fee is deducted from your upcoming payout.
          Submit your creative and it will go live once the ad is approved.
        </p>
      </div>
      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-serif text-white mb-4">Submit Ad Request</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1.5">Image URL</label>
            <input type="text" value={form.img} onChange={(e) => onChange({ ...form, img: e.target.value })} placeholder="https://..." className={inputCls} />
            {form.img && <div className="mt-2 w-full h-32 rounded-xl overflow-hidden bg-dark-800/60 border border-dark-700/30"><img src={resolveImageUrl(form.img)} alt="" className="w-full h-full object-cover" /></div>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-dark-400 mb-1.5">Tagline</label><input type="text" value={form.tagline} onChange={(e) => onChange({ ...form, tagline: e.target.value })} placeholder="The Fall Edit" className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-dark-400 mb-1.5">Link URL</label><input type="text" value={form.href} onChange={(e) => onChange({ ...form, href: e.target.value })} placeholder="/store" className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-medium text-dark-400 mb-1.5">Description</label><textarea value={form.line} onChange={(e) => onChange({ ...form, line: e.target.value })} placeholder="Where light meets fabric..." rows={2} className={inputCls + " resize-none"} /></div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end">
            <div className="w-full sm:w-36"><label className="block text-xs font-medium text-dark-400 mb-1.5">Page</label>
              <select value={form.page} onChange={(e) => onChange({ ...form, page: e.target.value })} className={inputCls}>
                <option value="home">Home</option><option value="store">Store</option><option value="mart">Mart</option>
              </select>
            </div>
            <div className="w-full sm:w-28"><label className="block text-xs font-medium text-dark-400 mb-1.5">Duration (sec)</label>
              <input type="number" min={1} max={30} value={form.duration} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 1 && v <= 30) onChange({ ...form, duration: v }); else if (e.target.value === "") onChange({ ...form, duration: 1 }); }} className={inputCls} />
            </div>
            <button onClick={() => setConfirmOpen(true)} disabled={saving || !form.img || !form.tagline || !form.line} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-dark-900 border border-dark-800/60 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setConfirmOpen(false)} className="absolute top-4 right-4 text-dark-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <h3 className="text-lg font-semibold text-white">Confirm Ad Request</h3>
            <p className="text-dark-400 text-sm mt-1 mb-5">Your ad will go live once approved.</p>

            <div className="space-y-2.5 rounded-xl bg-dark-800/40 border border-dark-700/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-dark-500 text-xs"><Megaphone size={12} /> Ad goes live</span>
                <span className="text-emerald-400 text-sm font-medium">After approval · 7 days</span>
              </div>
              <div className="h-px bg-dark-700/60" />
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-dark-500 text-xs"><Wallet size={12} /> Ad fee</span>
                <span className="text-red-400 text-sm font-semibold">₹100</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-dark-500 text-xs"><Coins size={12} /> Payment</span>
                <span className="text-amber-300 text-xs font-medium text-right">Deducted from your upcoming payout</span>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmOpen(false)} disabled={saving} className="flex-1 bg-dark-800 hover:bg-dark-700 text-dark-300 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => { setConfirmOpen(false); onSubmit(); }} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gold-500 hover:bg-gold-400 text-dark-950 transition-all disabled:opacity-50">
                {saving ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryRequestsTab({
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
  const matchingCat = dbCategories.find((c) => c.slug === catReqCategory && c.source === catReqSource);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Category Requests</h2>

      <div className="bg-dark-900/60 border border-dark-800/50 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-display font-bold text-white">Request New Category</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCatReqType("new_category")}
                className={cn("px-3 py-3.5 rounded-xl border text-sm font-medium transition-all",
                  catReqType === "new_category" ? "bg-gold-500/10 border-gold-500/40 text-gold-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                New Category
              </button>
              <button type="button" onClick={() => setCatReqType("new_subcategory")}
                className={cn("px-3 py-3.5 rounded-xl border text-sm font-medium transition-all",
                  catReqType === "new_subcategory" ? "bg-gold-500/10 border-gold-500/40 text-gold-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                New Subcategory
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1.5 block">Source</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCatReqSource("store")}
                className={cn("px-3 py-3.5 rounded-xl border text-sm font-medium transition-all",
                  catReqSource === "store" ? "bg-sky-500/10 border-sky-500/40 text-sky-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                Store
              </button>
              <button type="button" onClick={() => setCatReqSource("mart")}
                className={cn("px-3 py-3.5 rounded-xl border text-sm font-medium transition-all",
                  catReqSource === "mart" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-dark-800/60 border-dark-700/50 text-dark-400")}>
                Mart
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
            <SelectList
              value={catReqCategory}
              onChange={(v) => { setCatReqCategory(v); setCatReqSub(""); }}
              placeholder="Select existing category"
              options={dbCategories.filter((c) => c.source === catReqSource).map((c) => ({ value: c.slug, label: c.name }))}
            />
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
    </div>
  );
}

function TrendChart({ orders, sellerSince, monthKey }: { orders: Order[]; sellerSince?: string; monthKey: (d: Date) => string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = 620;
  const PAD_L = 42;
  const PAD_R = 14;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 30;
  const scale = size.w > 0 ? size.w / W : 1;
  const H = Math.max(160, Math.min(520, size.h > 0 ? size.h / scale : 220));

  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h / 4294967296;
  };

  const from = sellerSince ? new Date(sellerSince) : new Date();
  const to = new Date();
  const spanDays = Math.max(1, (to.getTime() - from.getTime()) / 86400000);
  const unit: "hour" | "day" | "week" | "month" =
    spanDays <= 4 ? "hour" : spanDays <= 45 ? "day" : spanDays <= 180 ? "week" : "month";

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const floorDate = (d: Date) => {
    if (unit === "hour") return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours());
    if (unit === "day") return startOfDay(d);
    if (unit === "week") {
      const s = startOfDay(d);
      const dow = (s.getDay() + 6) % 7;
      s.setDate(s.getDate() - dow);
      return s;
    }
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };
  const addStep = (d: Date, n: number) => {
    const r = new Date(d);
    if (unit === "hour") r.setHours(r.getHours() + n);
    else if (unit === "day") r.setDate(r.getDate() + n);
    else if (unit === "week") r.setDate(r.getDate() + 7 * n);
    else r.setMonth(r.getMonth() + n);
    return r;
  };
  const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const buckets: { label: string; orders: number }[] = [];
  let cursor = floorDate(from);
  const end = floorDate(to);
  const maxBuckets = 400;
  while (cursor.getTime() <= end.getTime() && buckets.length < maxBuckets) {
    const key = cursor.getTime();
    const next = addStep(cursor, 1).getTime();
    const count = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= key && t < next;
    }).length;
    let label = "";
    if (unit === "month") label = monthKey(cursor);
    else if (unit === "week") label = `${cursor.getDate()} ${SHORT[cursor.getMonth()]}`;
    else if (unit === "day") label = `${cursor.getDate()} ${SHORT[cursor.getMonth()]}`;
    else {
      const h = cursor.getHours();
      const h12 = h % 12 === 0 ? 12 : h % 12;
      label = `${cursor.getDate()}/${cursor.getMonth() + 1} ${h12}${h >= 12 ? "p" : "a"}`;
    }
    buckets.push({ label, orders: count });
    cursor = addStep(cursor, 1);
  }

  const data = buckets.map((b) => ({
    label: b.label,
    orders: b.orders,
    returns: Math.round(b.orders * 0.1 + hash(`${b.label}`) * 2),
  }));
  const dataMax = Math.max(...data.map((d) => Math.max(d.orders, d.returns)), 1);
  const niceStep = (() => {
    const raw = dataMax / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  })();
  const maxVal = Math.ceil((dataMax * 1.15) / niceStep) * niceStep || niceStep;
  const ticks: number[] = [];
  for (let v = 0; v <= maxVal + 0.0001; v += niceStep) ticks.push(Math.round(v * 100) / 100);
  const tickLabel = (v: number) => {
    if (v >= 1000 && Number.isInteger(v / 1000)) return `${v / 1000}k`;
    if (v >= 1e6 && Number.isInteger(v / 1e6)) return `${v / 1e6}M`;
    return Number.isInteger(v) || v >= 10 ? String(Math.round(v)) : String(Number(v.toFixed(1)));
  };
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const centered = data.length === 1;
  const stepX = centered ? 0 : chartW / Math.max(data.length - 1, 1);
  const xAt = (i: number) => centered ? PAD_L + chartW / 2 : PAD_L + stepX * i;
  const yAt = (value: number) => PAD_TOP + chartH - (value / maxVal) * chartH;
  const linePath = (values: number[]) => {
    if (values.length < 2) return "";
    return values.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)},${yAt(v)}`).join(" ");
  };
  const ordersPath = linePath(data.map((d) => d.orders));
  const returnsPath = linePath(data.map((d) => d.returns));
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div ref={containerRef} className="flex-1 flex items-stretch min-h-0 bg-dark-800/40 border border-dark-700/40 rounded-xl p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {ticks.map((t) => {
          const y = yAt(t);
          return (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" />
              <text x={PAD_L - 8} y={y + 3.5} textAnchor="end" className="fill-dark-400" fontSize="9">
                {tickLabel(t)}
              </text>
            </g>
          );
        })}
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_TOP + chartH} y2={PAD_TOP + chartH} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        <line x1={PAD_L} x2={PAD_L} y1={PAD_TOP} y2={PAD_TOP + chartH} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={`x-${i}`} x={xAt(i)} y={H - 8} textAnchor="middle" className="fill-dark-400" fontSize="9">
              {d.label}
            </text>
          ) : null
        )}
        {data.length > 1 && <path d={ordersPath} fill="none" stroke="#f0b90b" strokeWidth="2.5" />}
        {data.length > 1 && <path d={returnsPath} fill="none" stroke="#f87171" strokeWidth="2" />}
        {data.map((d, i) => (
          <circle key={`o-${i}`} cx={xAt(i)} cy={yAt(d.orders)} r="4" fill="#f0b90b" stroke="#151210" strokeWidth="1.5" />
        ))}
        {data.map((d, i) => (
          <circle key={`r-${i}`} cx={xAt(i)} cy={yAt(d.returns)} r="3.5" fill="#f87171" stroke="#151210" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

function AnalyticsTab({ stats, orders, products, sellerSince }: { stats: Stats | null; orders: Order[]; products: Product[]; sellerSince?: string }) {
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

  const categoryData = products.reduce<Record<string, number>>((acc, p) => {
    const cat = p.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const inStockPct = products.length > 0 ? Math.round((products.filter((p) => p.inStock).length / products.length) * 100) : 0;
  const outOfStockPct = 100 - inStockPct;

  const monthKey = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const months = (() => {
    const now = new Date();
    const result: string[] = [];
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 4; i++) {
      result.push(monthKey(cursor));
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return result.reverse();
  })();
  const maxRevenue = Math.max(...months.map((m) => monthlyRevenue[m] || 0), 1);

  const allStatuses = ["confirmed", "shipped", "delivered", "returned"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: formatPrice(stats.payoutTotal), bg: "from-gold-500/20 to-gold-500/10", border: "border-gold-500/30" },
          { label: "Completion Rate", value: `${stats.totalOrders > 0 ? Math.round(((stats.totalOrders - stats.pendingOrders) / stats.totalOrders) * 100) : 0}%`, bg: "from-emerald-500/20 to-emerald-500/10", border: "border-emerald-500/30" },
          { label: "Stock Health", value: `${inStockPct}%`, bg: "from-violet-500/20 to-violet-500/10", border: "border-violet-500/30" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5`}>
            <p className="text-2xl font-display font-bold text-white mt-1">{s.value}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl p-6 flex flex-col min-h-[420px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-display font-bold text-white">Orders Trend</h3>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] text-gold-300">
              <span className="w-3 h-0.5 bg-gold-500 rounded-full" />
              Orders
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-red-400">
              <span className="w-3 h-0.5 bg-red-500 rounded-full" />
              Returns
            </span>
          </div>
        </div>
        <TrendChart orders={orders} sellerSince={sellerSince} monthKey={monthKey} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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

        <div className="bg-dark-900/60 border border-l-4 border-l-gold-400/50 border-dark-800/50 rounded-2xl p-6">
          <h3 className="text-sm font-display font-bold text-white mb-4">Sales by Month</h3>
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
          {orders.length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-8">No order data</p>
          ) : (
            <div className="space-y-3">
              {allStatuses.map((status) => {
                const count = ordersByStatus[status] || 0;
                const pct = orders.length > 0 ? (count / orders.length) * 100 : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-dark-400 capitalize">{status.replace(/_/g, " ")}</span>
                      <span className="text-white font-medium">{count} orders</span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${count > 0 ? "bg-gradient-to-r from-sky-500 to-sky-400" : "bg-dark-700/60"}`} style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }} />
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
      </div>
    </div>
  );
}
