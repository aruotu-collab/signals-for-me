// 50 browseable demand categories — 20 starter ideas each (1,000 total).
export const DEMAND_CATEGORIES = [
  { key: "health", label: "Healthcare & Wellness", icon: "🦷" },
  { key: "automotive", label: "Car Services", icon: "🚗" },
  { key: "home", label: "Home Services", icon: "🏠" },
  { key: "food", label: "Food & Beverage", icon: "🍕" },
  { key: "childcare", label: "Childcare & Family", icon: "👶" },
  { key: "pets", label: "Pet Services", icon: "🐕" },
  { key: "finance", label: "Financial Services", icon: "💰" },
  { key: "business", label: "Business Services", icon: "💼" },
  { key: "ai", label: "AI & Technology", icon: "🤖" },
  { key: "education", label: "Education", icon: "📚" },
  { key: "travel", label: "Travel & Transport", icon: "✈️" },
  { key: "realestate", label: "Real Estate", icon: "🏘️" },
  { key: "beauty", label: "Beauty & Grooming", icon: "💅" },
  { key: "fitness", label: "Fitness & Sports", icon: "💪" },
  { key: "legal", label: "Legal", icon: "⚖️" },
  { key: "senior", label: "Senior Care", icon: "👴" },
  { key: "events", label: "Events & Parties", icon: "🎉" },
  { key: "sustainability", label: "Sustainability", icon: "🌱" },
  { key: "retail", label: "Retail & Shopping", icon: "🛍️" },
  { key: "logistics", label: "Logistics & Delivery", icon: "📦" },
  { key: "insurance", label: "Insurance", icon: "🛡️" },
  { key: "security", label: "Home & Personal Security", icon: "🔒" },
  { key: "wedding", label: "Weddings", icon: "💍" },
  { key: "photography", label: "Photography & Video", icon: "📸" },
  { key: "entertainment", label: "Entertainment", icon: "🎬" },
  { key: "tech", label: "Tech Repair & Setup", icon: "💻" },
  { key: "phone", label: "Phone & Devices", icon: "📱" },
  { key: "moving", label: "Moving & Storage", icon: "🚚" },
  { key: "laundry", label: "Laundry & Dry Cleaning", icon: "👔" },
  { key: "tailoring", label: "Tailoring & Alterations", icon: "✂️" },
  { key: "coworking", label: "Coworking & Office", icon: "🏢" },
  { key: "recruitment", label: "Recruitment & HR", icon: "🧑‍💼" },
  { key: "marketing", label: "Marketing & Growth", icon: "📣" },
  { key: "design", label: "Design & Creative", icon: "🎨" },
  { key: "writing", label: "Writing & Content", icon: "✍️" },
  { key: "music", label: "Music & Lessons", icon: "🎵" },
  { key: "outdoor", label: "Outdoor & Garden", icon: "🌳" },
  { key: "cleaning", label: "Cleaning Services", icon: "🧹" },
  { key: "plumbing", label: "Plumbing & Heating", icon: "🔧" },
  { key: "electrical", label: "Electrical Services", icon: "⚡" },
  { key: "renovation", label: "Renovation & Building", icon: "🔨" },
  { key: "childhood", label: "Kids Activities", icon: "🎈" },
  { key: "teen", label: "Teen Services", icon: "🧑" },
  { key: "parenting", label: "Parenting Support", icon: "👪" },
  { key: "elderly", label: "Elderly Support", icon: "🤝" },
  { key: "disability", label: "Accessibility & Disability", icon: "♿" },
  { key: "mental", label: "Mental Health", icon: "🧠" },
  { key: "pharmacy", label: "Pharmacy & Meds", icon: "💊" },
  { key: "dental", label: "Dental", icon: "🦷" },
  { key: "other", label: "Other", icon: "💡" },
] as const;

export type DemandCategoryKey = (typeof DEMAND_CATEGORIES)[number]["key"];

export function categoryLabel(key: string): string {
  return DEMAND_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function categoryIcon(key: string): string {
  return DEMAND_CATEGORIES.find((c) => c.key === key)?.icon ?? "💡";
}
