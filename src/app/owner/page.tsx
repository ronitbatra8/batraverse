/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, LogIn, ArrowLeft } from "lucide-react";
import { Tab, API, adminHeaders } from "../admin/components/types";
import AuthGate from "../admin/components/AuthGate";
import { useAuth } from "@/components/auth/AuthContext";
import { Spinner } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";
import Sidebar from "../admin/components/Sidebar";
import OverviewTab from "../admin/components/OverviewTab";
import OrdersTab from "../admin/components/OrdersTab";
import UsersTab from "../admin/components/UsersTab";
import MessagesTab from "../admin/components/MessagesTab";
import SecurityTab from "../admin/components/SecurityTab";
import AnalyticsTab from "../admin/components/AnalyticsTab";
import NewsletterTab from "../admin/components/NewsletterTab";
import PrivateViewingTab from "../admin/components/PrivateViewingTab";
import DeliveryExecTab from "../admin/components/DeliveryExecTab";
import SellersTab from "../admin/components/SellersTab";
import CardManagement from "../admin/components/CardManagement";
import ViolationsTab from "../admin/components/ViolationsTab";
import ProductsTab from "../admin/components/ProductsTab";
import ProductCatalogTab from "../admin/components/ProductCatalogTab";
import SellerRequestsTab from "../admin/components/SellerRequestsTab";
import AdsTab from "../admin/components/AdsTab";
import WalletTopUpsTab from "../admin/components/WalletTopUpsTab";
import FeaturedTab from "../admin/components/FeaturedTab";
import TestimonialsTab from "../admin/components/TestimonialsTab";
import { useToast } from "@/components/Toast";

// Empty initial state. Every tab is populated exclusively by live API responses
// (see loadAll) — there is no preview/seed data.
const EMPTY_DATA = {
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    outForDeliveryOrders: 0,
    totalUsers: 0,
    deliveredOrders: 0,
  },
  orders: [],
  users: [],
  messages: { total: 0, unread: 0, messages: [] },
  newsletter: { total: 0, active: 0, subscribers: [] },
  privateViewing: { total: 0, unread: 0, requests: [] },
  analytics: {
    today: { visits: 0, unique: 0 },
    week: { visits: 0, unique: 0 },
    overall: { visits: 0, unique: 0 },
    avgDuration: 0,
    dailyLast7: [],
    topPages: [],
  },
  passwordResets: [],
};

