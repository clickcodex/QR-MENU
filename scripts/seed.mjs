import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MOMO MENU database seeding...');

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
  const ownerEmail = 'owner@urbanspice.in';
  const ownerHash = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      passwordHash: ownerHash,
      name: 'Aditya Sharma (Owner)',
      role: 'ADMIN',
    },
    create: {
      email: ownerEmail,
      passwordHash: ownerHash,
      name: 'Aditya Sharma (Owner)',
      role: 'ADMIN',
    },
  });
  console.log(`👤 Owner user ready: ${owner.email} (Role: ADMIN)`);

  // Also preserve legacy admin account
  const adminEmail = 'admin@clickcodex.in';
  const adminPasswordHash = await bcrypt.hash('adminpassword123', 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      name: 'Aditya Sharma',
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: 'Aditya Sharma',
      role: 'ADMIN',
    },
  });

  // 3. Create or update Demo Restaurant: Urban Spice with SaaS Subscription
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 30);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'urban-spice' },
    update: {
      name: 'Urban Spice',
      cuisine: 'Modern Indian & Tandoor Craft',
      description: 'Artisanal clay-oven specialties, rich slow-simmered curries, fragrant dum biryanis, and handcrafted refreshers crafted with fresh farm ingredients.',
      address: 'Plot 42, Galleria Boulevard, Sector 29, Gurugram',
      phone: '+91 98765 43210',
      openingHours: '12:00 PM – 11:30 PM (Daily)',
      logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
      currencySymbol: '₹',
      isActive: true,
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: 'Pro Monthly Plan',
      monthlyFee: 999,
      renewalDate,
      userId: owner.id,
    },
    create: {
      name: 'Urban Spice',
      slug: 'urban-spice',
      cuisine: 'Modern Indian & Tandoor Craft',
      description: 'Artisanal clay-oven specialties, rich slow-simmered curries, fragrant dum biryanis, and handcrafted refreshers crafted with fresh farm ingredients.',
      address: 'Plot 42, Galleria Boulevard, Sector 29, Gurugram',
      phone: '+91 98765 43210',
      openingHours: '12:00 PM – 11:30 PM (Daily)',
      logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
      currencySymbol: '₹',
      isActive: true,
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: 'Pro Monthly Plan',
      monthlyFee: 999,
      renewalDate,
      userId: owner.id,
    },
  });

  // 4. Create or update Kitchen Staff user
  const kitchenEmail = 'kitchen@urbanspice.in';
  const kitchenHash = await bcrypt.hash('kitchen123', 10);
  const kitchen = await prisma.user.upsert({
    where: { email: kitchenEmail },
    update: {
      passwordHash: kitchenHash,
      name: 'Chef Sanjeev (Head Chef)',
      role: 'KITCHEN',
      restaurantId: restaurant.id,
    },
    create: {
      email: kitchenEmail,
      passwordHash: kitchenHash,
      name: 'Chef Sanjeev (Head Chef)',
      role: 'KITCHEN',
      restaurantId: restaurant.id,
    },
  });
  console.log(`👨‍🍳 Kitchen user ready: ${kitchen.email} (Role: KITCHEN, Restaurant: ${restaurant.name})`);

  console.log(`🍽️ Restaurant ready: ${restaurant.name} (/r/${restaurant.slug})`);

  // Clear existing categories and items for this restaurant to ensure clean seed
  await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.category.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.qRToken.deleteMany({ where: { table: { restaurantId: restaurant.id } } });
  await prisma.table.deleteMany({ where: { restaurantId: restaurant.id } });

  // 3. Create Categories
  const categoriesData = [
    {
      name: 'Starters',
      description: 'Crisp appetizers and charcoal-grilled tandoori skewers',
      displayOrder: 1,
    },
    {
      name: 'Main Course',
      description: 'Silken gravies, slow-cooked lentils, and heritage specialties',
      displayOrder: 2,
    },
    {
      name: 'Breads',
      description: 'Clay-oven baked naans, layered parathas, and rotis',
      displayOrder: 3,
    },
    {
      name: 'Rice & Biryani',
      description: 'Dum-cooked long grain basmati infused with royal aromatics',
      displayOrder: 4,
    },
    {
      name: 'Desserts',
      description: 'Traditional sweets with a contemporary twist',
      displayOrder: 5,
    },
    {
      name: 'Beverages',
      description: 'Coolers, churned lassis, and handcrafted refreshments',
      displayOrder: 6,
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

  // 4. Create Menu Items
  const menuItemsData = [
    // STARTERS
    {
      category: 'Starters',
      name: 'Paneer Tikka',
      description: 'Smoky charcoal-grilled cottage cheese cubes marinated in Kashmiri red chili and hung curd, served with mint chutney.',
      price: 280,
      imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Starters',
      name: 'Dahi Ke Kebab',
      description: 'Crisp hung curd patties infused with green cardamom, roasted cumin, and fresh coriander leaves.',
      price: 260,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Starters',
      name: 'Murgh Malai Tikka',
      description: 'Succulent boneless chicken tenders steeped in cream cheese, white pepper, and mace, gently roasted in tandoor.',
      price: 360,
      imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
      isVeg: false,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Starters',
      name: 'Amritsari Fish Tikka',
      description: 'Crispy carom-spiced river sole fillets with crushed coriander seeds and tangy lemon-radish relish.',
      price: 420,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
      isVeg: false,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 4,
    },
    {
      category: 'Starters',
      name: 'Crispy Corn Pepper Fry',
      description: 'Golden sweet corn kernels tossed with crushed black pepper, diced bell peppers, and fresh scallions.',
      price: 240,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 5,
    },

    // MAIN COURSE
    {
      category: 'Main Course',
      name: 'Dal Makhani (24-Hour)',
      description: 'Urad lentils slow-simmered overnight on glowing embers with cream, butter, and sun-ripened tomatoes.',
      price: 290,
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Main Course',
      name: 'Paneer Butter Masala',
      description: 'Fresh farm cottage cheese batons simmered in a velvety cashew and tomato makhani sauce infused with kasoori methi.',
      price: 340,
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Main Course',
      name: 'Old Delhi Butter Chicken',
      description: 'Smoked tandoori chicken cooked in a rich, buttery tomato silk gravy with aromatics and dried fenugreek.',
      price: 440,
      imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80',
      isVeg: false,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Main Course',
      name: 'Kashmiri Mutton Rogan Josh',
      description: 'Prime lamb shank cuts slow-braised with ratan jot, Kashmiri deghi mirch, and whole Himalayan spices.',
      price: 490,
      imageUrl: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=800&q=80',
      isVeg: false,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 4,
    },
    {
      category: 'Main Course',
      name: 'Kadhai Subz Meloni',
      description: 'Hand-picked farm vegetables tossed in an iron wok with freshly pounded coriander, bell peppers, and red chilies.',
      price: 280,
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 5,
    },

    // BREADS
    {
      category: 'Breads',
      name: 'Garlic Butter Naan',
      description: 'Hand-stretched leavened bread coated with roasted minced garlic, fresh cilantro, and melted butter.',
      price: 85,
      imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Breads',
      name: 'Cheese & Chilli Naan',
      description: 'Tandoor-baked flatbread stuffed with molten cheddar, green chilies, and herbs.',
      price: 110,
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: true,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Breads',
      name: 'Laccha Paratha',
      description: 'Multi-layered flaky whole wheat bread cooked in clay oven and topped with melted desi ghee.',
      price: 70,
      imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b301b5c819?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 3,
    },
    {
      category: 'Breads',
      name: 'Tandoori Roti',
      description: 'Classic unleavened whole wheat bread crisped in clay tandoor.',
      price: 45,
      imageUrl: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 4,
    },

    // RICE & BIRYANI
    {
      category: 'Rice & Biryani',
      name: 'Awadhi Dum Gosht Biryani',
      description: 'Aged basmati rice layered with tender marinated lamb, saffron milk, and fried onions, slow-cooked in a sealed handi.',
      price: 480,
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
      isVeg: false,
      isSpicy: true,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Rice & Biryani',
      name: 'Subz Dum Biryani',
      description: 'Fragrant basmati rice gently steamed with seasonal garden vegetables, fresh mint, kewra, and toasted spices.',
      price: 330,
      imageUrl: 'https://images.unsplash.com/photo-1642821373181-696a54913e9a?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Rice & Biryani',
      name: 'Jeera Basmati Rice',
      description: 'Fluffy long-grain basmati tempered with royal brown cumin seeds and desi ghee.',
      price: 190,
      imageUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 3,
    },

    // DESSERTS
    {
      category: 'Desserts',
      name: 'Kesari Rabdi Gulab Jamun',
      description: 'Warm, golden khoya dumplings soaked in saffron-rose syrup, resting on chilled artisanal condensed milk rabdi.',
      price: 180,
      imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Desserts',
      name: 'Royal Rasmalai (2 Pcs)',
      description: 'Velvety cottage cheese discs poached in saffron and pistachio-infused reduced milk.',
      price: 195,
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 2,
    },

    // BEVERAGES
    {
      category: 'Beverages',
      name: 'Alphonso Mango Lassi',
      description: 'Chilled thick artisanal yogurt blended with premium Ratnagiri Alphonso mango puree and crushed green cardamom.',
      price: 150,
      imageUrl: 'https://images.unsplash.com/photo-1570696516188-ade861b84a49?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: true,
      isAvailable: true,
      displayOrder: 1,
    },
    {
      category: 'Beverages',
      name: 'Masala Spiced Chaas',
      description: 'Traditional slow-churned buttermilk flavored with roasted cumin, rock salt, ginger, and fresh mint.',
      price: 95,
      imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      category: 'Beverages',
      name: 'Fresh Mint Lime Soda',
      description: 'Sparkling cooler with muddled mint leaves, freshly squeezed Persian lime juice, and rock salt.',
      price: 110,
      imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
      isVeg: true,
      isSpicy: false,
      isBestseller: false,
      isAvailable: true,
      displayOrder: 3,
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
  console.log(`🍜 Menu items created: ${menuItemsData.length}`);

  // 5. Create Tables (Table 1 through 8)
  const tables = [
    { number: '1', name: 'Window Booth 1', capacity: 4 },
    { number: '2', name: 'Window Booth 2', capacity: 4 },
    { number: '3', name: 'Center Table 3', capacity: 6 },
    { number: '4', name: 'Center Table 4', capacity: 6 },
    { number: '5', name: 'Family Table 5', capacity: 8 },
    { number: '6', name: 'Courtyard Table 6', capacity: 4 },
    { number: '7', name: 'Royal Table 7', capacity: 10 },
    { number: '8', name: 'Private Alcove 8', capacity: 12 },
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

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
