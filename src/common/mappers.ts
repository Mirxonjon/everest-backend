/**
 * DB yozuvlarini vitrina (frontend) kutgan shaklga o'giradi.
 *
 * Baza camelCase + enum (NEW, DELIVERY), frontend esa snake_case +
 * kichik harf ('new', 'delivery') bilan ishlaydi. Shu chegarada tarjima
 * qilamiz — baza sxemasi ham, frontend shartnomasi ham toza qoladi.
 */
import type {
  Store,
  Product,
  Order,
  OrderItem,
  OrderStatus,
  DeliveryType,
} from '@prisma/client';

export function mapStore(store: Store, categories: { id: number; name: string }[]) {
  return {
    slug: store.slug,
    title: store.title,
    about: null,
    logo: store.logo,
    logo_thumb: store.logoThumb,
    palette: store.palette,
    phone: store.phone,
    telegram: store.telegram,
    instagram: store.instagram,
    address: store.address,
    work_time: null,
    hours: null,
    currency: store.currency,
    is_open: store.isOpen,
    closed_reason: null,
    delivery_enabled: store.deliveryEnabled,
    delivery_price: store.deliveryPrice,
    free_delivery_from: null,
    pickup_enabled: store.pickupEnabled,
    min_order_amount: store.minOrderAmount,
    delivery_zones: [],
    payment_methods: store.paymentMethods,
    welcome_text: store.welcomeText,
    bot_username: null,
  };
}

export function mapProduct(p: Product) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    currency: p.currency,
    old_price: p.oldPrice,
    discount: p.discount,
    unit: p.unit,
    category_id: p.categoryId ?? 0,
    min_qty: p.minQty,
    packages: null,
    in_stock: p.inStock,
    stock: p.stock,
    photos: p.photos,
    thumbs: p.thumbs,
    images: p.images,
  };
}

const STATUS_OUT: Record<OrderStatus, string> = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  DELIVERING: 'delivering',
  DONE: 'done',
  CANCELED: 'canceled',
};

const DELIVERY_OUT: Record<DeliveryType, string> = {
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
};

export function mapOrderItem(li: OrderItem) {
  return {
    item_id: li.productId,
    name: li.name,
    quantity: li.quantity,
    price: li.price,
    currency: li.currency,
    unit: li.unit,
    photo: li.photo,
    photo_full: li.photoFull,
  };
}

export function mapOrder(order: Order & { items: OrderItem[] }) {
  return {
    id: order.id,
    number: order.number,
    token: order.token,
    status: STATUS_OUT[order.status],
    created_at: order.createdAt.toISOString(),
    customer_name: order.customerName,
    phone: order.phone,
    address: order.address,
    comment: order.comment,
    delivery_type: DELIVERY_OUT[order.deliveryType],
    items: order.items.map(mapOrderItem),
    items_total: order.itemsTotal,
    delivery_price: order.deliveryPrice,
    total: order.total,
    payment: order.paymentType
      ? { type: order.paymentType, title: order.paymentTitle, status: order.paymentStatus }
      : null,
    cancel_reason: order.cancelReason,
  };
}
