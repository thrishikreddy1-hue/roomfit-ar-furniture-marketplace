// Additive showcase data. Import these records explicitly; never reset a live database.
// Screenshots and unmodified models are referenced from Khronos glTF-Sample-Assets.
const root = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models';
const shot = (model) => `${root}/${model}/screenshot/screenshot.jpg`;
const source = (model) => `https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/${model}`;
const ccBy = 'https://creativecommons.org/licenses/by/4.0/';
const ccZero = 'https://creativecommons.org/publicdomain/zero/1.0/';

const shops = [
  { id: 'sample-roomfit-living', name: 'Sample · Living Collection', coverModel: 'GlamVelvetSofa' },
  { id: 'sample-roomfit-seating', name: 'Sample · Seating Studio', coverModel: 'SheenChair' },
  { id: 'sample-roomfit-accents', name: 'Sample · Lighting & Accents', coverModel: 'GlassVaseFlowers' },
].map(({ coverModel, ...shop }) => ({
  ...shop, ownerId: null, isSample: true, city: 'Sample showroom', address: '', phone: '',
  description: 'An illustrative RoomFit collection for exploring photos, dimensions, and AR. These are sample listings, not an operating shop.',
  logo: shot(coverModel), coverImage: shot(coverModel), whatsappNotifications: false,
  deliveryAreas: '', deliveryLeadTime: '', assemblyAvailable: false, pickupAvailable: false,
}));

const entries = [
  { model: 'GlamVelvetSofa', name: 'Velvet Sofa', shopId: shops[0].id, category: 'Sofas', material: 'Velvet, wood frame', color: 'Navy', dimensions: { width: 219, depth: 102, height: 79 }, attribution: 'Wayfair, LLC (2021); Eric Chadwick.', license: ccBy },
  { model: 'SheenWoodLeatherSofa', name: 'Wood & Leather Sofa', shopId: shops[0].id, category: 'Sofas', material: 'Leather, wood', color: 'Cognac', dimensions: { width: 273, depth: 92, height: 112 }, attribution: 'Original asset: Fran Calvente (2021), CC0. Improvements: Darmstadt Graphics Group GmbH / Eric Chadwick (2024), CC BY 4.0.', license: ccBy },
  { model: 'SpecularSilkPouf', name: 'Silk Pouf', shopId: shops[0].id, category: 'Decor', material: 'Silk blend', color: 'Pearl', dimensions: { width: 61, depth: 61, height: 20 }, attribution: 'Wayfair, LLC (2023); Eric Chadwick.', license: ccBy },
  { model: 'SheenChair', name: 'Velvet Accent Chair', shopId: shops[1].id, category: 'Chairs', material: 'Fabric, wood', color: 'Mango', dimensions: { width: 83, depth: 57, height: 69 }, attribution: 'Wayfair, LLC (2020); Eric Chadwick.', license: ccZero },
  { model: 'ChairDamaskPurplegold', name: 'Damask Armchair', shopId: shops[1].id, category: 'Chairs', material: 'Jacquard, carved wood', color: 'Purple & gold', dimensions: { width: 83, depth: 57, height: 69 }, attribution: 'Wayfair (2021); Eric Chadwick.', license: ccBy },
  { model: 'AnisotropyBarnLamp', name: 'Brushed Barn Lamp', shopId: shops[2].id, category: 'Lighting', material: 'Brushed steel', color: 'Gunmetal', dimensions: { width: 19, depth: 23, height: 26 }, attribution: 'Wayfair, LLC (2023); Eric Chadwick.', license: ccBy },
  { model: 'IridescenceLamp', name: 'Iridescent Table Lamp', shopId: shops[2].id, category: 'Lighting', material: 'Glass, metal', color: 'Iridescent', dimensions: { width: 30, depth: 30, height: 48 }, attribution: 'Wayfair, LLC (2022); Eric Chadwick.', license: ccBy },
  { model: 'GlassVaseFlowers', name: 'Glass Vase & Flowers', shopId: shops[2].id, category: 'Decor', material: 'Glass', color: 'Clear', dimensions: { width: 22, depth: 14, height: 20 }, attribution: 'Glass vase: Eric Chadwick (2023). Flowers: Rico Cilliers (2023).', license: ccZero },
];

const products = entries.map(({ model, name, attribution, license, ...product }) => ({
  ...product, id: `sample-${model.toLowerCase()}`, name: `Sample · ${name}`, isSample: true,
  stock: 0, availability: 'available', placement: 'floor', viewCount: 0,
  images: [shot(model)], modelUrl: `${root}/${model}/glTF-Binary/${model}.glb`, iosModelUrl: '',
  description: 'Sample preview only, not for sale. Listed dimensions are illustrative; use the model-size warning when checking scale. Models and screenshots are unmodified references from Khronos glTF-Sample-Assets.',
  assetAttribution: attribution, assetSourceUrl: source(model), assetLicenseUrl: license,
}));

module.exports = { shops, products };
