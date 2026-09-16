const { PrismaClient } = require("D:/sites/BATRAVERSE/server/node_modules/.prisma/client");
const prisma = new PrismaClient();

/* Store products: [name, brand, priceFrom, priceTo, imgKeys, parentCatSlug] */
const STORE_SUBS = {
  "smart": {
    cat: "watches",
    items: [
      ["Galaxy Watch Ultra 47mm", "Samsung", 34000, 38000, ["smartwatch", "watch"]],
      ["Apple Watch Series 10 GPS", "Apple", 39000, 43000, ["smartwatch", "watch"]],
      ["Storm 2 Pro Smartwatch", "Fire-Boltt", 1200, 1600, ["smartwatch"]],
      ["Noise ColorFit Pro 5", "Noise", 1400, 1800, ["smartwatch"]],
      ["Active Smartwatch Fitness", "Amazfit", 5000, 6000, ["smartwatch", "fitness"]],
    ],
  },
  "analog": {
    cat: "watches",
    items: [
      ["Heritage Chronograph Watch", "Titan", 2400, 3000, ["chronograph", "watch"]],
      ["Classic Leather Analog", "Fossil", 6500, 7500, ["watch", "leather"]],
      ["Minimalist Mesh Dial Watch", "Daniel Wellington", 9500, 11000, ["watch", "mesh"]],
      ["Oversized Analog Watch", "Timex", 1500, 2000, ["watch", "analog"]],
      ["Silver Tone Dress Watch", "Armani Exchange", 9000, 10000, ["watch", "silver"]],
      ["Automatic Skeleton Watch", "Seiko", 18000, 20000, ["skeleton", "watch"]],
    ],
  },
  "luxury": {
    cat: "watches",
    items: [
      ["Presage Automatic Watch", "Seiko", 35000, 40000, ["luxury", "watch"]],
      ["Eco-Drive Titanium", "Citizen", 28000, 32000, ["luxury", "watch"]],
      ["Premier B01 Chrono", "Tissot", 48000, 55000, ["chronograph", "watch"]],
      ["Sapphire Crystal Gold Watch", "Rado", 75000, 85000, ["gold", "watch"]],
    ],
  },
  "sport": {
    cat: "watches",
    items: [
      ["Rugged Sport Digital Watch", "Casio", 2000, 2800, ["sport", "watch"]],
      ["Waterproof Swim Watch", "Speedo", 3000, 3800, ["swim", "watch"]],
      ["Trail GPS Sport Watch", "Garmin", 30000, 35000, ["gps", "watch"]],
    ],
  },
  "pilot": {
    cat: "watches",
    items: [
      ["Aviator Pilot Chronograph", "Stuhrling", 15000, 18000, ["aviator", "watch"]],
      ["Flieger Pilot Watch", "Invicta", 12000, 15000, ["pilot", "watch"]],
      ["Vintage Pilot GMT", "Laco", 20000, 24000, ["pilot", "watch"]],
    ],
  },
  "t-shirts": {
    cat: "fashion",
    items: [
      ["Classic Crew Neck Tee", "Uniqlo", 600, 800, ["t-shirt", "tee"]],
      ["Graphic Print Tee", "H&M", 700, 900, ["t-shirt", "graphic"]],
      ["Essential Cotton Tee", "Nike", 1000, 1200, ["t-shirt", "cotton"]],
      ["Striped Oxford Tee", "Tommy Hilfiger", 1600, 1800, ["tee", "striped"]],
      ["Oversized Street Tee", "Puma", 1000, 1400, ["t-shirt", "street"]],
    ],
  },
  "shirts": {
    cat: "fashion",
    items: [
      ["Slim Fit Formal Shirt", "Louis Philippe", 1400, 1700, ["formal", "shirt"]],
      ["Checked Casual Shirt", "Raymond", 1500, 1800, ["shirt", "checked"]],
      ["Linen Summer Shirt", "Van Heusen", 1300, 1600, ["linen", "shirt"]],
      ["Oxford Everyday Shirt", "U.S. Polo Assn", 1200, 1500, ["oxford", "shirt"]],
      ["Crisp White Dress Shirt", "Allen Solly", 1100, 1400, ["white", "shirt"]],
    ],
  },
  "jerseys": {
    cat: "fashion",
    items: [
      ["Team BioK Colored Rugby", "AQLN", 2359, 3000, ["jersey", "team"]],
      ["Pro Match Football Jersey", "Nike", 2700, 3000, ["football", "jersey"]],
      ["Retro Basketball Jersey", "Adidas", 2200, 2600, ["basketball", "jersey"]],
      ["Vintage Cycling Jersey", "Castelli", 3500, 4200, ["cycling", "jersey"]],
    ],
  },
  "jackets": {
    cat: "fashion",
    items: [
      ["Denim Trucker Jacket", "Levi's", 3000, 3500, ["denim", "jacket"]],
      ["Leather Biker Jacket", "Jack & Jones", 5500, 6500, ["leather", "jacket"]],
      ["Puffer Winter Jacket", "North Face", 8000, 9000, ["puffer", "jacket"]],
      ["Bomber Windbreaker", "H&M", 2500, 3000, ["bomber", "jacket"]],
      ["Waterproof Rain Jacket", "Decathlon", 1800, 2200, ["rain", "jacket"]],
    ],
  },
  "dresses": {
    cat: "fashion",
    items: [
      ["Floral Summer Dress", "Mango", 2200, 2600, ["floral", "dress"]],
      ["Wrap Midi Dress", "H&M", 2500, 3000, ["dress", "mango"]],
      ["Evening Gown", "Forever 21", 4000, 4800, ["gown", "evening"]],
      ["Bodycon Party Dress", "Zara", 3200, 3800, ["dress", "party"]],
      ["Slip Satin Dress", "Brand B", 2800, 3400, ["satin", "dress"]],
    ],
  },
  "ethnic": {
    cat: "fashion",
    items: [
      ["Silk Banarasi Saree", "Fabindia", 4500, 5500, ["saree", "silk"]],
      ["Men's Kurta Pajama", "Raymond", 1800, 2200, ["kurta", "ethnic"]],
      ["Embroidered Lehenga", "Manish Malhotra", 12000, 15000, ["lehenga", "bridal"]],
      ["Cotton Anarkali Suit", "BIBA", 2800, 3400, ["anarkali", "suit"]],
      ["Chikankari Kurta", "Taneira", 2000, 2500, ["kurti", "chikan"]],
    ],
  },
  "bags": {
    cat: "accessories",
    items: [
      ["Travel Duffle Bag", "Wildcraft", 1800, 2200, ["duffel", "bag"]],
      ["Backpack Laptop 15.6", "American Tourister", 2000, 2600, ["backpack"]],
      ["Tote Leather Bag", "Hidesign", 3800, 4500, ["tote", "bag"]],
      ["Shoulder Crossbody", "Baggit", 1500, 1900, ["crossbody", "bag"]],
      ["Sling Messenger Bag", "Safari", 1200, 1500, ["messenger", "bag"]],
    ],
  },
  "belts": {
    cat: "accessories",
    items: [
      ["Genuine Leather Belt", "Tommy Hilfiger", 1600, 1900, ["leather", "belt"]],
      ["Reversible Suede Belt", "Hidesign", 1200, 1500, ["suede", "belt"]],
      ["Auto Lock Webbing Belt", "Decathlon", 400, 550, ["webbing", "belt"]],
      ["Stitched Formal Belt", "Woodland", 900, 1200, ["formal", "belt"]],
    ],
  },
  "sunglasses": {
    cat: "accessories",
    items: [
      ["Aviator Polarized Sunglasses", "Ray-Ban", 5500, 6200, ["aviator", "sunglasses"]],
      ["Round Retro Shades", "Tom Ford", 11000, 12000, ["round", "sunglasses"]],
      ["Sport Wrap Sunglasses", "Oakley", 4000, 4800, ["sport", "sunglasses"]],
      ["Cat Eye Fashion Glasses", "Vogue Eyewear", 3500, 4200, ["sunglasses", "women"]],
    ],
  },
  "hats": {
    cat: "accessories",
    items: [
      ["Structured Snapback Cap", "Nike", 1200, 1500, ["snapback", "cap"]],
      ["6-Panel Cotton Cap", "Adidas", 900, 1200, ["cap", "cotton"]],
      ["Bucket Sun Hat", "Uniqlo", 800, 1000, ["bucket", "hat"]],
      ["Wool Beanie Winter Cap", "H&M", 600, 800, ["beanie", "winter"]],
    ],
  },
  "wallets": {
    cat: "accessories",
    items: [
      ["Bifold RFID Wallet", "Fossil", 2200, 2800, ["wallet", "leather"]],
      ["Slim Card Wallet", "Tommy Hilfiger", 1800, 2200, ["wallet", "card"]],
      ["Money Clip Wallet", "Hugo Boss", 3200, 3800, ["wallet", "money"]],
      ["Minimalist Front Pocket", "Safari", 1100, 1400, ["wallet", "minimal"]],
    ],
  },
  "sneakers": {
    cat: "footwear",
    items: [
      ["Air Max 90 Sneaker", "Nike", 11000, 13000, ["sneakers"]],
      ["Ultraboost Running", "Adidas", 12000, 14000, ["running", "sneakers"]],
      ["Chuck Taylor All Star", "Converse", 4000, 5000, ["converse", "canvas"]],
      ["Panda Classic Sneakers", "New Balance", 6000, 7000, ["sneakers", "classic"]],
      ["Court Retro Low", "Puma", 3500, 4000, ["court", "sneakers"]],
    ],
  },
  "formal": {
    cat: "footwear",
    items: [
      ["Derby Leather Shoes", "Clarks", 4500, 5200, ["derby", "shoes"]],
      ["Oxford Lace Up", "Woodland", 4000, 4800, ["oxford", "shoes"]],
      ["Loafers Slip On", "Hush Puppies", 3800, 4500, ["loafers"]],
      ["Elegant Monk Strap", "Bata", 2500, 3000, ["monk", "shoes"]],
    ],
  },
  "sandals": {
    cat: "footwear",
    items: [
      ["Comfort Slide Sandals", "Skechers", 2000, 2400, ["sandals", "slide"]],
      ["Sport Flip Flops", "Adidas", 1200, 1500, ["flip", "flops"]],
      ["Buckle Leather Sandals", "Woodland", 3000, 3600, ["leather", "sandals"]],
      ["Waterproof Beach Sandals", "Crocs", 900, 1200, ["crocs", "beach"]],
    ],
  },
  "boots": {
    cat: "footwear",
    items: [
      ["Leather Chelse Boot", "Steve Madden", 7000, 8000, ["chelsea", "boot"]],
      ["Ankle Boot High Heel", "Zara", 4500, 5200, ["ankle", "boot"]],
      ["Waterproof Hiking Boots", "Quechua", 3500, 4200, ["hiking", "boots"]],
      ["Industrial Work Boots", "Timberland", 9000, 10500, ["work", "boots"]],
    ],
  },
  "sports": {
    cat: "footwear",
    items: [
      ["Court Play Running Shoes", "Nike", 5000, 5800, ["running", "shoes"]],
      ["Medal Running Series", "Asics", 4500, 5200, ["running", "shoes"]],
      ["Nitro Walking Shoes", "Puma", 3800, 4300, ["walking", "shoes"]],
      ["Gravity Tennis Shoes", "Adidas", 5500, 6200, ["tennis", "shoes"]],
    ],
  },
  "headphones": {
    cat: "tech",
    items: [
      ["WH-1000XM5 Wireless ANC", "Sony", 30000, 33000, ["headphones", "sony"]],
      ["AirPods Pro 2", "Apple", 24000, 26000, ["airpods"]],
      ["JBL Tune 770NC", "JBL", 8000, 9000, ["headphones", "jbl"]],
      ["Over Ear Studio Headphones", "Beats", 19000, 21000, ["headphones", "studio"]],
    ],
  },
  "speakers": {
    cat: "tech",
    items: [
      ["Flip 6 Portable Speaker", "JBL", 9000, 10000, ["speaker", "jbl"]],
      ["HomePod Mini", "Apple", 9900, 11000, ["speaker", "smart"]],
      ["SoundLink Flex BT", "Bose", 12000, 13500, ["speaker", "bose"]],
      ["Mega Boom 3", "Ultimate Ears", 18000, 20000, ["speaker", "portable"]],
    ],
  },
  "cameras": {
    cat: "tech",
    items: [
      ["EOS R50 Mirrorless", "Canon", 65000, 70000, ["camera", "mirrorless"]],
      ["Z50 Mirrorless", "Nikon", 75000, 82000, ["camera", "nikon"]],
      ["Instax Mini 12", "Fujifilm", 6500, 7500, ["instax", "camera"]],
      ["GoPro HERO12", "GoPro", 35000, 38000, ["action", "camera"]],
      ["Cyber-shot Powershot", "Sony", 28000, 31000, ["camera", "compact"]],
    ],
  },
  "wearables": {
    cat: "tech",
    items: [
      ["Smart Band 9 Pro", "Mi", 2500, 3200, ["smartband"]],
      ["Beat XP Smart Watch", "Noise", 2000, 2600, ["smartwatch"]],
      ["Health Ring Ultra", "Oura", 30000, 35000, ["smart", "ring"]],
    ],
  },
  "gadgets": {
    cat: "tech",
    items: [
      ["USB C Dock Pro", "Anker", 12000, 14000, ["dock", "usbc"]],
      ["Portable SSD 1TB", "Samsung", 9500, 11000, ["ssd", "portable"]],
      ["E-reader 6-inch", "Amazon Kindle", 10000, 11000, ["kindle"]],
      ["Mini Projector HD", "Yaber", 15000, 17000, ["projector", "mini"]],
    ],
  },
  "home-decor": {
    cat: "lifestyle",
    items: [
      ["Scented Candle Jar", "Jo Malone", 3500, 4200, ["candle", "scent"]],
      ["Terracotta Vase Set", "H&M Home", 1800, 2200, ["vase", "terracotta"]],
      ["Wall Art Canvas Print", "Fy!", 1200, 1600, ["canvas", "wall"]],
      ["LED String Lights", "Philips", 800, 1000, ["lights", "string"]],
    ],
  },
  "fragrances": {
    cat: "lifestyle",
    items: [
      ["Sauvage EDP 100ml", "Dior", 8800, 9500, ["perfume", "dior"]],
      ["Bleu de Chanel EDP", "Chanel", 11000, 12000, ["perfume", "chanel"]],
      ["Acqua Di Gio", "Armani", 9000, 9800, ["perfume", "armani"]],
      ["Adventure EDT", "Davidoff", 3800, 4500, ["perfume", "male"]],
    ],
  },
  "stationery": {
    cat: "lifestyle",
    items: [
      ["Premium Fountain Pen", "Parker", 4200, 5000, ["fountain", "pen"]],
      ["Bullet Journal Grid", "Linc", 800, 1100, ["journal", "notebook"]],
      ["Mechanical Pencil Set", "Faber-Castell", 900, 1300, ["pencil", "mechanical"]],
      ["Elegant Gift Notebook", "Moleskine", 2200, 2800, ["notebook", "moleskine"]],
    ],
  },
  "fitness": {
    cat: "lifestyle",
    items: [
      ["Adjustable Dumbbell Pair", "Boldfit", 4500, 5200, ["dumbbell"]],
      ["Pro Yoga Mat", "Tiger", 1200, 1500, ["yoga", "mat"]],
      ["Resistance Band Set", "Kerala", 800, 1000, ["resistance", "band"]],
      ["Smart Skip Rope", "Heimlig", 900, 1200, ["skipping", "rope"]],
      ["Kettlebells 12kg", "Bull", 2400, 3000, ["kettlebell"]],
    ],
  },
  "collector-edition": {
    cat: "limited",
    items: [
      ["LEGO Star Wars Ultimate", "LEGO", 55000, 60000, ["lego", "starwars"]],
      ["Hot Wheels Collector Set", "Mattel", 3000, 3800, ["hotwheels"]],
      ["Comic Book 1st Edition", "Marvel", 2500, 3200, ["comic", "book"]],
    ],
  },
  "collabs": {
    cat: "limited",
    items: [
      ["Off-White x Nike Air Force", "Off-White", 45000, 50000, ["sneakers", "offwhite"]],
      ["Supreme x TNF Jacket", "Supreme", 24000, 28000, ["jacket", "supreme"]],
      ["Cartier x Graffiti Watch", "Cartier", 150000, 160000, ["luxury", "watch"]],
    ],
  },
  "rare-finds": {
    cat: "limited",
    items: [
      ["Vintage 1970 Chronograph", "Heuer", 90000, 100000, ["vintage", "watch"]],
      ["Diamond Tennis Bracelet", "Tiffany", 120000, 140000, ["bracelet", "diamond"]],
      ["Limited Gold Nugget Coin", "MMTC", 65000, 72000, ["gold", "coin"]],
    ],
  },
};

