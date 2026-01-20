export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Item {
  id: number;
  name: string;
  code?: string;
  quantityInStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: number;
  recipientName: string;
  receiptDate: string;
  createdByUserId: number;
  createdByUsername?: string;
  items: ReceiptItem[];
  createdAt: string;
  isCancelled?: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface ReceiptItem {
  id: number;
  itemId: number;
  itemName?: string;
  quantity: number;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}
