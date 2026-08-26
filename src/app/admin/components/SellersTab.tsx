/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Store, UserCheck, UserX, ChevronDown, ChevronUp, Package, ShoppingBag, Eye, LogIn } from "lucide-react";
import { API, adminHeaders, statusColors } from "./types";
import { formatPrice } from "@/lib/utils";

export default function SellersTab({ adminKey }: { adminKey: string }) {
  const [sellers, setSellers] = useState<any[]>([
    { id: "slr-1", name: "Meera Joshi", email: "meera@example.com", phone: "+91 98989 00909", approved: true, createdAt: "2025-12-05T16:22:00.000Z", _count: { products: 3 }, products: [
      { id: "prd-1", images: [], name: "Antique Brass Chandelier", brand: "Meera Artisan", price: 42500, originalPrice: 52000, category: "Lighting", inStock: true, description: "Handcrafted antique brass chandelier with hand-polished finish." },
      { id: "prd-2", images: [], name: "Carved Brass Vase", brand: "Meera Artisan", price: 5400, originalPrice: 5400, category: "Decor", inStock: true, description: "Carved brass vase, one of a kind." },
      { id: "prd-3", images: [], name: "Rosewood Jewelry Box", brand: "Meera Artisan", price: 3200, originalPrice: 4200, category: "Decor", inStock: false, description: "Rosewood jewelry box with brass inlay." },
    ], orders: [{ id: "ORD-9V4C1H7", totalAmount: 5400 }] },
    { id: "slr-2", name: "Tara Kapoor", email: "tara@example.com", phone: "+91 97777 12121", approved: true, createdAt: "2026-02-14T11:08:00.000Z", _count: { products: 2 }, products: [
      { id: "prd-4", images: [], name: "Handwoven Silk Rug", brand: "Tara Textiles", price: 12800, originalPrice: 16000, category: "Furnishings", inStock: true, description: "Handwoven pure silk rug, 6x4 ft." },
      { id: "prd-5", images: [], name: "Velvet Cushion Covers", brand: "Tara Textiles", price: 1800, originalPrice: 1800, category: "Furnishings", inStock: true, description: "Set of two velvet cushion covers." },
    ], orders: [{ id: "ORD-5T9QX2A", totalAmount: 25600 }] },
    { id: "slr-3", name: "Arjun Nair", email: "arjun@example.com", phone: "+91 96555 43434", approved: false, createdAt: "2026-07-19T17:45:00.000Z", _count: { products: 1 }, products: [
      { id: "prd-6", images: [], name: "Marble Table Lamp", brand: "Arjun Studio", price: 8600, originalPrice: 8600, category: "Lighting", inStock: true, description: "Carved marble table lamp with brass base." },
    ], orders: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sellerDetail, setSellerDetail] = useState<Record<string, any>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`${API}/api/admin/sellers`, { headers: adminHeaders(adminKey) })
      .then(r => r.json()).then(setSellers).catch(() => {}).finally(() => setLoading(false));
  }, [adminKey]);

  const loadDetail = async (id: string) => {
    if (sellerDetail[id]) return;
    setDetailLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API}/api/admin/users/${id}`, { headers: adminHeaders(adminKey) });
      const data = await res.json();
      setSellerDetail(prev => ({ ...prev, [id]: data }));
    } catch {} finally {
      setDetailLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAccess = async (userId: string) => {
    try {
      const res = await fetch(`${API}/api/admin/impersonate/${userId}`, {
        method: "POST", headers: adminHeaders(adminKey),
      });
      if (!res.ok) return;
      const { token, user } = await res.json();
      const raw = localStorage.getItem("bt-accounts");
      const accounts = raw ? JSON.parse(raw) : [];
      const adminIdx = parseInt(localStorage.getItem("bt-current") || "0");
      accounts.push({ token, user });
      localStorage.setItem("bt-accounts", JSON.stringify(accounts));
      localStorage.setItem("bt-current", String(accounts.length - 1));
      localStorage.setItem("bt-token", token);
      setTimeout(() => {
        window.open(user.role === "SELLER" ? "/seller" : "/delivery", "_blank");
      }, 50);
      setTimeout(() => {
        localStorage.setItem("bt-current", String(adminIdx));
        localStorage.setItem("bt-token", accounts[adminIdx]?.token || "");
      }, 2000);
    } catch {}
  };

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      await fetch(`${API}/api/admin/users/${id}/approve`, {
        method: "PUT", headers: adminHeaders(adminKey), body: JSON.stringify({ approved }),
      });
      setSellers(prev => prev.map(s => s.id === id ? { ...s, approved } : s));
    } catch {}
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    await loadDetail(id);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white flex items-center gap-3"><Store className="text-gold-400" /> Sellers</h2>
      {sellers.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/60 border border-dark-800/50 rounded-2xl"><Store className="w-12 h-12 text-dark-600 mx-auto mb-3" /><p className="text-dark-400 text-sm">No sellers registered</p></div>
      ) : (
        <div className="space-y-3">
          {sellers.map((seller: any) => {
            const isExpanded = expandedId === seller.id;
            const detail = sellerDetail[seller.id];
            const products = detail?.products || [];
            return (
              <div key={seller.id} className="bg-dark-900/60 border border-dark-800/50 rounded-2xl overflow-hidden transition-all cursor-pointer hover:border-dark-700/70" onClick={() => toggleExpand(seller.id)}>
                <div className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${seller.approved ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                      {seller.approved ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{seller.name}</p>
                      <p className="text-dark-400 text-xs">{seller.email} {seller.phone ? `— ${seller.phone}` : ""}</p>
                      <p className="text-dark-500 text-[10px] mt-0.5">{seller._count?.products || 0} products</p>
                    </div>
                    <button className="shrink-0 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors pointer-events-none">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-dark-500" /> : <ChevronDown className="w-4 h-4 text-dark-500" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); handleAccess(seller.id); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all flex items-center gap-1.5">
                      <LogIn className="w-3.5 h-3.5" /> Access Account
                    </button>
                    {seller.approved ? (
                      <button onClick={(e) => { e.stopPropagation(); handleApprove(seller.id, false); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">Reject</button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleApprove(seller.id, true); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">Approve</button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-dark-800/30">
                    {detailLoading[seller.id] ? (
                      <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" /></div>
                    ) : (
                      <>
                        <div className="pt-4 space-y-1">
                          <p className="text-xs text-dark-500">Joined {new Date(seller.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                        </div>

                        <h4 className="text-xs text-purple-400 uppercase tracking-wider font-semibold mt-5 mb-3 flex items-center gap-2">
                          <ShoppingBag className="w-3.5 h-3.5" /> Products ({products.length})
                        </h4>

                        {products.length === 0 ? (
                          <p className="text-dark-500 text-xs py-4 text-center">No products listed yet</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {products.map((product: any) => {
                              const rawImgs = product.images;
                              const colorImgs = Array.isArray(product.colorOptions) ? product.colorOptions.flatMap((c: any) => Array.isArray(c.images) ? c.images : typeof c.images === "string" ? [c.images] : []) : [];
                              const effectiveImg = (Array.isArray(rawImgs) && rawImgs[0]) || colorImgs[0] || "";
                              let effectivePrice = product.price || 0;
                              if (effectivePrice <= 0 && product.sizeOptions && typeof product.sizeOptions === "object") {
                                const firstName = Array.isArray(product.colorOptions) && product.colorOptions.length > 0 ? product.colorOptions[0].name : "";
                                const firstSizes = product.sizeOptions[firstName] || Object.values(product.sizeOptions)[0] || [];
                                const withPrice = firstSizes.find((s: any) => s.price != null && s.price > 0);
                                if (withPrice && withPrice.price != null) effectivePrice = withPrice.price;
                              }
                              let effectiveOriginalPrice = product.originalPrice;
                              if (effectivePrice <= 0 || (!effectiveOriginalPrice || effectiveOriginalPrice <= effectivePrice)) {
                                if (product.sizeOptions && typeof product.sizeOptions === "object") {
                                  const firstName = Array.isArray(product.colorOptions) && product.colorOptions.length > 0 ? product.colorOptions[0].name : "";
                                  const firstSizes = product.sizeOptions[firstName] || Object.values(product.sizeOptions)[0] || [];
                                  const withOP = firstSizes.find((s: any) => s.originalPrice != null && s.originalPrice > (s.price || 0));
                                  if (withOP && withOP.originalPrice != null) effectiveOriginalPrice = withOP.originalPrice;
                                }
                              }
                              const viewUrl = product.source === "mart" ? `/mart/db-${product.id}` : `/store/db-${product.id}`;
                              return (
                              <div key={product.id} className="bg-dark-900/40 border border-dark-800/30 rounded-xl p-4 space-y-2">
                                <div className="flex items-start gap-3">
                                  {effectiveImg ? (
                                    <img src={effectiveImg} alt={product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-dark-800/50 flex items-center justify-center shrink-0">
                                      <Package className="w-5 h-5 text-dark-600" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium truncate">{product.name}</p>
                                    <p className="text-xs text-dark-400">{product.brand}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gold-400 font-semibold">{formatPrice(effectivePrice)}</span>
                                      {effectiveOriginalPrice > effectivePrice && (
                                        <span className="text-[10px] text-dark-500 line-through">{formatPrice(effectiveOriginalPrice)}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-dark-500">
                                  <span className="capitalize">{product.category}</span>
                                  <span className={`flex items-center gap-1 ${product.inStock ? "text-emerald-500" : "text-red-400"}`}>
                                    {product.inStock ? "In Stock" : "Out of Stock"}
                                  </span>
                                </div>
                                {product.description && (
                                  <p className="text-[10px] text-dark-500 line-clamp-2">{product.description}</p>
                                )}
                                <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-gold-400 hover:text-gold-300 transition-colors">
                                  <Eye className="w-3 h-3" /> View product
                                </a>
                              </div>
                              );
                            })}
                          </div>
                        )}

                        <h4 className="text-xs text-purple-400 uppercase tracking-wider font-semibold mt-5 mb-3 flex items-center gap-2">
                          <Package className="w-3.5 h-3.5" /> Orders ({detail?.orders?.length || 0})
                        </h4>

                        {(!detail?.orders || detail.orders.length === 0) ? (
                          <p className="text-dark-500 text-xs py-4 text-center">No orders from this seller&apos;s products</p>
                        ) : (
                          <div className="space-y-2">
                            {detail.orders.slice(0, 10).map((order: any) => (
                              <div key={order.id} className="bg-dark-900/40 border border-dark-800/30 rounded-xl p-4 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-dark-500 font-mono">#{order.id?.slice(0, 8)}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[order.status] || "text-dark-400 bg-dark-800/50 border-dark-700/50"}`}>{order.status}</span>
                                </div>
                                <p className="text-sm text-white font-medium">{formatPrice(order.totalAmount)}</p>
                                <p className="text-[10px] text-dark-600">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
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