/* Mart products: [name, brand, priceFrom, priceTo, imgKeys, parentCatSlug] */
const MART_SUBS = {
  "fruits": { cat: "fruits", items: [
    ["Red Delicious Apples 1kg", "Fresho", 180, 220, ["apples"]],
    ["Organic Bananas 1kg", "Fresho", 60, 80, ["bananas"]],
    ["Sweet Watermelon 1pc", "Fresho", 110, 150, ["watermelon"]],
    ["Seedless Grapes 500g", "Fresho", 130, 170, ["grapes"]],
  ]},
  "veggies": { cat: "fruits", items: [
    ["Farm Fresh Tomatoes 1kg", "Fresho", 40, 60, ["tomatoes"]],
    ["Potatoes 2kg", "Fresho", 60, 80, ["potatoes"]],
    ["Fresh Spinach 500g", "Fresho", 25, 35, ["spinach"]],
    ["Broccoli 2pcs", "Farmstand", 120, 160, ["broccoli"]],
  ]},
  "exotic": { cat: "fruits", items: [
    ["Dragon Fruit 1pc", "Fresho", 130, 170, ["dragonfruit"]],
    ["Avocado 2pcs", "Fresho", 180, 230, ["avocado"]],
    ["Blueberries 150g", "Safal", 350, 420, ["blueberries"]],
  ]},
  "milk": { cat: "dairy", items: [
    ["Whole Milk 1L", "Amul", 66, 72, ["milk"]],
    ["Toned Milk 500ml", "Mother Dairy", 33, 36, ["milk", "pack"]],
    ["Buffalo Milk 500ml", "Mahanand", 42, 46, ["milk", "buffalo"]],
    ["A2 Organic Milk 1L", "Country Delight", 140, 160, ["milk", "organic"]],
  ]},
  "butter": { cat: "dairy", items: [
    ["Table Butter 500g", "Amul", 265, 285, ["butter"]],
    ["Unsalted Butter 250g", "Britannia", 135, 150, ["butter", "unsalted"]],
    ["Cooking Butter 200g", "Mother Dairy", 105, 120, ["butter", "cooking"]],
  ]},
  "paneer": { cat: "dairy", items: [
    ["Fresh Paneer 200g", "Amul", 88, 95, ["paneer"]],
    ["Malai Paneer 400g", "Mother Dairy", 165, 180, ["paneer", "malai"]],
  ]},
  "curd": { cat: "dairy", items: [
    ["Fresh Curd 400g", "Amul", 75, 85, ["curd", "yogurt"]],
    ["Greek Yogurt 250g", "Yakult", 140, 160, ["greek", "yogurt"]],
    ["Flavored Curd 100g", "Britannia", 30, 40, ["curd", "flavored"]],
  ]},
  "cheese": { cat: "dairy", items: [
    ["Processed Cheese Slices 200g", "Amul", 150, 165, ["cheese", "slices"]],
    ["Mozzarella Block 200g", "Britannia", 185, 200, ["mozzarella"]],
    ["Cheddar Spread 160g", "Nutrine", 130, 145, ["cheddar", "cheese"]],
  ]},
  "bread": { cat: "dairy", items: [
    ["Whole Wheat Bread 400g", "Britannia", 40, 50, ["bread", "whole"]],
    ["Multigrain Bread 450g", "Bake King", 70, 80, ["multigrain", "bread"]],
    ["Milk Bread 300g", "Modern", 55, 65, ["milk", "bread"]],
    ["Brown Bread 350g", "English Oven", 45, 55, ["brown", "bread"]],
  ]},
  "chips": { cat: "snacks", items: [
    ["Classic Salted Chips 90g", "Lay's", 20, 30, ["chips", "lays"]],
    ["Masala Magic Chips", "Kurkure", 20, 30, ["chips", "masala"]],
    ["Potato Wafers Sour Cream", "Balaji", 25, 35, ["chips", "sourcream"]],
  ]},
  "biscuits": { cat: "snacks", items: [
    ["Marie Gold Biscuits", "Parle", 30, 35, ["biscuits"]],
    ["Oreo Sandwich 120g", "Cadbury", 40, 50, ["oreo"]],
    ["Good Day Cashew 200g", "Britannia", 55, 65, ["biscuit", "cashew"]],
  ]},
  "namkeen": { cat: "snacks", items: [
    ["Aloo Bhujia 200g", "Haldiram's", 70, 85, ["bhujia", "namkeen"]],
    ["Moong Dal Mixture", "Haldiram's", 80, 95, ["mixture"]],
    ["Peanut Masala 200g", "Navratna", 60, 75, ["peanut", "masala"]],
  ]},
  "dry-fruits": { cat: "snacks", items: [
    ["Almonds 250g", "Whole Earth", 320, 380, ["almonds"]],
    ["Cashew W240 250g", "Nutraj", 340, 400, ["cashews"]],
    ["Raisins 200g", "Whole Earth", 180, 220, ["raisins"]],
    ["Walnuts 250g", "Nutraj", 450, 520, ["walnuts"]],
  ]},
  "chocolate": { cat: "snacks", items: [
    ["Silk Rich Cocoa Bar 135g", "Cadbury", 290, 320, ["chocolate", "cadbury"]],
    ["Lindt Excellence Dark", "Lindt", 220, 260, ["chocolate", "lindt"]],
    ["Ferrero Rocher 50g", "Ferrero", 155, 180, ["ferrero"]],
    ["Kit Kat 38g", "Nestle", 20, 25, ["kitkat"]],
  ]},
  "juices": { cat: "beverages", items: [
    ["Orange Juice 1L", "Tropicana", 120, 140, ["orange", "juice"]],
    ["Mango Juice 1L", "Real", 110, 130, ["mango", "juice"]],
    ["Mixed Fruit Juice 1L", "Minute Maid", 100, 120, ["juice", "fruit"]],
  ]},
  "tea": { cat: "beverages", items: [
    ["Assam Tea 500g", "Taj Mahal", 135, 155, ["tea", "assam"]],
    ["Green Tea 100g", "Lipton", 90, 110, ["green", "tea"]],
    ["Masala Chai 250g", "Wagh Bakri", 120, 140, ["masala", "tea"]],
    ["Darjeeling 250g", "Twinings", 380, 420, ["darjeeling", "tea"]],
  ]},
  "coffee": { cat: "beverages", items: [
    ["Instant Coffee 50g", "Nescafe", 200, 230, ["coffee", "nescafe"]],
    ["Brew 100g", "Bru", 230, 260, ["coffee", "bru"]],
    ["Cold Brew Concentrate 1L", "Cold Coffee Club", 320, 380, ["coldbrew"]],
    ["Espresso Beans 250g", "Blue Tokai", 450, 520, ["coffee", "beans"]],
  ]},
  "soft-drinks": { cat: "beverages", items: [
    ["Cola Can 330ml", "Coca-Cola", 35, 40, ["coke", "can"]],
    ["Sprite Bottle 600ml", "Coca-Cola", 40, 45, ["sprite"]],
    ["Pepsi Black 1.5L", "Pepsi", 60, 70, ["pepsi", "bottle"]],
  ]},
  "water": { cat: "beverages", items: [
    ["Mineral Water 1L", "Himalayan", 20, 25, ["water", "bottle"]],
    ["Packaged Water 500ml", "Kinely", 12, 15, ["water", "pack"]],
  ]},
  "noodles": { cat: "instant", items: [
    ["2-Minute Masala Noodles", "Maggi", 28, 33, ["maggi", "noodles"]],
    ["Veg Noodles Cup", "Yippee", 18, 22, ["noodles", "cup"]],
    ["Instant Ramen 116g", "Top Ramen", 32, 40, ["ramen"]],
  ]},
  "pasta": { cat: "instant", items: [
    ["Penne Pasta 500g", "Colavita", 120, 140, ["pasta", "penne"]],
    ["Macaroni 500g", "Cremica", 90, 110, ["pasta"]],
    ["Spaghetti 500g", "Barilla", 150, 170, ["spaghetti"]],
  ]},
  "ready-to-eat": { cat: "instant", items: [
    ["Chana Masala Pouch", "MTR", 130, 150, ["chana", "ready"]],
    ["Rajma Curry Pouch", "Gits", 120, 140, ["rajma"]],
    ["Idli Mix 1kg", "MTR", 110, 130, ["idli", "mix"]],
  ]},
  "breakfast": { cat: "instant", items: [
    ["Corn Flakes 450g", "Kellogg's", 220, 250, ["cornflakes"]],
    ["Oats 1kg", "Quaker", 280, 320, ["oats"]],
    ["Muesli 500g", "Kellogg's", 300, 340, ["muesli"]],
    ["Poha Mix 500g", "Haldiram's", 90, 110, ["poha"]],
  ]},
  "hair-care": { cat: "personal", items: [
    ["Dandruff Shampoo 350ml", "Head & Shoulders", 340, 380, ["shampoo", "dandruff"]],
    ["Damage Repair Shampoo 200ml", "Pantene", 220, 250, ["shampoo", "repair"]],
    ["Hair Serum 60ml", "L'Oreal Paris", 330, 370, ["hair", "serum"]],
    ["Argan Oil 100ml", "Moroccanoil", 850, 950, ["hair", "oil"]],
  ]},
  "skin-care": { cat: "personal", items: [
    ["Face Wash 100g", "Cetaphil", 320, 360, ["facewash"]],
    ["Neem Moisturizer 150ml", "Himalaya", 180, 210, ["moisturizer", "neem"]],
    ["Vitamin C Serum 30ml", "Minimalist", 400, 450, ["serum", "vitc"]],
    ["Sunscreen SPF50 50ml", "Lotus", 280, 320, ["sunscreen"]],
  ]},
  "oral-care": { cat: "personal", items: [
    ["Total Protection Paste 150g", "Colgate", 120, 140, ["toothpaste", "colgate"]],
    ["Whitening Paste 150g", "Oral-B", 140, 160, ["toothpaste", "whitening"]],
    ["Mouthwash 250ml", "Listerine", 180, 210, ["mouthwash"]],
    ["Magic Brush Soft", "Brite", 40, 50, ["toothbrush"]],
  ]},
  "bath": { cat: "personal", items: [
    ["Cream Bath Bar 100g", "Dove", 60, 70, ["dove", "soap"]],
    ["Body Wash 250ml", "Nivea", 220, 250, ["bodywash"]],
    ["Sandal Soap 100g", "Mysore", 45, 55, ["sandal", "soap"]],
  ]},
  "deodorants": { cat: "personal", items: [
    ["Deo Body Spray 150ml", "Fogg", 180, 210, ["deodorant", "spray"]],
    ["Roll-On 24h 50ml", "Nivea", 160, 190, ["deo", "rollon"]],
    ["Perfume Deo 100ml", "Denver", 230, 260, ["deodorant", "perfume"]],
  ]},
  "detergent": { cat: "cleaning", items: [
    ["Detergent Powder 1kg", "Surf Excel", 120, 140, ["detergent", "powder"]],
    ["Liquid Detergent 900ml", "Tide", 220, 250, ["detergent", "liquid"]],
    ["Cloth Whitener 500ml", "Ujala", 90, 110, ["whitener"]],
  ]},
  "dishwash": { cat: "cleaning", items: [
    ["Dishwash Liquid 500ml", "Vim", 90, 105, ["dishwash", "liquid"]],
    ["Dishwash Gel 750ml", "Pril", 150, 175, ["dishwash", "gel"]],
    ["Scrub Pads 8pcs", "Scotch-Brite", 60, 75, ["scrubber", "pad"]],
  ]},
  "floor-cleaner": { cat: "cleaning", items: [
    ["Floor Cleaner 2L", "Lizol", 180, 210, ["floor", "cleaner"]],
    ["Wood Floor Polish 1L", "Pronto", 240, 280, ["floor", "polish"]],
    ["Bathroom Cleaner 500ml", "Harpic", 140, 165, ["toilet", "cleaner"]],
  ]},
  "freshener": { cat: "cleaning", items: [
    ["Air Freshener Spray", "Odonil", 90, 110, ["air", "freshener"]],
    ["Gel Room Freshener", "Odonil", 70, 85, ["gel", "freshener"]],
    ["Car Freshener Clip", "Godrej", 100, 125, ["car", "freshener"]],
  ]},
  "cakes": { cat: "bakery", items: [
    ["Chocolate Truffle Cake 500g", "Monginis", 450, 520, ["chocolate", "cake"]],
    ["Red Velvet Cake 400g", "Theobroma", 600, 680, ["redvelvet", "cake"]],
    ["Vanilla Cream Cake 500g", "English Oven", 380, 440, ["vanilla", "cake"]],
  ]},
  "cookies": { cat: "bakery", items: [
    ["Choco Chip Cookies 200g", "Cadbury", 90, 105, ["chocolate", "cookie"]],
    ["Butter Cookies 300g", "Britannia", 110, 130, ["butter", "cookies"]],
    ["Oatmeal Raisin Cookies", "True Elements", 180, 210, ["oatmeal", "cookie"]],
  ]},
  "breads": { cat: "bakery", items: [
    ["Sourdough Loaf 400g", "Paul", 160, 190, ["sourdough"]],
    ["Multigrain Loaf 400g", "Theobroma", 140, 170, ["multigrain", "bread"]],
    ["Croissants 6pcs", "Paul", 220, 260, ["croissant"]],
  ]},
  "pastries": { cat: "bakery", items: [
    ["Fruit Pastry 1pc", "Monginis", 60, 75, ["fruit", "pastry"]],
    ["Choco Eclair 2pcs", "English Oven", 90, 110, ["eclair"]],
    ["Cream Puff 2pcs", "French Toast", 80, 100, ["cream", "puff"]],
  ]},
};

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function makeFeatures(catSlug) {
  const m = {
    tech: ["Fast charging", "Noise isolation", "Durable build"],
    watches: ["Water resistant", "Scratch resistant", "Precision movement"],
    fashion: ["Breathable fabric", "Wrinkle free", "Easy care"],
    footwear: ["Cushioned sole", "Lightweight", "Grippy outsole"],
    accessories: ["Sturdy zippers", "Premium stitching", "Lightweight"],
    lifestyle: ["Eco friendly", "Long lasting", "Premium finish"],
    limited: ["Numbered edition", "Gift-ready box", "Authentic certificate"],
    fruits: ["Farm fresh", "Naturally ripened", "Pesticide-free"],
    dairy: ["Fresh daily", "Rich taste", "Hygienically packed"],
    snacks: ["Crispy texture", "No trans-fat", "Great taste"],
    beverages: ["Refreshing", "No artificial colour", "Premium blend"],
    instant: ["Quick to cook", "Tasty", "Convenient pack"],
    personal: ["Gentle formula", "Paraben-free", "Cruelty-free"],
    cleaning: ["Streak-free shine", "Powerful formula", "Mild fragrance"],
  };
  return m[catSlug] || ["Premium quality", "Best price", "Trusted brand"];
}

