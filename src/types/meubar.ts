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
  color_bg?: string | null;
  color_surface?: string | null;
  color_accent?: string | null;
  color_ok?: string | null;
  color_text?: string | null;
  base_cost?: number | null;
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
  size_ml?: number | null;
  level?: string | null;
  qty?: number | null;
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
  status: 'pending' | 'ready' | 'done';
  paid?: boolean;
  created_at?: string;
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
  bars?: {
    name?: string;
    handle?: string;
    city?: string;
    lat?: number | null;
    lon?: number | null;
  } | null;
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
}
