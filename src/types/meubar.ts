export interface UserCoords {
  lat: number;
  lon: number;
  accuracy?: number;
}

export type MenuBlockId = 'header' | 'promo' | 'filters' | 'drinks' | 'footer';

export interface MenuDesignConfig {
  bg_pattern?: string;
  bg_color_2?: string;
  logo_size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  logo_shape?: string;
  logo_offset_x?: number;
  logo_offset_y?: number;
  top_ornament?: string;
  footer_ornament?: string;
  footer_text?: string;
  side_detail?: string;
  section_style?: string;
  price_style?: string;
  card_style?: 'glass' | 'bordered' | 'minimal' | 'elevated' | 'neon' | 'ticket' | 'soft-pill';
  block_order?: MenuBlockId[];
}

export interface MenuPromotion {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  type: 'discount_pct' | 'banner';
  discount_pct?: number;
  target_category?: string;
  accent_color?: string;
  active?: boolean;
}

export type ItemType = 'drink' | 'petisco' | 'avulso';

export interface StoreProfileConfig {
  about?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  opening_hours?: string;
  address_details?: string;
  amenities?: string[];
  extra_banners?: string[];
  bg_pattern?: string;
  bg_color_2?: string;
  banner_height?: 'sm' | 'md' | 'lg';
  banner_overlay?: 'dark' | 'gradient' | 'soft' | 'none';
  logo_shape?: string;
  logo_size?: 'sm' | 'md' | 'lg';
  card_style?: 'glass' | 'bordered' | 'elevated' | 'neon' | 'minimal';
  top_ornament?: string;
  side_detail?: string;
  badge_text?: string;
  show_jobs?: boolean;
  show_map?: boolean;
}

export interface StoreProfilePreset {
  id: string;
  profile_name: string;
  saved_at?: string;
  name?: string;
  slogan?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  name_font?: string;
  color_bg?: string;
  color_surface?: string;
  color_accent?: string;
  color_ok?: string;
  color_text?: string;
  profile_config?: StoreProfileConfig;
}

export interface QrDesignConfig {
  id: string;
  design_name: string;
  saved_at?: string;
  bg_color: string;
  bg_color_2?: string;
  bg_pattern?: 'solid' | 'gradient' | 'radial' | 'stripes' | 'dots';
  card_color: string;
  accent_color: string;
  text_color: string;
  qr_fg_color?: string;
  qr_bg_color?: string;
  frame_style: 'gold' | 'double' | 'neon' | 'minimal' | 'vintage' | 'rounded' | 'none';
  headline: string;
  subheadline?: string;
  footer_text?: string;
  show_logo: boolean;
  show_name: boolean;
  show_slogan: boolean;
  show_table: boolean;
  show_phone: boolean;
  phone_text?: string;
  show_instagram: boolean;
  instagram_text?: string;
  show_wifi: boolean;
  wifi_name?: string;
  wifi_pass?: string;
  custom_note?: string;
  badge_text?: string;
}

export interface MenuPreset {
  id: string;
  preset_name: string;
  saved_at?: string;
  name?: string;
  slogan?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  name_font?: string;
  crest_border?: string;
  crest_base?: string;
  crest_icon?: string;
  crest_ornament?: string;
  logo_pos?: string;
  name_pos?: string;
  menu_display_mode?: string;
  color_bg?: string;
  color_surface?: string;
  color_accent?: string;
  color_ok?: string;
  color_text?: string;
  menu_design?: MenuDesignConfig;
  active_promotion_id?: string | null;
  promotions?: MenuPromotion[];
  store_profile_data?: StoreProfileConfig;
  store_profiles?: StoreProfilePreset[];
  active_store_profile?: string | null;
  qr_designs?: QrDesignConfig[];
  active_qr_design?: string | null;
  ops_data?: BarOperationalData;
}

export type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro' | 'misto';

export interface PaymentSplit {
  method: Exclude<PaymentMethod, 'misto'>;
  amount: number;
}

export interface CashMovement {
  id: string;
  type: 'sangria' | 'suprimento';
  amount: number;
  reason: string;
  by: string;
  at: string;
}

export interface CashSaleRecord {
  id: string;
  tab_label: string;
  client_name: string;
  subtotal: number;
  service_fee: number;
  discount: number;
  discount_reason?: string;
  total: number;
  payment_method: PaymentMethod;
  splits?: PaymentSplit[];
  items_count: number;
  items_summary?: { name: string; qty: number; total: number; item_type?: ItemType }[];
  cmv_total: number;
  paid_at: string;
  by: string;
  order_ids: string[];
}

