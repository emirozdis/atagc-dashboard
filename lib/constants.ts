export const PRIORITY_CITIES = ["İzmir", "Aydın", "Manisa", "Balıkesir"];

export const ALL_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", 
  "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", 
  "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", 
  "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Isparta", "Mersin", 
  "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", 
  "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", 
  "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", 
  "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", 
  "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", 
  "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];

// Sort logic: Priority cities first, then alphabetical
export const SORTED_CITIES = [
  ...PRIORITY_CITIES,
  ...ALL_CITIES.filter(city => !PRIORITY_CITIES.includes(city)).sort((a, b) => a.localeCompare(b, 'tr'))
];

// For Form Select Options
export const CITY_OPTIONS = SORTED_CITIES.map(city => ({
  label: city,
  value: city
}));

export const GRADE_OPTIONS = [
  { label: "Hazırlık", value: "prep" },
  { label: "9. Sınıf", value: "9" },
  { label: "10. Sınıf", value: "10" },
  { label: "11. Sınıf", value: "11" },
  { label: "12. Sınıf", value: "12" },
  { label: "Üniversite", value: "university" },
];