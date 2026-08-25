export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  helpful: number;
  verified: boolean;
  color?: string;
  size?: string;
}

const NAMES = [
  "Alex M.", "Jordan K.", "Sam R.", "Casey L.", "Morgan T.",
  "Riley P.", "Drew W.", "Quinn B.", "Avery N.", "Blake S.",
  "Taylor H.", "Dakota F.", "Parker J.", "Reese D.", "Skyler C.",
];

const AVATARS = [
  "bg-violet-600", "bg-blue-600", "bg-emerald-600", "bg-rose-600", "bg-amber-600",
  "bg-cyan-600", "bg-indigo-600", "bg-teal-600", "bg-pink-600", "bg-orange-600",
  "bg-sky-600", "bg-fuchsia-600", "bg-lime-600", "bg-red-600", "bg-yellow-600",
];

const TITLES_POS = [
  "Absolutely love it!", "Exceeded expectations", "Worth every penny",
  "Perfect in every way", "Best purchase this year", "Incredible quality",
  "A true masterpiece", "Couldn't be happier", "Stunning piece",
  "Top-notch craftsmanship",
];

const TITLES_MID = [
  "Good but could be better", "Decent overall", "Solid choice",
  "Meets expectations", "Fair for the price", "Pretty good",
];

const TITLES_NEG = [
  "Disappointed", "Not what I expected", "Below average",
];

const BODIES_POS = [
  "The build quality is outstanding. You can feel the premium materials the moment you pick it up. The attention to detail is remarkable — every stitch, every edge is perfect.",
  "I've been using this daily for two weeks now and it still looks brand new. The finish hasn't worn at all and the performance is consistent.",
  "This is my third purchase from BV and they never disappoint. The packaging was beautiful, the product exceeded the photos, and shipping was fast.",
  "For the price point, this is genuinely unbeatable. I compared it with competitors that cost 2x more and this holds its own easily.",
  "Got this as a gift and the recipient was thrilled. The presentation alone makes it feel special. Will definitely buy more.",
  "The design is sleek and modern without being trendy. It's the kind of piece that will look just as good in five years.",
  "I was skeptical ordering online but this completely won me over. The color, the weight, the feel — everything is spot on.",
  "Stopped me in my tracks when I opened the box. The quality jump from my old one is night and day.",
];

const BODIES_MID = [
  "It's a solid product for the price. Nothing mind-blowing but it does what it promises. Build quality is decent.",
  "Good quality overall. The color is slightly different from the photos but still looks nice. Shipping was on time.",
  "Does the job well. I have some minor complaints about the fit but nothing deal-breaking. Would recommend with caveats.",
  "Nice design and comfortable. Only giving 4 stars because the packaging could be better. Product itself is great.",
  "Pretty good for everyday use. Not luxury-tier but you're not paying luxury prices either. Fair deal.",
];

const BODIES_NEG = [
  "Expected better quality for this price. The material feels cheaper than described and the stitching is uneven in places.",
  "The product itself is fine but the sizing runs small. Had to go one size up. Wish the listing was clearer about this.",
];

const COLORS = ["Black", "Silver", "Gold", "White", "Navy", "Brown", "Grey"];
const SIZES = ["XS", "S", "M", "L", "XL", "7", "8", "9", "10", "11"];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function getProductReviews(productId: string): Review[] {
  const rand = seededRandom(
    productId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  );
  const count = Math.floor(rand() * 6) + 5;
  const reviews: Review[] = [];

  for (let i = 0; i < count; i++) {
    const r = rand();
    let rating: number;
    let title: string;
    let body: string;

    if (r > 0.3) {
      rating = 5;
      title = TITLES_POS[Math.floor(rand() * TITLES_POS.length)];
      body = BODIES_POS[Math.floor(rand() * BODIES_POS.length)];
    } else if (r > 0.1) {
      rating = 4;
      title = TITLES_MID[Math.floor(rand() * TITLES_MID.length)];
      body = BODIES_MID[Math.floor(rand() * BODIES_MID.length)];
    } else {
      rating = rand() > 0.5 ? 3 : 2;
      title = TITLES_NEG[Math.floor(rand() * TITLES_NEG.length)];
      body = BODIES_NEG[Math.floor(rand() * BODIES_NEG.length)];
    }

    const nameIdx = Math.floor(rand() * NAMES.length);
    const daysAgo = Math.floor(rand() * 90);

    reviews.push({
      id: `r-${productId}-${i}`,
      author: NAMES[nameIdx],
      avatar: AVATARS[nameIdx],
      rating,
      date: new Date(Date.now() - daysAgo * 86400000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      title,
      body,
      helpful: Math.floor(rand() * 40),
      verified: rand() > 0.15,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      size: SIZES[Math.floor(rand() * SIZES.length)],
    });
  }

  return reviews.sort((a, b) => {
    if (a.rating !== b.rating) return b.rating - a.rating;
    return b.helpful - a.helpful;
  });
}

export function getReviewStats(reviews: Review[]) {
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const dist = [0, 0, 0, 0, 0];
  for (const r of reviews) dist[r.rating - 1]++;
  return { total, avg, dist };
}