export interface CashRegisterShift {
  id: string;
  opened_by: string;
  opened_at: string;
  closed_by?: string;
  closed_at?: string;
  opening_float: number;
  closing_counted?: number;
  expected_cash?: number;
  cash_diff?: number;
  notes?: string;
  status: 'open' | 'closed';
  movements: CashMovement[];
  sales: CashSaleRecord[];
}

export interface StockLossRecord {
  id: string;
  item_id?: string;
  item_name: string;
  qty: number;
  unit: string;
  reason: 'quebra' | 'desperdicio' | 'cortesia' | 'vencido' | 'equipe';
  note?: string;
  estimated_cost: number;
  at: string;
  by: string;
}

export interface SupplierEntry {
  id: string;
  name: string;
  phone?: string;
  categories?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  actor: string;
  role: string;
  at: string;
}

export interface ReservationEntry {
  id: string;
  guest_name: string;
  phone?: string;
  party_size: number;
  date_time: string;
  table_label?: string;
  notes?: string;
  status: 'confirmada' | 'chegou' | 'cancelada';
  created_at: string;
}

export interface OrderModifierOption {
  id: string;
  name: string;
  price: number;
  applies_to: 'all' | 'drink' | 'petisco' | 'avulso';
}

export type PermissionKey =
  | 'can_cancel_order'
  | 'can_discount'
  | 'can_edit_prices'
  | 'can_close_shift'
  | 'can_manage_stock'
  | 'can_view_reports';

export interface HappyHourRule {
  id: string;
  name: string;
  active: boolean;
  days: number[]; // 0=Dom, 1=Seg ... 6=Sáb
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  discount_type: 'percent' | 'fixed_off' | 'fixed_price';
  discount_value: number;
  applies_to: 'all' | 'drink' | 'petisco' | 'avulso' | 'specific';
  recipe_ids?: string[];
  badge?: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  mode: 'stamps' | 'cashback';
  stamps_target: number;
  stamp_reward_value: number;
  stamp_reward_label: string;
  cashback_percent: number;
  min_redeem_value?: number;
}

export interface LoyaltyCustomerRecord {
  id: string;
  name: string;
  phone?: string;
  stamps: number;
  cashback_balance: number;
  total_redeemed: number;
  visits: number;
  total_spent: number;
  updated_at: string;
}

export interface TableCallAlert {
  id: string;
  bar_id: string;
  table_label?: string | null;
  client_name: string;
  kind: 'waiter' | 'bill';
  note?: string | null;
  status: 'open' | 'resolved';
  created_at: string;
}

export interface BarOperationalData {
  pix_key?: string;
  pix_merchant_name?: string;
  pix_city?: string;
  default_service_fee_pct?: number;
  printer_width?: '80mm' | '58mm';
  bluetooth_printer_enabled?: boolean;
  auto_deduct_stock?: boolean;
  role_permissions?: Record<string, Partial<Record<PermissionKey, boolean>>>;
  cash_shifts?: CashRegisterShift[];
  stock_losses?: StockLossRecord[];
  suppliers?: SupplierEntry[];
  audit_logs?: AuditLogEntry[];
  reservations?: ReservationEntry[];
  modifiers?: OrderModifierOption[];
  happy_hours?: HappyHourRule[];
  loyalty?: LoyaltyConfig;
  loyalty_customers?: LoyaltyCustomerRecord[];
}

export type BarPlanTier = 'free' | 'pro' | 'vip';

export type PartnerAdPlacement = 'panel' | 'explore' | 'menu_free' | 'all';

export interface PartnerAdBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  cta_label?: string | null;
  image_url?: string | null;
  click_url?: string | null;
  placement: PartnerAdPlacement;
  badge_text?: string | null;
  bg_color?: string | null;
  accent_color?: string | null;
  active: boolean;
  priority?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  created_at?: string;
}

export interface PlatformSaaSConfig {
  pro_price_monthly: number;
  pro_price_yearly: number;
  trial_days: number;
  free_max_tables: number;
  free_max_bars: number;
  support_whatsapp: string;
  checkout_monthly_url: string;
  checkout_yearly_url: string;
  adsense_enabled: boolean;
  adsense_client_id: string;
  adsense_slot_panel: string;
  adsense_slot_explore: string;
  adsense_slot_menu_free: string;
  ads_rotation_mode: 'partner_first' | 'adsense_first' | 'rotate';
  free_user_emails: string[];
}

export interface AdminBarOverview {
  id: string;
  name: string;
  handle?: string | null;
  city?: string | null;
  kind: string;
  owner: string;
  owner_email?: string | null;
  plan_tier?: BarPlanTier | null;
  plan_expires_at?: string | null;
  trial_ends_at?: string | null;
  plan_note?: string | null;
  created_at?: string;
  orders_count?: number;
  items_count?: number;
}