async function main() {
  const seller = await prisma.user.findFirst({ where: { role: "SELLER", approved: true } });
  if (!seller) { console.log("No approved seller."); process.exit(1); }
  console.log("Seller:", seller.name, "(" + seller.email + ")");

  /* ── Store products (target 300) ── */
  const storeData = [];
  const storeKeys = Object.keys(STORE_SUBS);
  const subSlugs = storeKeys.filter(k => STORE_SUBS[k].items.length > 0);
  const SIZES = { "t-shirts": ["S","M","L","XL"], "shirts": ["M","L","XL"], "jerseys": ["S","M","L","XL"],
    "jackets": ["S","M","L","XL"], "dresses": ["S","M","L"], "ethnic": ["S","M","L","XL"],
    "sneakers": [6,7,8,9,10], "formal": [7,8,9,10], "sandals": [6,7,8,9], "boots": [7,8,9,10], "sports": [7,8,9,10] };
  const COLORS = { watches: ["Black","Silver","Gold"], fashion: ["Black","Navy","White"], footwear: ["Black","White","Grey"],
    accessories: ["Black","Brown","Navy"] };
  let idx = 0;
  while (storeData.length < 300) {
    const subSlug = subSlugs[idx % subSlugs.length];
    const sub = STORE_SUBS[subSlug];
    const entryIdx = Math.floor(idx / subSlugs.length) % sub.items.length;
    const [name, brand, lo, hi, keys] = sub.items[entryIdx];
    const catSlug = sub.cat;
    const sizePool = SIZES[subSlug] || null;
    const colorPool = COLORS[catSlug] || null;
    const sz = sizePool ? sizePool[storeData.length % sizePool.length] : null;
    const cl = colorPool ? colorPool[Math.floor(idx / subSlugs.length) % colorPool.length] : null;
    const suffix = [sz, cl].filter(Boolean).join(", ");
    const price = randInt(lo, hi) + 0.99;
    storeData.push({
      name: suffix ? `${name} (${suffix})` : name,
      brand, category: catSlug, subCategory: subSlug, source: "store",
      price, originalPrice: Math.round(price * (randInt(112, 135) / 100)),
      description: `${name} by ${brand} — premium quality. Buy on BATRAVERSE.`,
      images: [`https://loremflickr.com/600/750/${keys.join(",")}?lock=sv${storeData.length}`],
      colorOptions: [], sizeOptions: {},
      specifications: [{ label: "Brand", value: brand }, { label: "Condition", value: "New" }],
      keyFeatures: makeFeatures(catSlug),
      badge: Math.random() > 0.55 ? ["Bestseller","New Arrival","Trending"][randInt(0,2)] : null,
      inStock: true, status: "approved", sellerId: seller.id,
      rating: randInt(38, 48) / 10, reviewCount: randInt(15, 400),
    });
    idx++;
  }

  /* ── Mart products (target 100) ── */
  const martData = [];
  const martKeys = Object.keys(MART_SUBS).filter(k => MART_SUBS[k].items.length > 0);
  let mi = 0;
  while (martData.length < 100) {
    const subSlug = martKeys[mi % martKeys.length];
    const sub = MART_SUBS[subSlug];
    const entryIdx = Math.floor(mi / martKeys.length) % sub.items.length;
    const [name, brand, lo, hi, keys] = sub.items[entryIdx];
    const catSlug = sub.cat;
    const price = randInt(lo, hi) + 0.75;
    martData.push({
      name, brand, category: catSlug, subCategory: subSlug, source: "mart",
      price, originalPrice: Math.round(price * (randInt(112, 135) / 100)),
      description: `${name} by ${brand} — fresh on BATRAVERSE Mart.`,
      images: [`https://loremflickr.com/600/750/${keys.join(",")}?lock=mv${martData.length}`],
      colorOptions: [], sizeOptions: {},
      specifications: [{ label: "Brand", value: brand }, { label: "Weight", value: name.match(/\d+\w*$/)?.[0] || "1 pack" }],
      keyFeatures: makeFeatures(catSlug),
      badge: Math.random() > 0.6 ? ["Fresh","Deal","Hot Deal"][randInt(0,2)] : null,
      inStock: true, status: "approved", sellerId: seller.id,
      rating: randInt(38, 48) / 10, reviewCount: randInt(5, 120),
    });
    mi++;
  }

  const all = [...storeData, ...martData];
  console.log("Inserting", all.length, "products...");
  const BATCH = 80;
  for (let i = 0; i < all.length; i += BATCH) {
    await prisma.product.createMany({ data: all.slice(i, i + BATCH) });
    process.stdout.write("\r  " + Math.min(i + BATCH, all.length) + "/" + all.length);
  }
  console.log("\nDone.");
  const fs = await prisma.product.count({ where: { source: "store", baseProductId: null, sellerId: seller.id } });
  const fm = await prisma.product.count({ where: { source: "mart", baseProductId: null, sellerId: seller.id } });
  console.log("Store:", fs, "| Mart:", fm);
}

main().catch(e => { console.error(e.message || e); process.exit(1); }).finally(() => prisma.$disconnect());