export default function AdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [authenticated, setAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const isOwner = !!user && user.role === "ADMIN";

  const [orders, setOrders] = useState<any[]>(EMPTY_DATA.orders);
  const [users, setUsers] = useState<any[]>(EMPTY_DATA.users);
  const [stats, setStats] = useState<any>(EMPTY_DATA.stats);
  const [analytics, setAnalytics] = useState<any>(EMPTY_DATA.analytics);
  const [newsletter, setNewsletter] = useState<any>(EMPTY_DATA.newsletter);
  const [messages, setMessages] = useState<any>(EMPTY_DATA.messages);
  const [privateViewing, setPrivateViewing] = useState<any>(EMPTY_DATA.privateViewing);
  const [passwordResets, setPasswordResets] = useState<any[]>(EMPTY_DATA.passwordResets);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setAuthError("");
    try {
      const h = adminHeaders(adminKey);
      const [o, u, s, a, nl, mg, pv, pr] = await Promise.all([
        fetch(`${API}/api/admin/orders`, { headers: h }).then((r) => r.json()),
        fetch(`${API}/api/admin/users`, { headers: h }).then((r) => r.json()),
        fetch(`${API}/api/admin/stats`, { headers: h }).then((r) => r.json()),
        fetch(`${API}/api/analytics/stats`, { headers: h }).then((r) => r.json()),
        fetch(`${API}/api/newsletter/list`, { headers: h }).then((r) => r.json()),
        fetch(`${API}/api/messages/list`, { headers: h }).then((r) => r.json()),
        fetch(`${API}/api/private-viewing/list`, { headers: h }).then((r) => r.json()),
        fetch(`${API}/api/admin/password-resets`, { headers: h }).then((r) => r.json()),
      ]);
      if (o && o.error) { setAuthError(o.error); setLoading(false); return; }
      setOrders(Array.isArray(o) ? o : []);
      setUsers(Array.isArray(u) ? u : []);
      setStats(s && typeof s === "object" && !Array.isArray(s) ? s : EMPTY_DATA.stats);
      setAnalytics(a && typeof a === "object" && !Array.isArray(a) ? a : EMPTY_DATA.analytics);
      setNewsletter(nl && typeof nl === "object" && !Array.isArray(nl)
        ? { ...nl, subscribers: Array.isArray(nl.subscribers) ? nl.subscribers : [] }
        : EMPTY_DATA.newsletter);
      setMessages(mg && typeof mg === "object" && !Array.isArray(mg)
        ? { ...mg, messages: Array.isArray(mg.messages) ? mg.messages : [] }
        : EMPTY_DATA.messages);
      setPrivateViewing(pv && typeof pv === "object" && !Array.isArray(pv)
        ? { ...pv, requests: Array.isArray(pv.requests) ? pv.requests : [] }
        : EMPTY_DATA.privateViewing);
      setPasswordResets(Array.isArray(pr) ? pr : []);
      setAuthenticated(true);
    } catch { setAuthError("Cannot connect to server"); }
    setLoading(false);
  }, [adminKey]);

  const updateStatus = useCallback(async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
        method: "PUT", headers: adminHeaders(adminKey), body: JSON.stringify({ status }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Request failed"); }
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (e: any) { toast(e.message || "Failed to update status", "error"); }
    setUpdatingId(null);
  }, [adminKey, toast]);

  const updateItemStatus = useCallback(async (orderId: string, itemIdx: number, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/items/${itemIdx}/status`, {
        method: "PUT", headers: adminHeaders(adminKey), body: JSON.stringify({ status }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Request failed"); }
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (e: any) { toast(e.message || "Failed to update item status", "error"); }
    setUpdatingId(null);
  }, [adminKey, toast]);

  const assignOrder = useCallback(async (orderId: string, deliveryId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/assign`, {
        method: "PUT", headers: adminHeaders(adminKey), body: JSON.stringify({ deliveryId }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Request failed"); }
      loadAll();
    } catch (e: any) { toast(e.message || "Failed to assign/unassign delivery executive", "error"); }
    setUpdatingId(null);
  }, [adminKey, loadAll, toast]);

  const paymentAction = useCallback(async (orderId: string, action: "approve" | "reject") => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/payment`, {
        method: "PUT", headers: adminHeaders(adminKey), body: JSON.stringify({ action }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Request failed"); }
      loadAll();
    } catch (e: any) { toast(e.message || "Failed to update payment", "error"); }
    setUpdatingId(null);
  }, [adminKey, loadAll, toast]);

  const returnApprove = useCallback(async (orderId: string, action: "approve" | "reject") => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/return-approve`, {
        method: "PUT", headers: adminHeaders(adminKey), body: JSON.stringify({ action }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Request failed"); }
      loadAll();
    } catch (e: any) { toast(e.message || "Failed to process return", "error"); }
    setUpdatingId(null);
  }, [adminKey, loadAll, toast]);

  const shipViaDelhivery = useCallback(async (orderId: string) => {
    const res = await fetch(`${API}/api/admin/orders/${orderId}/delhivery-ship`, {
      method: "POST", headers: adminHeaders(adminKey),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Failed to ship via Delhivery"); }
    const data = await res.json();
    if (data.order) setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
    if (!data.already) {
      toast(data.waybill ? `Shipped successfully — Waybill ${data.waybill}` : "Order shipped via Delhivery", "success");
    }
    return data;
  }, [adminKey, toast]);

  const handleSignOut = useCallback(() => {
    setAuthenticated(false);
    setTab("overview");
  }, []);

  const handleNavigateToTab = useCallback((targetTab: Tab, focusId?: string) => {
    setTab(targetTab);
    if (focusId && targetTab === "orders") {
      setFocusOrderId(focusId);
    }
  }, []);

  const badges = useMemo(() => ({
    orders: orders.length,
    users: users.length,
    messages: messages?.unread || 0,
    security: passwordResets.length,
    newsletter: newsletter?.active || 0,
    privateviewing: privateViewing?.unread || 0,
  } as Partial<Record<Tab, number>>), [orders, users, messages, passwordResets, newsletter, privateViewing]);

  /* Require an actual signed-in ADMIN (owner) account. Anyone who is not
     signed in, or not the owner, is denied — the panel never opens for them. */
  if (authLoading) return <Spinner />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-6">
            <LogIn size={36} className="text-gold-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">Owner Panel</h1>
          <p className="text-dark-400 text-sm mb-8">
            You must be signed in as the owner to access the owner dashboard.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-dark-950 px-8 py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-gold-500/20">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
            <ShieldAlert size={36} className="text-red-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">Access Denied</h1>
          <p className="text-dark-400 text-sm mb-8">
            This area is restricted to the owner account only. You are signed in as a non-owner account.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 border border-dark-700 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-dark-800">
              <ArrowLeft size={16} /> Back to Home
            </Link>
            <Link href="/account" className="inline-flex items-center gap-2 border border-dark-700 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-dark-800">
              My Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <AuthGate adminKey={adminKey} setAdminKey={setAdminKey} showKey={showKey} setShowKey={setShowKey} loading={loading} onSubmit={loadAll} authError={authError} />;
  }

  return (
    <div className="min-h-screen bg-dark-950 page-transition overflow-x-hidden">
      <Sidebar tab={tab} setTab={setTab} loading={loading} onRefresh={loadAll} onSignOut={handleSignOut} badges={badges} />

      <main className="pt-40 min-h-screen lg:pl-56">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
          {tab === "overview" && <OverviewTab stats={stats} orders={orders} passwordResets={passwordResets} messages={messages} onNavigate={handleNavigateToTab} />}
          {tab === "orders" && <OrdersTab orders={orders} updatingId={updatingId} onStatusUpdate={updateStatus} onItemStatusUpdate={updateItemStatus} onAssign={assignOrder} onPaymentAction={paymentAction} onReturnApprove={returnApprove} focusOrderId={focusOrderId} onFocusHandled={() => setFocusOrderId(null)} adminKey={adminKey} onShipDelhivery={shipViaDelhivery} />}
          {tab === "users" && <UsersTab users={users} adminKey={adminKey} onNavigate={handleNavigateToTab} />}
          {tab === "messages" && <MessagesTab messages={messages} adminKey={adminKey} setMessages={setMessages} />}
          {tab === "security" && <SecurityTab />}
          {tab === "analytics" && <AnalyticsTab analytics={analytics} />}
          {tab === "newsletter" && <NewsletterTab newsletter={newsletter} adminKey={adminKey} setNewsletter={setNewsletter} />}
          {tab === "privateviewing" && <PrivateViewingTab privateViewing={privateViewing} adminKey={adminKey} setPrivateViewing={setPrivateViewing} />}
          {tab === "delivery" && <DeliveryExecTab adminKey={adminKey} />}
          {tab === "sellers" && <SellersTab adminKey={adminKey} />}
          {tab === "cards" && <CardManagement adminKey={adminKey} />}
          {tab === "violations" && <ViolationsTab adminKey={adminKey} />}
          {tab === "categories" && <ProductsTab adminKey={adminKey} />}
          {tab === "productcatalog" && <ProductCatalogTab adminKey={adminKey} />}
          {tab === "sellerrequests" && <SellerRequestsTab adminKey={adminKey} />}
          {tab === "ads" && <AdsTab adminKey={adminKey} />}
          {tab === "wallet" && <WalletTopUpsTab adminKey={adminKey} />}
          {tab === "featured" && <FeaturedTab adminKey={adminKey} />}
          {tab === "testimonials" && <TestimonialsTab adminKey={adminKey} />}
        </div>
      </main>
    </div>
  );
}