export interface Bar {
  id: string;
  owner: string;
  name: string;
  kind: string;
  accepting_orders?: boolean;
  shakers?: number[] | number;
  tiers?: unknown;
  handle?: string | null;
  city?: string | null;
  lat?: number | null;
  lon?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  slogan?: string | null;
  name_font?: string | null;
  crest_border?: string | null;
  crest_base?: string | null;
  crest_icon?: string | null;
  crest_ornament?: string | null;
  logo_pos?: string | null;
  name_pos?: string | null;
  menu_display_mode?: string | null;
  menu_presets?: MenuPreset[] | string | null;
  active_menu_preset?: string | null;
  menu_design?: MenuDesignConfig | null;
  menu_promotions?: MenuPromotion[] | null;
  active_promotion_id?: string | null;
  store_profile_data?: StoreProfileConfig | null;
  store_profiles?: StoreProfilePreset[] | null;
  active_store_profile?: string | null;
  qr_designs?: QrDesignConfig[] | null;
  active_qr_design?: string | null;
  phone?: string | null;
  instagram?: string | null;
  opening_hours?: string | null;
  about?: string | null;
  color_bg?: string | null;
  color_surface?: string | null;
  color_accent?: string | null;
  color_ok?: string | null;
  color_text?: string | null;
  base_cost?: number | null;
  table_names?: string[] | null;
  ops_data?: BarOperationalData | null;
  plan_tier?: BarPlanTier | null;
  plan_expires_at?: string | null;
  trial_ends_at?: string | null;
  plan_note?: string | null;
  created_at?: string;
}

export interface BarEntry {
  bar: Bar;
  role: string;
}

export interface BarItem {
  id: string;
  bar_id: string;
  category?: string | null;
  name: string;
  in_stock: boolean;
  brand?: string | null;
  variant?: string | null;
  unit?: string | null;
  size_ml?: number | null;
  level?: string | null;
  qty?: number | null;
  min_qty?: number | null;
  supplier?: string | null;
  unit_cost?: number | null;
  created_at?: string;
}

export interface RecipeIngredient {
  n: string;
  q?: string;
}

export interface Recipe {
  id: string;
  owner?: string | null;
  name: string;
  category: string;
  item_type?: ItemType | null;
  ingredients: RecipeIngredient[];
  steps?: string | null;
  instructions?: string | null;
  story?: string | null;
  description?: string | null;
  glass?: string | null;
  technique?: string | null;
  garnish?: string | null;
  tags?: string[] | null;
  image_url?: string | null;
  base_cost?: number | null;
  price?: number | null;
}

export interface Order {
  id: string;
  bar_id: string;
  recipe_id: string;
  client_name?: string | null;
  customer_name?: string | null;
  recipe_name?: string | null;
  qty: number;
  note?: string | null;
  price?: number | null;
  unit_price?: number | null;
  table_label?: string | null;
  table_tab_id?: string | null;
  station?: 'bar' | 'cozinha' | null;
  status: 'pending' | 'ready' | 'done';
  paid?: boolean;
  payment_method?: string | null;
  discount?: number | null;
  service_fee?: number | null;
  canceled_reason?: string | null;
  paid_at?: string | null;
  created_at?: string;
}

export interface TableTab {
  id: string;
  bar_id: string;
  table_label: string;
  code: string;
  opened_by: string;
  members: string[];
  status: 'open' | 'closed';
  created_at?: string;
  closed_at?: string | null;
}

export interface BarMember {
  id: string;
  bar_id: string;
  user_id: string;
  role: string;
  name?: string | null;
}

export interface BarServicePassword {
  id: string;
  bar_id: string;
  password?: string | null;
  access_code?: string | null;
  label?: string | null;
  created_at?: string;
}

export interface ServiceRequest {
  id: string;
  bar_id: string;
  requester_id: string;
  requester_name?: string | null;
  name?: string | null;
  role?: string | null;
  status: string;
  bars?: { name?: string; handle?: string } | null;
}

export interface StaffProfile {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  resume_pdf_url?: string | null;
  location?: string | null;
  skills?: string[] | null;
  work_mode?: string | null;
  experience_years?: number | null;
  bio?: string | null;
  availability?: string | null;
  updated_at?: string | null;
}

export interface JobPost {
  id: string;
  bar_id: string;
  title: string;
  role_needed: string;
  contract_type: string;
  location: string;
  pay_info?: string | null;
  description?: string | null;
  is_open: boolean;
  bars?: Partial<Bar> | null;
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  message?: string | null;
  job_posts?: { id?: string; title?: string; role_needed?: string } | null;
  staff_profiles?: StaffProfile | null;
}

export interface ClientOrderLocal {
  id: string;
  recipe_id?: string;
  name: string;
  qty: number;
  price?: number | null;
  status: string;
  d: string;
  ack?: boolean;
  tableTabId?: string;
}
