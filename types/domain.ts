export const CONTACT_STATUSES = [
  'NEW',
  'NEEDS_REVIEW',
  'NO_WEBSITE',
  'PREVIEW_GENERATING',
  'PREVIEW_READY',
  'READY_TO_CONTACT',
  'CONTACTED',
  'REPLIED',
  'INTERESTED',
  'NOT_INTERESTED',
  'DO_NOT_CONTACT',
  'PHONE_MISSING',
  'ERROR',
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export type WebsiteStatus = 'HAS_WEBSITE' | 'NO_WEBSITE' | 'NEEDS_REVIEW';

export interface PhotoAttribution {
  displayName?: string;
  uri?: string;
  photoUri?: string;
}

export interface PlacePhoto {
  name?: string;
  placeId?: string;
  index?: number;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: PhotoAttribution[];
}

export interface LeadRecord {
  id: string;
  google_place_id: string;
  name: string;
  phone_local: string | null;
  phone_international: string | null;
  address: string | null;
  city: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviews_count: number;
  business_status: string | null;
  maps_url: string | null;
  website_url: string | null;
  website_status: WebsiteStatus;
  opening_hours_json: string[];
  photos_json: PlacePhoto[];
  place_data_json: Record<string, unknown>;
  primary_type: string | null;
  types_json: string[];
  contact_status: ContactStatus;
  contact_block_reason: string | null;
  notes: string | null;
  last_contacted_at: string | null;
  last_google_fetch_at: string;
  created_at: string;
  updated_at: string;
}

export interface PreviewService {
  name: string;
  description: string;
  price?: string | null;
  editable: boolean;
}

export interface PreviewRecord {
  id: string;
  lead_id: string;
  slug: string;
  access_token_hash: string | null;
  public_share_code_hash: string | null;
  title: string;
  subtitle: string | null;
  about_text: string | null;
  services_json: PreviewService[];
  gallery_json: PlacePhoto[];
  theme_json: Record<string, unknown>;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachMessageRecord {
  id: string;
  lead_id: string | null;
  preview_id: string | null;
  message_text: string | null;
  ai_model: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SalonCampaignService {
  name: string;
  price: string | null;
}

export interface SalonCampaignAIContent {
  salon_title: string;
  salon_description: string;
  marketing_headline: string;
  short_location: string;
  short_working_hours: string;
  selected_services: SalonCampaignService[];
  whatsapp_message: string;
  image_text: {
    title: string;
    subtitle: string;
    description: string;
    location: string;
    working_hours: string;
    cta: string;
  };
  model?: string;
  used_fallback?: boolean;
}

export type SalonCampaignGenerationStatus =
  | 'draft'
  | 'generating'
  | 'ready_for_review'
  | 'ready_to_send'
  | 'partial_failure'
  | 'failed';

export type SalonCampaignSendStatus = 'not_sent' | 'ready' | 'sent' | 'failed';

export interface SalonCampaignRecord {
  id: string;
  lead_id: string;
  preview_id: string | null;
  salon_name: string;
  owner_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  maps_url: string | null;
  working_hours: string | null;
  services_json: SalonCampaignService[];
  instagram_url: string | null;
  tiktok_url: string | null;
  website_preview_url: string | null;
  ai_content_json: SalonCampaignAIContent | Record<string, unknown>;
  advertisement_image_path: string | null;
  advertisement_image_url: string | null;
  whatsapp_message: string | null;
  whatsapp_link: string | null;
  missing_fields: string[];
  generation_status: SalonCampaignGenerationStatus;
  send_status: SalonCampaignSendStatus;
  last_error: string | null;
  version: number;
  generated_at: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}
