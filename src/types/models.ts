export interface Clinic {
  clinic_id: number;
  name: string;
  address: string;
  contact_number: string;
  whatsapp_number: string;
  logo_url: string;
  operating_hours: string;
  is_paltuu_partner: boolean;
  google_maps_link?: string;
  discount_details?: string;
}

export interface Qualification {
  note: string;
  year_acquired: number;
  qualification_name: string;
  qualification_id: number;
}

export interface Specialization {
  category_id: number;
  category_name: string;
}

export interface Vet {
  vet_id: number;
  user_id: number;
  clinic_name: string;
  location: string;
  minimum_fee: number;
  email: string;
  contact_details: string;
  bio: string | null;
  name: string;
  profile_image_url: string | null;
  city_id: number;
  city_name: string;
  qualifications: Qualification[];
  specializations: Specialization[];
}

export interface ClinicDetails extends Clinic {
  vets: Vet[];
  reviews: {
    review_id: string;
    rating: number;
    review_content: string;
    review_date: string;
    review_maker_profile_image_url: string;
    review_maker_name: string;
  }[];
}
