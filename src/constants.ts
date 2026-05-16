import { Game } from './types';

export const GAMES_DATA: Game[] = [
  {
    id: '1',
    title: 'A PLAGUE TALE INNOCENCE',
    image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/752590/header.jpg',
    banner: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/752590/header.jpg',
    price: 225,
    basePrice: 225,
    category: 'Action',
    tags: ['Adventure', 'Action'],
    status: 'OUT OF STOCK',
    description: 'Follow the grim tale of young Amicia and her little brother Hugo, in a heart-rending journey through the darkest hours of history.',
    accountTypes: [
      { price: 325, tier: 'PLATINUM', save: '5.0%', status: 'OUT OF STOCK', icon: '💎', isAvailable: false },
      { price: 300, tier: 'GOLD', save: '10.0%', status: 'LIMITED', icon: '🥇', isAvailable: true },
      { price: 225, tier: 'SILVER', save: '20.0%', status: 'LIMITED', icon: '🥈', isAvailable: true }
    ]
  },
  {
    id: '2',
    title: 'A PLAGUE TALE REQUIEM',
    image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1182900/header.jpg',
    banner: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1182900/header.jpg',
    price: 300,
    basePrice: 300,
    category: 'Action',
    tags: ['Adventure', 'New'],
    status: 'NEW',
    description: 'Far across the sea, an island calls... Embark on a heartrending journey into a brutal, breathtaking world twisted by supernatural forces.',
    accountTypes: [
      { price: 450, tier: 'PLATINUM', save: '5.0%', status: 'IN STOCK', icon: '💎', isAvailable: true },
      { price: 400, tier: 'GOLD', save: '10.0%', status: 'IN STOCK', icon: '🥇', isAvailable: true },
      { price: 300, tier: 'SILVER', save: '20.0%', status: 'LIMITED', icon: '🥈', isAvailable: true }
    ]
  },
  {
    id: '3',
    title: 'ELDEN RING',
    image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
    banner: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
    price: 650,
    basePrice: 650,
    category: 'RPG',
    tags: ['RPG', 'Open World'],
    status: 'IN STOCK',
    description: 'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring.',
    accountTypes: [
      { price: 850, tier: 'PLATINUM', save: '5.0%', status: 'IN STOCK', icon: '💎', isAvailable: true },
      { price: 750, tier: 'GOLD', save: '10.0%', status: 'IN STOCK', icon: '🥇', isAvailable: true },
      { price: 650, tier: 'SILVER', save: '20.0%', status: 'IN STOCK', icon: '🥈', isAvailable: true }
    ]
  },
  {
    id: '4',
    title: 'FC 24',
    image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
    banner: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
    price: 600,
    basePrice: 600,
    category: 'Sports',
    tags: ['Sports', 'Football'],
    status: 'IN STOCK',
    description: 'EA SPORTS FC 24 is a new era for The World’s Game: 19,000+ fully licensed players, 700+ teams, and 30+ leagues playing together.',
    accountTypes: [
      { price: 900, tier: 'PLATINUM', save: '5.0%', status: 'IN STOCK', icon: '💎', isAvailable: true },
      { price: 750, tier: 'GOLD', save: '10.0%', status: 'IN STOCK', icon: '🥇', isAvailable: true },
      { price: 600, tier: 'SILVER', save: '20.0%', status: 'IN STOCK', icon: '🥈', isAvailable: true }
    ]
  }
];
