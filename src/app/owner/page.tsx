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
import { useToast } from "@/components/Toast";

// Preview seed data — lets the full design render without a backend.
// Replaced by live API responses as soon as the backend is connected.
const PREVIEW_DATA = {
  stats: {
    totalRevenue: 128500,
    totalOrders: 5,
    pendingOrders: 1,
    outForDeliveryOrders: 1,
    totalUsers: 1286,
    deliveredOrders: 1,
  },
  orders: [
    { id: "ORD-8F3K2M1", shippingName: "Aarav Mehta", source: "store", user: { name: "Aarav Mehta", email: "aarav@example.com", phone: "+91 98200 12345" }, email: "aarav@example.com", phone: "+91 98200 12345", shippingPhone: "+91 98200 12345", createdAt: "2026-08-15T10:24:00.000Z", items: [{ image: "", name: "Antique Brass Chandelier", quantity: 1, price: 42500 }], totalAmount: 42500, shippingAddress: "24 Marine Drive, Apt 7B", shippingCity: "Mumbai", shippingState: "Maharashtra", shippingPincode: "400020", paymentMethod: "Card", paymentStatus: "paid", status: "delivered", assignedTo: "dlv-1", deliveryExecutive: { name: "Rohan Sharma" } },
    { id: "ORD-5T9QX2A", shippingName: "Ishita Kapoor", source: "store", user: { name: "Ishita Kapoor", email: "ishita@example.com", phone: "+91 98765 43210" }, email: "ishita@example.com", phone: "+91 98765 43210", shippingPhone: "+91 98765 43210", createdAt: "2026-08-16T08:02:00.000Z", items: [{ image: "", name: "Handwoven Silk Rug", quantity: 2, price: 12800 }], totalAmount: 25600, shippingAddress: "12 Lodi Estate", shippingCity: "New Delhi", shippingState: "Delhi", shippingPincode: "110003", paymentMethod: "UPI", paymentStatus: "paid", status: "confirmed", assignedTo: null, deliveryExecutive: null },
    { id: "ORD-7B1L4W9", shippingName: "Kabir Anand", source: "mart", deliveryMode: "express", user: { name: "Kabir Anand", email: "kabir@example.com", phone: "+91 99887 76655" }, email: "kabir@example.com", phone: "+91 99887 76655", shippingPhone: "+91 99887 76655", createdAt: "2026-08-15T18:45:00.000Z", items: [{ image: "", name: "Marble Table Lamp", quantity: 1, price: 8600 }], totalAmount: 8600, shippingAddress: "88 Residency Road", shippingCity: "Bengaluru", shippingState: "Karnataka", shippingPincode: "560025", paymentMethod: "COD", paymentStatus: "pending", status: "out_for_delivery", assignedTo: "dlv-1", deliveryExecutive: { name: "Rohan Sharma" } },
    { id: "ORD-2Z8M6P3", shippingName: "Riya Nair", source: "mart", deliveryMode: "standard", user: { name: "Riya Nair", email: "riya@example.com", phone: "+91 91234 56789" }, email: "riya@example.com", phone: "+91 91234 56789", shippingPhone: "+91 91234 56789", createdAt: "2026-08-16T11:30:00.000Z", items: [{ image: "", name: "Velvet Accent Armchair", quantity: 1, price: 21500 }], totalAmount: 21500, shippingAddress: "41 Fort Kochi Road", shippingCity: "Kochi", shippingState: "Kerala", shippingPincode: "682001", paymentMethod: "Card", paymentStatus: "paid", status: "pending", assignedTo: null, deliveryExecutive: null },
    { id: "ORD-9V4C1H7", shippingName: "Dev Malhotra", source: "store", user: { name: "Dev Malhotra", email: "dev@example.com", phone: "+91 97890 11223" }, email: "dev@example.com", phone: "+91 97890 11223", shippingPhone: "+91 97890 11223", createdAt: "2026-08-14T21:10:00.000Z", items: [{ image: "", name: "Carved Brass Vase", quantity: 1, price: 5400 }], totalAmount: 5400, shippingAddress: "7 Golf Course Road", shippingCity: "Gurugram", shippingState: "Haryana", shippingPincode: "122002", paymentMethod: "Card", paymentStatus: "refunded", status: "return_requested", assignedTo: null, deliveryExecutive: null },
  ],
  users: [
    { id: "usr-1", name: "Aarav Mehta", email: "aarav@example.com", phone: "+91 98200 12345", role: "USER", _count: { orders: 58, reviews: 6 }, totalSpent: 2850000, createdAt: "2025-11-02T09:12:00.000Z", savedAddresses: [{ address: "24 Marine Drive, Apt 7B", city: "Mumbai", state: "Maharashtra", pincode: "400020", isDefault: true }], reviews: [{ product: "Antique Brass Chandelier", comment: "Stunning piece, lights up the whole hall.", rating: 5 }], messages: [{ subject: "Delivery query", message: "When will my chandelier arrive?", replyMessage: null }] },
    { id: "usr-2", name: "Ishita Kapoor", email: "ishita@example.com", phone: "+91 98765 43210", role: "USER", _count: { orders: 12, reviews: 3 }, totalSpent: 412000, createdAt: "2026-01-18T14:40:00.000Z", savedAddresses: [{ address: "12 Lodi Estate", city: "New Delhi", state: "Delhi", pincode: "110003", isDefault: true }], reviews: [{ product: "Handwoven Silk Rug", comment: "Premium quality silk.", rating: 4 }], messages: [] },
    { id: "usr-3", name: "Dev Malhotra", email: "dev@example.com", phone: "+91 97890 11223", role: "USER", _count: { orders: 36, reviews: 5 }, totalSpent: 1890000, createdAt: "2025-06-14T21:10:00.000Z", savedAddresses: [{ address: "7 Golf Course Road", city: "Gurugram", state: "Haryana", pincode: "122002", isDefault: true }], reviews: [{ product: "Carved Brass Vase", comment: "Exquisite craftsmanship.", rating: 5 }], messages: [] },
    { id: "usr-4", name: "Priya Shah", email: "priya@example.com", phone: "+91 98111 23456", role: "USER", _count: { orders: 24, reviews: 4 }, totalSpent: 1160000, createdAt: "2025-08-22T18:02:00.000Z", savedAddresses: [], reviews: [], messages: [] },
    { id: "usr-5", name: "Rohan Sharma", email: "rohan@example.com", phone: "+91 90040 11223", role: "DELIVERY", _count: { orders: 0, reviews: 0 }, totalSpent: 0, createdAt: "2025-09-10T10:00:00.000Z", savedAddresses: [], reviews: [], messages: [] },
    { id: "usr-6", name: "Meera Joshi", email: "meera@example.com", phone: "+91 98989 00909", role: "SELLER", _count: { orders: 0, reviews: 0 }, totalSpent: 0, createdAt: "2025-12-05T16:22:00.000Z", savedAddresses: [], reviews: [], messages: [] },
    { id: "usr-7", name: "Vikram Malhotra", email: "vikram@example.com", phone: "+91 98800 11223", role: "USER", _count: { orders: 1, reviews: 0 }, totalSpent: 42500, createdAt: "2026-07-20T11:05:00.000Z", savedAddresses: [{ address: "55 Banjara Hills", city: "Hyderabad", state: "Telangana", pincode: "500034", isDefault: true }], reviews: [], messages: [] },
    { id: "usr-8", name: "Ananya Iyer", email: "ananya@example.com", phone: "+91 96666 54321", role: "USER", _count: { orders: 8, reviews: 2 }, totalSpent: 312000, createdAt: "2026-03-11T09:40:00.000Z", savedAddresses: [{ address: "19 Anna Nagar", city: "Chennai", state: "Tamil Nadu", pincode: "600040", isDefault: true }], reviews: [{ product: "Marble Table Lamp", comment: "Love the finish.", rating: 4 }], messages: [] },
    { id: "usr-9", name: "Kabir Anand", email: "kabir@example.com", phone: "+91 99887 76655", role: "USER", _count: { orders: 10, reviews: 3 }, totalSpent: 486000, createdAt: "2026-01-05T17:30:00.000Z", savedAddresses: [{ address: "88 Residency Road", city: "Bengaluru", state: "Karnataka", pincode: "560025", isDefault: true }], reviews: [{ product: "Marble Table Lamp", comment: "Elegant and heavy.", rating: 5 }], messages: [{ subject: "Change delivery address", message: "Please deliver to my office instead.", replyMessage: null }] },
    { id: "usr-10", name: "Riya Nair", email: "riya@example.com", phone: "+91 91234 56789", role: "USER", _count: { orders: 16, reviews: 4 }, totalSpent: 728000, createdAt: "2025-10-30T13:15:00.000Z", savedAddresses: [{ address: "41 Fort Kochi Road", city: "Kochi", state: "Kerala", pincode: "682001", isDefault: true }], reviews: [{ product: "Velvet Accent Armchair", comment: "Fits the living room perfectly.", rating: 5 }], messages: [{ subject: "Invoice copy", message: "Could you share a GST invoice?", replyMessage: "Shared via email, thanks!" }] },
    { id: "usr-11", name: "Neha Gupta", email: "neha@example.com", phone: "+91 97000 11223", role: "USER", _count: { orders: 20, reviews: 5 }, totalSpent: 965000, createdAt: "2025-08-15T10:20:00.000Z", savedAddresses: [{ address: "3 Golf Links", city: "New Delhi", state: "Delhi", pincode: "110003", isDefault: true }], reviews: [{ product: "Handwoven Silk Rug", comment: "Beautiful weave.", rating: 5 }], messages: [] },
    { id: "usr-12", name: "Arjun Reddy", email: "arjun@example.com", phone: "+91 96789 01234", role: "USER", _count: { orders: 27, reviews: 6 }, totalSpent: 1310000, createdAt: "2025-05-22T18:45:00.000Z", savedAddresses: [{ address: "8 Jubilee Hills", city: "Hyderabad", state: "Telangana", pincode: "500033", isDefault: true }], reviews: [{ product: "Carved Brass Vase", comment: "Centerpiece of our hall.", rating: 5 }], messages: [] },
    { id: "usr-13", name: "Sneha Kulkarni", email: "sneha@example.com", phone: "+91 96555 44556", role: "USER", _count: { orders: 30, reviews: 8 }, totalSpent: 1575000, createdAt: "2025-04-02T12:00:00.000Z", savedAddresses: [{ address: "27 Koregaon Park", city: "Pune", state: "Maharashtra", pincode: "411001", isDefault: true }], reviews: [{ product: "Antique Brass Chandelier", comment: "Gorgeous craftsmanship.", rating: 5 }], messages: [] },
    { id: "usr-14", name: "Rahul Verma", email: "rahul@example.com", phone: "+91 96444 88990", role: "USER", _count: { orders: 45, reviews: 9 }, totalSpent: 2240000, createdAt: "2024-11-19T09:55:00.000Z", savedAddresses: [{ address: "12 Civil Lines", city: "Jaipur", state: "Rajasthan", pincode: "302006", isDefault: true }], reviews: [{ product: "Velvet Accent Armchair", comment: "Royal look.", rating: 5 }], messages: [] },
    { id: "usr-15", name: "Sara Khan", email: "sara@example.com", phone: "+91 96333 22110", role: "USER", _count: { orders: 50, reviews: 11 }, totalSpent: 2680000, createdAt: "2024-09-01T16:10:00.000Z", savedAddresses: [{ address: "6 Carter Road", city: "Mumbai", state: "Maharashtra", pincode: "400050", isDefault: true }], reviews: [{ product: "Antique Brass Chandelier", comment: "Timeless.", rating: 5 }], messages: [] },
    { id: "usr-16", name: "Aditya Rao", email: "aditya@example.com", phone: "+91 96222 33445", role: "USER", _count: { orders: 85, reviews: 14 }, totalSpent: 4120000, createdAt: "2024-05-08T14:25:00.000Z", savedAddresses: [{ address: "21 Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038", isDefault: true }], reviews: [{ product: "Handwoven Silk Rug", comment: "Exceptional quality.", rating: 5 }], messages: [] },
    { id: "usr-17", name: "Kavita Deshmukh", email: "kavita@example.com", phone: "+91 96111 55667", role: "USER", _count: { orders: 120, reviews: 18 }, totalSpent: 5890000, createdAt: "2024-01-25T11:40:00.000Z", savedAddresses: [{ address: "15 Marine Drive", city: "Mumbai", state: "Maharashtra", pincode: "400020", isDefault: true }], reviews: [{ product: "Velvet Accent Armchair", comment: "Best purchase yet.", rating: 5 }], messages: [] },
  ],
  messages: { total: 3, unread: 2, messages: [
    { id: "msg-1", name: "Aarav Mehta", email: "aarav@example.com", subject: "Delivery query", message: "When will my chandelier arrive?", status: "pending", read: false, createdAt: "2026-08-16T09:12:00.000Z", user: "Aarav Mehta", replyMessage: null, repliedAt: null },
    { id: "msg-2", name: "Kabir Anand", email: "kabir@example.com", subject: "Change delivery address", message: "Please deliver to my office instead.", status: "pending", read: false, createdAt: "2026-08-15T19:40:00.000Z", user: "Kabir Anand", replyMessage: null, repliedAt: null },
    { id: "msg-3", name: "Riya Nair", email: "riya@example.com", subject: "Invoice copy", message: "Could you share a GST invoice?", status: "resolved", read: true, createdAt: "2026-08-14T13:05:00.000Z", user: "Riya Nair", replyMessage: "Shared via email, thanks!", repliedAt: "2026-08-14T15:30:00.000Z" },
  ] },
  newsletter: { total: 4, active: 3, subscribers: [
    { id: "sub-1", email: "aarav@example.com", name: "Aarav Mehta", createdAt: "2025-11-02T09:12:00.000Z" },
    { id: "sub-2", email: "ishita@example.com", name: "Ishita Kapoor", createdAt: "2026-01-18T14:40:00.000Z" },
    { id: "sub-3", email: "dev@example.com", name: "Dev Malhotra", createdAt: "2026-03-09T11:20:00.000Z" },
    { id: "sub-4", email: "priya@example.com", name: "Priya Shah", createdAt: "2026-06-22T18:02:00.000Z" },
  ] },
  privateViewing: { total: 0, unread: 0, requests: [] },
  analytics: {
    today: { visits: 142, unique: 98 },
    week: { visits: 1080, unique: 640 },
    overall: { visits: 48210, unique: 21400 },
    avgDuration: 186,
    dailyLast7: [
      { label: "Sun", visits: 120 },
      { label: "Mon", visits: 165 },
      { label: "Tue", visits: 142 },
      { label: "Wed", visits: 198 },
      { label: "Thu", visits: 176 },
      { label: "Fri", visits: 204 },
      { label: "Sat", visits: 142 },
    ],
    topPages: [
      { page: "/", visits: 3400 },
      { page: "/store", visits: 2100 },
      { page: "/products/antique-chandelier", visits: 1420 },
      { page: "/search", visits: 980 },
    ],
  },
  passwordResets: [
    { id: "pr-1", user: "Aarav Mehta", name: "Aarav Mehta", email: "aarav@example.com", phone: "+91 98200 12345", method: "email", requestedAt: "2026-08-16T08:30:00.000Z", createdAt: "2026-08-16T08:30:00.000Z", ipAddress: "103.21.58.111", failReason: null, status: "completed" },
    { id: "pr-2", user: "Ishita Kapoor", name: "Ishita Kapoor", email: "ishita@example.com", phone: "+91 98765 43210", method: "sms", requestedAt: "2026-08-15T22:14:00.000Z", createdAt: "2026-08-15T22:14:00.000Z", ipAddress: "157.32.90.44", failReason: "Invalid OTP three times", status: "failed" },
    { id: "pr-3", user: "Priya Shah", name: "Priya Shah", email: "priya@example.com", phone: "+91 98111 23456", method: "email", requestedAt: "2026-08-15T12:02:00.000Z", createdAt: "2026-08-15T12:02:00.000Z", ipAddress: "45.118.76.3", failReason: null, status: "requested" },
  ],
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

  const [orders, setOrders] = useState<any[]>(PREVIEW_DATA.orders);
  const [users, setUsers] = useState<any[]>(PREVIEW_DATA.users);
  const [stats, setStats] = useState<any>(PREVIEW_DATA.stats);
  const [analytics, setAnalytics] = useState<any>(PREVIEW_DATA.analytics);
  const [newsletter, setNewsletter] = useState<any>(PREVIEW_DATA.newsletter);
  const [messages, setMessages] = useState<any>(PREVIEW_DATA.messages);
  const [privateViewing, setPrivateViewing] = useState<any>(PREVIEW_DATA.privateViewing);
  const [passwordResets, setPasswordResets] = useState<any[]>(PREVIEW_DATA.passwordResets);

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
      setStats(s && typeof s === "object" && !Array.isArray(s) ? s : PREVIEW_DATA.stats);
      setAnalytics(a && typeof a === "object" && !Array.isArray(a) ? a : PREVIEW_DATA.analytics);
      setNewsletter(nl && typeof nl === "object" && !Array.isArray(nl)
        ? { ...nl, subscribers: Array.isArray(nl.subscribers) ? nl.subscribers : [] }
        : PREVIEW_DATA.newsletter);
      setMessages(mg && typeof mg === "object" && !Array.isArray(mg)
        ? { ...mg, messages: Array.isArray(mg.messages) ? mg.messages : [] }
        : PREVIEW_DATA.messages);
      setPrivateViewing(pv && typeof pv === "object" && !Array.isArray(pv)
        ? { ...pv, requests: Array.isArray(pv.requests) ? pv.requests : [] }
        : PREVIEW_DATA.privateViewing);
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
          {tab === "orders" && <OrdersTab orders={orders} updatingId={updatingId} onStatusUpdate={updateStatus} onItemStatusUpdate={updateItemStatus} onAssign={assignOrder} onPaymentAction={paymentAction} onReturnApprove={returnApprove} focusOrderId={focusOrderId} onFocusHandled={() => setFocusOrderId(null)} adminKey="" />}
          {tab === "users" && <UsersTab users={users} adminKey="" onNavigate={handleNavigateToTab} />}
          {tab === "messages" && <MessagesTab messages={messages} adminKey="" setMessages={setMessages} />}
          {tab === "security" && <SecurityTab />}
          {tab === "analytics" && <AnalyticsTab analytics={analytics} />}
          {tab === "newsletter" && <NewsletterTab newsletter={newsletter} adminKey="" setNewsletter={setNewsletter} />}
          {tab === "privateviewing" && <PrivateViewingTab privateViewing={privateViewing} adminKey="" setPrivateViewing={setPrivateViewing} />}
          {tab === "delivery" && <DeliveryExecTab adminKey="" />}
          {tab === "sellers" && <SellersTab adminKey="" />}
          {tab === "cards" && <CardManagement adminKey="" />}
          {tab === "violations" && <ViolationsTab adminKey="" />}
          {tab === "categories" && <ProductsTab adminKey="" />}
          {tab === "productcatalog" && <ProductCatalogTab adminKey="" />}
          {tab === "sellerrequests" && <SellerRequestsTab adminKey="" />}
          {tab === "ads" && <AdsTab adminKey="" />}
          {tab === "wallet" && <WalletTopUpsTab adminKey="" />}
        </div>
      </main>
    </div>
  );
}
