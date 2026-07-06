import { pool } from './server/db/pool.js';

async function seed() {
  console.log('Starting Hero Slider seeding...');
  try {
    // Check if there are already any hero slides in the database (slot 'hero' or position >= 100)
    const [existing] = await pool.query(
      `SELECT id FROM banners WHERE position >= 100 OR link LIKE '%"slot":"hero"%'`
    );

    if (existing.length > 0) {
      console.log(`Database already has ${existing.length} hero slider banners. Skipping seed.`);
      process.exit(0);
    }

    // Try to find a real game in the database to link to a slide
    const [products] = await pool.query('SELECT id, name FROM products LIMIT 3');
    let linkedProductId = '';
    let linkedProductName = '';

    if (products.length > 0) {
      linkedProductId = String(products[0].id);
      linkedProductName = products[0].name;
      console.log(`Found product to link to slide: "${linkedProductName}" (ID: ${linkedProductId})`);
    }

    const defaultSlides = [
      {
        title: 'CALL OF DUTY',
        subtitle: 'Call of Duty is a first-person shooter video game franchise published by Activision. Starting out in 2003, it first focused on games set in World War II. The most recent title, Call of Duty: Modern Warfare, was released on October 25, 2019.',
        badge: 'MODERN WARFARE',
        imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1920&auto=format&fit=crop',
        position: 100,
        link: JSON.stringify({
          subtitle: 'Call of Duty is a first-person shooter video game franchise published by Activision. Starting out in 2003, it first focused on games set in World War II. The most recent title, Call of Duty: Modern Warfare, was released on October 25, 2019.',
          linkType: linkedProductId ? 'product' : 'none',
          slot: 'hero',
          productId: linkedProductId,
          url: ''
        })
      },
      {
        title: 'PLAYSTATION 5 PRO',
        subtitle: 'Experience the next generation of gaming with high-fidelity graphics, faster loading times, and immersive sensory feedback.',
        badge: 'NEXT GEN HARDWARE',
        imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=1920&auto=format&fit=crop',
        position: 101,
        link: JSON.stringify({
          subtitle: 'Experience the next generation of gaming with high-fidelity graphics, faster loading times, and immersive sensory feedback.',
          linkType: 'none',
          slot: 'hero',
          productId: '',
          url: ''
        })
      },
      {
        title: 'EA SPORTS FC 25',
        subtitle: 'The World\'s Game is here. Experience unparalleled realism with HyperMotionV, PlayStyles optimized by Opta, and a revolutionized Frostbite™ Engine.',
        badge: 'SPORTS ARENA',
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1920&auto=format&fit=crop',
        position: 102,
        link: JSON.stringify({
          subtitle: 'The World\'s Game is here. Experience unparalleled realism with HyperMotionV, PlayStyles optimized by Opta, and a revolutionized Frostbite™ Engine.',
          linkType: 'none',
          slot: 'hero',
          productId: '',
          url: ''
        })
      }
    ];

    console.log('Inserting default hero slides into DB...');
    for (const slide of defaultSlides) {
      await pool.query(
        `INSERT INTO banners (title, subtitle, badge, image_url, link, position, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [slide.title, slide.subtitle, slide.badge, slide.imageUrl, slide.link, slide.position]
      );
      console.log(`Inserted slide: "${slide.title}"`);
    }

    console.log('Hero Slider seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding Hero Slider:', err);
    process.exit(1);
  }
}

seed();
