export type AppView =
  | 'home'
  | 'product'
  | 'orders'
  | 'favorites'
  | 'about'
  | 'contact'
  | 'request'
  | 'dashboard'
  | 'shop'
  | 'collection'
  | 'checkout'
  | 'confirmation'
  | 'search';

export type GameStatus = 'IN STOCK' | 'OUT OF STOCK' | 'LIMITED' | 'NEW';

export interface Game {
  id: string;
  title: string;
  image: string;
  banner: string;
  price: number;
  basePrice: number;
  tags: string[];
  status: GameStatus;
  description: string;
  category?: string;
  accountTypes: AccountType[];
}

export interface AccountType {
  tier: 'PLATINUM' | 'GOLD' | 'SILVER';
  price: number;
  save: string;
  status: GameStatus;
  icon: string;
  isAvailable: boolean;
}

export interface CartItem {
  cartId: string;
  gameId: string;
  title: string;
  image: string;
  tier: string;
  price: number;
  quantity: number;
}
