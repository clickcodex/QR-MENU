import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting THE MOMO'S WALA database seeding...");

  // 1. Create or update Platform SUPER ADMIN
  const superAdminEmail = 'superadmin@momomenu.in';
  const superAdminHash = await bcrypt.hash('superadmin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      passwordHash: superAdminHash,
      name: 'MOMO Super Admin',
      role: 'SUPERADMIN',
    },
    create: {
      email: superAdminEmail,
      passwordHash: superAdminHash,
      name: 'MOMO Super Admin',
      role: 'SUPERADMIN',
    },
  });
  console.log(`👑 Super Admin ready: ${superAdmin.email} (Role: SUPERADMIN)`);

  // 2. Create or update Restaurant Owner (ADMIN)
  const ownerEmail = 'owner@themomoswala.in';
  const ownerHash = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      passwordHash: ownerHash,
      name: "The Momo's Wala Owner",
      role: 'ADMIN',
    },
    create: {
      email: ownerEmail,
      passwordHash: ownerHash,
      name: "The Momo's Wala Owner",
      role: 'ADMIN',
    },
  });
  console.log(`👤 Owner user ready: ${owner.email} (Role: ADMIN)`);

  // Also preserve legacy admin accounts for testing
  const adminEmail = 'admin@clickcodex.in';
  const adminPasswordHash = await bcrypt.hash('adminpassword123', 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      name: "The Momo's Wala Admin",
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: "The Momo's Wala Admin",
      role: 'ADMIN',
    },
  });

  // 3. Create or update Restaurant: THE MOMO'S WALA
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 30);

  // Check if restaurant exists either by the-momos-wala or urban-spice
  let existingRestaurant = await prisma.restaurant.findFirst({
    where: {
      OR: [{ slug: 'the-momos-wala' }, { slug: 'urban-spice' }],
    },
  });

  const restaurantData = {
    name: "The Momo's Wala",
    slug: 'the-momos-wala',
    cuisine: 'Momos, Burgers, Sandwiches, Street Bites & Beverages',
    description:
      "Home of authentic handcrafted Himalayan Momos, crunchy Kurkure Momos, gourmet Burgers, loaded Sandwiches, crispy Fries, Sweet Corn & Refreshing Beverages. 100% Pure Vegetarian.",
    address: 'Shop No. 4, Food Court Avenue, Near Metro Station',
    phone: '+91 98765 43210',
    openingHours: '11:00 AM – 11:00 PM (Daily)',
    logoUrl: '/logo.png',
    coverUrl: '/cover.jpg',
    currencySymbol: '₹',
    isActive: true,
    subscriptionStatus: 'ACTIVE',
    subscriptionPlan: 'Pro Monthly Plan',
    monthlyFee: 999,
    renewalDate,
    userId: owner.id,
  };

  let restaurant;
  if (existingRestaurant) {
    restaurant = await prisma.restaurant.update({
      where: { id: existingRestaurant.id },
      data: restaurantData,
    });
  } else {
    restaurant = await prisma.restaurant.create({
      data: restaurantData,
    });
  }

  // 4. Create or update Kitchen Staff user
  const kitchenEmail = 'kitchen@themomoswala.in';
  const kitchenHash = await bcrypt.hash('kitchen123', 10);
  const kitchen = await prisma.user.upsert({
    where: { email: kitchenEmail },
    update: {
      passwordHash: kitchenHash,
      name: 'Chef Kitchen (The Momo’s Wala)',
      role: 'KITCHEN',
      restaurantId: restaurant.id,
    },
    create: {
      email: kitchenEmail,
      passwordHash: kitchenHash,
      name: 'Chef Kitchen (The Momo’s Wala)',
      role: 'KITCHEN',
      restaurantId: restaurant.id,
    },
  });
  console.log(`👨‍🍳 Kitchen user ready: ${kitchen.email} (Role: KITCHEN)`);
  console.log(`🍽️ Restaurant updated: ${restaurant.name} (/r/${restaurant.slug})`);

  // Clear existing items, categories, QR tokens, and tables for clean seed
  await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.category.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.qRToken.deleteMany({ where: { table: { restaurantId: restaurant.id } } });
  await prisma.table.deleteMany({ where: { restaurantId: restaurant.id } });

  // 5. Create Categories from the menu photos
  const categoriesData = [
    {
      name: 'Momos',
      description: 'Steamed and golden fried dumplings served with hot spicy red chutney & dip',
      displayOrder: 1,
    },
    {
      name: 'Kurkure',
      description: 'Extra crunchy cornflake-crusted momos fried to golden perfection',
      displayOrder: 2,
    },
    {
      name: 'Burger',
      description: 'Crispy seasoned tikkis in toasted sesame buns with fresh veggies & sauces',
      displayOrder: 3,
    },
    {
      name: 'Sandwich',
      description: 'Loaded and layered grilled sandwiches packed with cheese, paneer & spices',
      displayOrder: 4,
    },
    {
      name: 'Fries',
      description: 'Crisp hot French fries in delicious peri peri, tandoori, and cheese flavours',
      displayOrder: 5,
    },
    {
      name: 'Vada Pav',
      description: 'Authentic Mumbai style batata vada in fresh pav with zesty chutneys',
      displayOrder: 6,
    },
    {
      name: 'Sweet Corn',
      description: 'Steamed sweet corn tossed in butter, rich spices, and melted cheese',
      displayOrder: 7,
    },
    {
      name: 'Beverages',
      description: 'Refreshing hot teas, aromatic coffees, and thick chilled shakes',
      displayOrder: 8,
    },
  ];

  const createdCategories = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: {
        ...cat,
        restaurantId: restaurant.id,
      },
    });
    createdCategories[cat.name] = created;
  }
  console.log(`📁 Categories created: ${Object.keys(createdCategories).length}`);

  // 6. Complete Menu Items from all 5 photos
  const menuItemsData = [
    // ----------------------------------------------------
    // PHOTO 3: MOMOS (STEAM & FRIED - HALF / FULL)
    // ----------------------------------------------------
    {
      category: 'Momos',
      name: 'Veg Momos (Steam - Half)',
      description: 'Classic steamed vegetable momos packed with finely chopped veggies & herbs (Half Portion)',
      price: 40,
      imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Momos',
      name: 'Veg Momos (Steam - Full)',
      description: 'Classic steamed vegetable momos packed with finely chopped veggies & herbs (Full Portion)',
      price: 60,
      imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Momos',
      name: 'Veg Momos (Fried - Half)',
      description: 'Crisp golden fried vegetable momos with aromatic fillings (Half Portion)',
      price: 50,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Momos',
      name: 'Veg Momos (Fried - Full)',
      description: 'Crisp golden fried vegetable momos with aromatic fillings (Full Portion)',
      price: 80,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 4,
    },
    {
      category: 'Momos',
      name: 'Paneer Momos (Steam - Half)',
      description: 'Steamed dumplings loaded with tender spiced cottage cheese & coriander (Half Portion)',
      price: 50,
      imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 5,
    },
    {
      category: 'Momos',
      name: 'Paneer Momos (Steam - Full)',
      description: 'Steamed dumplings loaded with tender spiced cottage cheese & coriander (Full Portion)',
      price: 80,
      imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 6,
    },
    {
      category: 'Momos',
      name: 'Paneer Momos (Fried - Half)',
      description: 'Deep-fried golden momos stuffed with rich seasoned paneer (Half Portion)',
      price: 60,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 7,
    },
    {
      category: 'Momos',
      name: 'Paneer Momos (Fried - Full)',
      description: 'Deep-fried golden momos stuffed with rich seasoned paneer (Full Portion)',
      price: 99,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 8,
    },
    {
      category: 'Momos',
      name: 'Cheese Corn Momos (Steam - Half)',
      description: 'Steamed momos bursting with gooey molten cheese and sweet corn kernels (Half Portion)',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 9,
    },
    {
      category: 'Momos',
      name: 'Cheese Corn Momos (Steam - Full)',
      description: 'Steamed momos bursting with gooey molten cheese and sweet corn kernels (Full Portion)',
      price: 120,
      imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 10,
    },
    {
      category: 'Momos',
      name: 'Cheese Corn Momos (Fried - Half)',
      description: 'Crispy fried golden dumplings with rich melted cheese and juicy corn (Half Portion)',
      price: 80,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 11,
    },
    {
      category: 'Momos',
      name: 'Cheese Corn Momos (Fried - Full)',
      description: 'Crispy fried golden dumplings with rich melted cheese and juicy corn (Full Portion)',
      price: 130,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 12,
    },

    // ----------------------------------------------------
    // PHOTO 3: KURKURE MOMOS
    // ----------------------------------------------------
    {
      category: 'Kurkure',
      name: 'Kurkure Veg Momos',
      description: 'Super crunchy cornflake-crusted momos stuffed with seasoned vegetables and served with spicy mayo dip',
      price: 99,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Kurkure',
      name: 'Kurkure Paneer Momos',
      description: 'Crunch-coated outer layer with soft, flavorful cottage cheese interior. An absolute customer favorite',
      price: 110,
      imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Kurkure',
      name: 'Kurkure Cheese Corn Momos',
      description: 'Ultra-crispy outer shell encasing gooey melted cheese and sweet corn. Served piping hot',
      price: 130,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 3,
    },

    // ----------------------------------------------------
    // PHOTO 4: BURGER (Exact descriptions from menu)
    // ----------------------------------------------------
    {
      category: 'Burger',
      name: 'Aaloo Tikki Burger',
      description: 'Classic crispy potato tikki with desi sauces in a soft bun',
      price: 40,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Burger',
      name: 'Veggie Tikki Burger',
      description: 'Loaded with mixed veggie tikki, crunchy lettuce and tangy mayo for a balanced taste',
      price: 50,
      imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Burger',
      name: 'Spicy Schezwan Burger',
      description: 'Fiery schezwan sauce with a crispy tikki, perfect for spice lovers',
      price: 50,
      imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Burger',
      name: 'Aaloo Tikki Cheese Burger',
      description: 'Golden potato tikki topped with melted cheese for extra creamy flavour',
      price: 60,
      imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 4,
    },
    {
      category: 'Burger',
      name: 'Veggies Cheese Tikki Burger',
      description: 'Cheesy veggie tikki layered with fresh vegetables and rich sauces',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 5,
    },
    {
      category: 'Burger',
      name: 'Tandoori Burger',
      description: 'Smoky tandoori-flavoured tikki with onions and spicy chutney for desi vibe',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 6,
    },
    {
      category: 'Burger',
      name: 'Cheese Tandoori Burger',
      description: 'Juicy tandoori tikki combined with melted cheese for a bold and indulgent taste',
      price: 80,
      imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 7,
    },

    // ----------------------------------------------------
    // PHOTO 5: SANDWICH
    // ----------------------------------------------------
    {
      category: 'Sandwich',
      name: "Momo's Wala Special Loaded Sandwich",
      description: 'Special Chef Signature double-decker sandwich loaded with paneer, fresh veggies, layers of melted cheese & signature sauces',
      price: 120,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Sandwich',
      name: 'Paneer Cheese Chilli Sandwich',
      description: 'Spiced cottage cheese cubes, crisp green chillies, and melted mozzarella toasted to golden perfection',
      price: 110,
      imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Sandwich',
      name: 'Paneer Peri Peri Sandwich',
      description: 'Marinated paneer tossed in fiery African peri peri seasoning, layered with capsicum & cheese',
      price: 100,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Sandwich',
      name: 'Paneer Tandoori Sandwich',
      description: 'Charcoal-tandoori spiced paneer with mint chutney, sliced onions, and grilled bread',
      price: 100,
      imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 4,
    },
    {
      category: 'Sandwich',
      name: 'Cheese Vegetable Sandwich',
      description: 'Crisp cucumber, tomatoes, bell peppers, and abundant melted cheese on toasted butter bread',
      price: 90,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 5,
    },
    {
      category: 'Sandwich',
      name: 'Cheese Masala Sandwich',
      description: 'Traditional spiced potato masala filling paired with rich melted cheese and toasted crisp',
      price: 90,
      imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 6,
    },
    {
      category: 'Sandwich',
      name: 'Cheese Chutney Sandwiches',
      description: 'Tangy-spicy green mint & coriander chutney layered with rich cheddar cheese',
      price: 90,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 7,
    },
    {
      category: 'Sandwich',
      name: 'Cheese Corn Sandwich',
      description: 'Juicy golden sweet corn mixed with melted mozzarella and Italian herbs',
      price: 90,
      imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 8,
    },
    {
      category: 'Sandwich',
      name: 'Vegetable Sandwich',
      description: 'Classic street-style toasted sandwich loaded with sliced garden fresh vegetables & butter',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 9,
    },
    {
      category: 'Sandwich',
      name: 'Masala Sandwich',
      description: 'Warm spiced potato mash filling infused with cumin, herbs, and desi chutneys',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 10,
    },
    {
      category: 'Sandwich',
      name: 'Sweet Corn Sandwich',
      description: 'Tender sweet corn tossed in butter, pepper, and herbs between toasted crispy slices',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 11,
    },

    // ----------------------------------------------------
    // PHOTO 2: FRIES
    // ----------------------------------------------------
    {
      category: 'Fries',
      name: 'Salted Fries',
      description: 'Classic golden crispy French fries sprinkled with sea salt',
      price: 50,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Fries',
      name: 'Peri Peri Fries',
      description: 'Crispy French fries generously tossed in spicy and tangy African peri peri seasoning',
      price: 60,
      imageUrl: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Fries',
      name: 'Tandoori Fries',
      description: 'Golden fries seasoned with smoky tandoori herbs and special chaat masala',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Fries',
      name: 'Cheese Fries',
      description: 'Hot crispy fries smothered in velvety, warm melted cheese sauce and herbs',
      price: 80,
      imageUrl: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 4,
    },

    // ----------------------------------------------------
    // PHOTO 2: VADA PAV
    // ----------------------------------------------------
    {
      category: 'Vada Pav',
      name: 'Vada Pav',
      description: 'Traditional Mumbai batata vada in soft toasted pav with spicy garlic and sweet tamarind chutneys',
      price: 25,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Vada Pav',
      name: 'Tandoori Vada Pav',
      description: 'Crispy batata vada drizzled with smoky tandoori sauce and fresh sliced onions',
      price: 30,
      imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Vada Pav',
      name: 'Cheese Vada Pav',
      description: 'Classic Mumbai vada pav crowned with a thick slice of melted cheese',
      price: 40,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Vada Pav',
      name: 'Tandoori Cheese Vada Pav',
      description: 'The ultimate indulgent vada pav layered with melted cheese and bold tandoori dressing',
      price: 45,
      imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 4,
    },

    // ----------------------------------------------------
    // PHOTO 1: SWEET CORN
    // ----------------------------------------------------
    {
      category: 'Sweet Corn',
      name: 'Classic Butter Sweet Corn',
      description: 'Warm, tender sweet corn kernels tossed with rich butter and light seasoning',
      price: 40,
      imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Sweet Corn',
      name: 'Masala Sweet Corn',
      description: 'Steamed sweet corn seasoned with tangy chatpata Indian spices and butter',
      price: 50,
      imageUrl: 'https://images.unsplash.com/photo-1574316071802-0d684efa7cd5?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Sweet Corn',
      name: 'Cheese Sweet Corn',
      description: 'Sweet corn loaded with creamy melted cheese, herbs, and mild black pepper',
      price: 60,
      imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Sweet Corn',
      name: 'Butter Cheese Sweet Corn',
      description: 'Indulgent combination of rich butter and melted mozzarella cheese on warm corn',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 4,
    },
    {
      category: 'Sweet Corn',
      name: 'Peri Peri Sweet Corn',
      description: 'Steamed sweet corn tossed in spicy African peri peri seasoning and lemon butter',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 5,
    },
    {
      category: 'Sweet Corn',
      name: 'Chatpata Sweet Corn',
      description: 'Desi street-style tangy & spicy sweet corn with fresh lemon zest and chaat masala',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1574316071802-0d684efa7cd5?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 6,
    },
    {
      category: 'Sweet Corn',
      name: 'Creamy Mayo Sweet Corn',
      description: 'Sweet corn coated in velvety mayonnaise, butter, and gentle herb seasoning',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 7,
    },
    {
      category: 'Sweet Corn',
      name: 'Tandoori Sweet Corn',
      description: 'Smoky tandoori-marinated sweet corn tossed with aromatic roasted spices and butter',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 8,
    },

    // ----------------------------------------------------
    // PHOTO 6: BEVERAGES
    // ----------------------------------------------------
    {
      category: 'Beverages',
      name: 'Chai',
      description: 'Traditional Indian kadak masala milk tea brewed with fresh ginger, cardamom & aromatic herbs',
      price: 10,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Beverages',
      name: 'Kullad Chai',
      description: 'Desi fragrant masala tea served in an authentic earthen clay kullad for that earthy aroma and rich flavor',
      price: 15,
      imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Beverages',
      name: 'Hot Coffee',
      description: 'Freshly brewed piping hot coffee with a rich aroma and velvety froth',
      price: 15,
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Beverages',
      name: 'Cold Coffee',
      description: 'Classic thick blended chilled coffee served cold with frothy chocolate layer',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 4,
    },
    {
      category: 'Beverages',
      name: 'Cold Coffee with Ice-Cream',
      description: 'Rich indulgent cold coffee topped with a generous scoop of creamy vanilla ice cream & chocolate drizzle',
      price: 90,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 5,
    },
    {
      category: 'Beverages',
      name: 'Oreo Shake',
      description: 'Thick gourmet milkshake loaded with crushed crunchy Oreo cookies and chocolate drizzle',
      price: 100,
      imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 6,
    },
  ];

  for (const item of menuItemsData) {
    const cat = createdCategories[item.category];
    if (!cat) continue;
    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        isSpicy: item.isSpicy,
        isBestseller: item.isBestseller,
        isAvailable: item.isAvailable,
        displayOrder: item.displayOrder,
        categoryId: cat.id,
        restaurantId: restaurant.id,
      },
    });
  }
  console.log(`🥟 Menu items created: ${menuItemsData.length}`);

  // 7. Create Tables (Table 1 through 8)
  const tables = [
    { number: '1', name: 'Table 1', capacity: 4 },
    { number: '2', name: 'Table 2', capacity: 4 },
    { number: '3', name: 'Table 3', capacity: 4 },
    { number: '4', name: 'Table 4', capacity: 6 },
    { number: '5', name: 'Table 5', capacity: 6 },
    { number: '6', name: 'Table 6', capacity: 4 },
    { number: '7', name: 'Table 7 (VIP)', capacity: 8 },
    { number: '8', name: 'Table 8', capacity: 8 },
  ];

  for (const t of tables) {
    const tableRecord = await prisma.table.create({
      data: {
        tableNumber: t.number,
        name: t.name,
        capacity: t.capacity,
        restaurantId: restaurant.id,
      },
    });

    const targetUrl = `https://menu.clickcodex.in/r/${restaurant.slug}/t/${t.number}`;
    await prisma.qRToken.create({
      data: {
        token: `qr-${restaurant.slug}-t${t.number}`,
        tableId: tableRecord.id,
        targetUrl,
      },
    });
  }
  console.log(`🪑 Tables created: ${tables.length} (with QR tokens)`);

  console.log("✅ THE MOMO'S WALA seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
