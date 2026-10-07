const maintenanceData = {
  metadata: {
    company_ar: "الحاج حسين علي رضا وشريكه المحدودة",
    company_en: "Haji Husein Alireza & Co. Ltd.",
    document_title_ar: "جدول الصيانة الدورية المقترح - مازدا",
    document_title_en: "Mazda Scheduled Maintenance Table",
    model_series: "GJ / GL 6 / مازدا 6",
    document_code: "GMSVF.068",
    slogan: "قطع غيار أصلية، وخدمة ممتازة"
  },
  legend: {
    "I": { ar: "فحص", en: "Inspect" },
    "R": { ar: "تغيير / استبدال", en: "Replace" },
    "T": { ar: "تربيط", en: "Tighten" },
    "C": { ar: "تنظيف", en: "Clean" },
    "F": { ar: "ملء وتعبئة", en: "Fill / Top-up" },
    ".": { ar: "دائماً عند الصيانة", en: "Always during service" }
  },
  general_notes: [
    "منظف الرواسب: يُضاف في التانكي عند كل صيانة دورية.",
    "سائل التبريد FL22: يُغير لأول مرة عند 200,000 كم أو 10 سنوات، وبعد ذلك يُغير كل 100,000 كم أو كل 5 سنوات.",
    "فلتر الهواء: يُنظف أو يُستبدل في فترات أسرع قبل الكيلومتر الموصى به عند القيادة في أجواء مغبرة أو رملية."
  ],
  mileage_intervals_km: [
    10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 
    90000, 100000, 110000, 120000, 130000, 140000, 150000
  ],
  maintenance_items: [
    {
      id: 1,
      item_ar: "صيانة الفاصل الدورية",
      item_en: "Periodic Interval Maintenance",
      action: ".",
      interval_note: "تطبق عند كل 10,000 كم"
    },
    {
      id: 2,
      item_ar: "تلبيس المقاعد والطارة والأرضية والرفوف",
      item_en: "Protective Covers (Seats, Steering Wheel, Floor, Fenders)",
      action: ".",
      interval_note: "تطبق عند كل صيانة"
    },
    {
      id: 3,
      item_ar: "أحزمة الأمان وأقفالها",
      item_en: "Seatbelts and Buckles",
      action: ".",
      interval_note: "فحص عند كل صيانة"
    },
    {
      id: 4,
      item_ar: "الإضاءة الخارجية والداخلية / المصابيح / المساحات / السوائل",
      item_en: "Exterior/Interior Lights, Bulbs, Wipers, Washers",
      action: ".",
      interval_note: "فحص عند كل صيانة"
    },
    {
      id: 5,
      item_ar: "الكشف على السيور",
      item_en: "Drive Belts Inspection",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 6,
      item_ar: "البواجي (محرك توربو)",
      item_en: "Spark Plugs (Turbo Engine)",
      action: "R",
      interval_note: "تغيير كل 60,000 كم"
    },
    {
      id: 7,
      item_ar: "البواجي (بدون توربو)",
      item_en: "Spark Plugs (Non-Turbo Engine)",
      action: "R",
      interval_note: "تغيير كل 120,000 كم"
    },
    {
      id: 8,
      item_ar: "زيت الماكينة",
      item_en: "Engine Oil",
      action: "R",
      schedule: { "10k-150k": "R" },
      interval_note: "تغيير كل 10,000 كم"
    },
    {
      id: 9,
      item_ar: "فلتر زيت الماكينة",
      item_en: "Engine Oil Filter",
      action: "R",
      schedule: { "10k-150k": "R" },
      interval_note: "تغيير كل 10,000 كم"
    },
    {
      id: 10,
      item_ar: "نظام التبريد / مستوى سائل التبريد",
      item_en: "Cooling System / Coolant Level",
      action: "I",
      schedule: { "10k-150k": "I" },
      special_rule: "FL22 Coolant: Replace at 200,000 km / 10 years, then every 100,000 km / 5 years."
    },
    {
      id: 11,
      item_ar: "نظافة فلتر الهواء",
      item_en: "Air Filter Cleaning/Replacement",
      action: "C / R",
      schedule: {
        "10k": "C", "20k": "R", "30k": "C", "40k": "R", "50k": "C",
        "60k": "R", "70k": "C", "80k": "R", "90k": "C", "100k": "R",
        "110k": "C", "120k": "R", "130k": "C", "140k": "R", "150k": "C"
      }
    },
    {
      id: 12,
      item_ar: "الكشف على مواسير البنزين والتوصيلات",
      item_en: "Fuel Lines & Connections Inspection",
      action: "I",
      interval_note: "فحص كل 80,000 كم"
    },
    {
      id: 13,
      item_ar: "مستوى سائل البطارية وأداء البطارية",
      item_en: "Battery Fluid Level & Performance",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 14,
      item_ar: "خطوط الفرامل والخراطيم والتوصيلات",
      item_en: "Brake Lines, Hoses & Connections",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 15,
      item_ar: "سائل الفرامل",
      item_en: "Brake Fluid",
      action: "R",
      schedule: {
        "10k": "I", "20k": "I", "30k": "I", "40k": "R", "50k": "I",
        "60k": "I", "70k": "I", "80k": "R", "90k": "I", "100k": "I",
        "110k": "I", "120k": "R", "130k": "I", "140k": "I", "150k": "I"
      }
    },
    {
      id: 16,
      item_ar: "الكشف على فرامل اليد",
      item_en: "Parking Brake Inspection",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 17,
      item_ar: "وحدة كبح معززة بالطاقة",
      item_en: "Power Brake Booster",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 18,
      item_ar: "هوبات الفرامل / أقمشة الفرامل (الأمامية والخلفية)",
      item_en: "Brake Discs & Pads (Front & Rear)",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 19,
      item_ar: "عجلة القيادة والتوصيلات",
      item_en: "Steering Wheel & Linkages",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 20,
      item_ar: "نظام التعليق الأمامي والخلفي، وصلة كروية",
      item_en: "Front & Rear Suspension, Ball Joints",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 21,
      item_ar: "جلود العكوس",
      item_en: "Driveshaft Dust Boots / CV Boots",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 22,
      item_ar: "نظام العادم والعوازل",
      item_en: "Exhaust System & Heat Shields",
      action: "I",
      interval_note: "فحص كل 80,000 كم"
    },
    {
      id: 23,
      item_ar: "المزاليج والصواميل على الشاسية والجسم (المسامير)",
      item_en: "Chassis & Body Bolts/Nuts",
      action: "T",
      schedule: { "10k-150k": "T" }
    },
    {
      id: 24,
      item_ar: "فلتر تنقية هواء المكيف",
      item_en: "Cabin Air Filter",
      action: "R",
      schedule: {
        "20k": "R", "40k": "R", "60k": "R", "80k": "R",
        "100k": "R", "120k": "R", "140k": "R"
      }
    },
    {
      id: 25,
      item_ar: "الإطارات والضغط (بما في ذلك الاحتياطي)",
      item_en: "Tire Pressure & Condition (Including Spare)",
      action: "I",
      schedule: { "10k-150k": "I" }
    },
    {
      id: 26,
      item_ar: "عكس الإطارات / تهيئة TPMS",
      item_en: "Tire Rotation & TPMS Reset",
      action: "I",
      interval_note: "تدوير كل 10,000 كم"
    },
    {
      id: 27,
      item_ar: "منظف الرواسب (بخاخات / تانكي)",
      item_en: "Deposit Cleaner / Fuel Additive",
      action: "F",
      schedule: { "10k-150k": "F" },
      interval_note: "إضافة عند كل صيانة دورية (كل 10,000 كم)"
    },
    {
      id: 28,
      item_ar: "فلتر البنزين",
      item_en: "Fuel Filter",
      action: "R",
      interval_note: "تغيير كل 60,000 كم"
    }
  ]
};

// تسعيرات شغل اليد للصيانة الدورية (من 10,000 إلى 160,000 كم) - جميع الأسعار شاملة الضريبة 15%
const maintenancePricing = {
  currency: "SAR",
  vat_included: true,
  labor_items: {
    oil_and_filter: {
      name_ar: "غيار زيت المحرك + فلتر زيت + صرة + وردة",
      name_en: "Engine Oil + Oil Filter + Drain Plug + Washer",
      price: 57.5,
      applies_to: "جميع موديلات وفئات مازدا",
      interval_note: "عند كل صيانة دورية (كل 10,000 كم)"
    },
    multi_point_inspection: {
      name_ar: "كشف النقاط المتعددة والتربيط والفحص الشامل",
      name_en: "Multi-point Inspection & Tightening",
      price: 115,
      applies_to: "جميع موديلات وفئات مازدا",
      interval_note: "كل 10 آلاف كم (من 10,000 إلى 160,000 كم)",
      includes_notes: [
        "غيار فلاتر الهواء والمكيف شغل يدها من ضمن الحسبة (بدون أجور إضافية)",
        "تعبئة منظف الرواسب في التانكي من ضمن الحسبة"
      ]
    },
    spark_plugs: {
      name_ar: "غيار شمعات الإشعال (البواجي)",
      name_en: "Spark Plugs Replacement",
      interval_note: "كل 60,000 كم للتيربو، وكل 120,000 كم لغير التيربو",
      prices_by_model: {
        "mazda6": 57.5,
        "cx3": 57.5,
        "cx30": 57.5,
        "cx5": 57.5,
        "mazda3": 57.5,
        "cx9": 115,
        "cx90": 402.5,
        "cx60": 402.5
      }
    },
    brake_fluid: {
      name_ar: "غيار زيت الفرامل + تنسيم النظام كامل",
      name_en: "Brake Fluid Replacement & Bleed",
      interval_note: "كل 40,000 كم ومضاعفاتها (40k, 80k, 120k, 160k)",
      prices_by_model: {
        "mazda6": 172.5,
        "cx3": 172.5,
        "cx30": 172.5,
        "cx5": 172.5,
        "mazda3": 172.5,
        "cx9": 172.5,
        "cx90": 230, // مع برمجة
        "cx60": 230  // مع برمجة
      }
    },
    fuel_filter: {
      name_ar: "غيار فلتر البنزين / الصفاية أو كلاهما",
      name_en: "Fuel Filter / Strainer Replacement",
      interval_note: "كل 60,000 كم ومضاعفاتها (60k, 120k)",
      prices_by_model: {
        "mazda6": 172.5,
        "cx3": 172.5,
        "cx30": 172.5,
        "cx5": 172.5,
        "mazda3": 172.5,
        "cx9": 172.5,
        "cx90": 230,
        "cx60": 230
      }
    }
  }
};

// الدالة المساعدة لحساب تكلفة الصيانة بدقة لأي موديل وأي ممشى
function calculateMaintenanceCost(modelName = 'mazda6', mileageKm = 10000, isTurbo = false) {
  const normModel = (modelName || '').toLowerCase().replace(/[\s\-_]/g, '');
  let modelKey = 'mazda6';
  if (normModel.includes('cx90')) modelKey = 'cx90';
  else if (normModel.includes('cx60')) modelKey = 'cx60';
  else if (normModel.includes('cx9')) modelKey = 'cx9';
  else if (normModel.includes('cx5')) modelKey = 'cx5';
  else if (normModel.includes('cx30')) modelKey = 'cx30';
  else if (normModel.includes('cx3')) modelKey = 'cx3';
  else if (normModel.includes('3')) modelKey = 'mazda3';

  const items = [];
  let totalCost = 0;

  // 1. كشف النقاط المتعددة (ثابت في كل صيانة من 10k إلى 160k)
  const inspection = maintenancePricing.labor_items.multi_point_inspection.price;
  items.push({
    item_ar: "كشف النقاط المتعددة والتربيط والفحص الشامل (يشمل فلاتر الهواء والمكيف وتعبئة منظف الرواسب)",
    cost: inspection
  });
  totalCost += inspection;

  // 2. غيار زيت المحرك وفلتر الزيت والصرة والوردة (ثابت في كل صيانة)
  const oil = maintenancePricing.labor_items.oil_and_filter.price;
  items.push({
    item_ar: "أجور غيار زيت المحرك + فلتر زيت + صرة + وردة",
    cost: oil
  });
  totalCost += oil;

  // 3. زيت الفرامل وتنسيم النظام (كل 40,000 كم ومضاعفاتها)
  if (mileageKm % 40000 === 0 && mileageKm > 0) {
    const brakeCost = maintenancePricing.labor_items.brake_fluid.prices_by_model[modelKey] || 172.5;
    items.push({
      item_ar: modelKey === 'cx90' || modelKey === 'cx60' 
        ? "غيار زيت الفرامل + تنسيم النظام كامل مع البرمجة"
        : "غيار زيت الفرامل + تنسيم النظام كامل",
      cost: brakeCost
    });
    totalCost += brakeCost;
  }

  // 4. فلتر البنزين / الصفاية (كل 60,000 كم ومضاعفاتها)
  if (mileageKm % 60000 === 0 && mileageKm > 0) {
    const fuelCost = maintenancePricing.labor_items.fuel_filter.prices_by_model[modelKey] || 172.5;
    items.push({
      item_ar: "غيار فلتر البنزين / الصفاية أو كلاهما",
      cost: fuelCost
    });
    totalCost += fuelCost;
  }

  // 5. البواجي (التيربو كل 60k، العادي كل 120k)
  const isSparkDue = (isTurbo && mileageKm % 60000 === 0 && mileageKm > 0) || 
                     (!isTurbo && mileageKm % 120000 === 0 && mileageKm > 0);
  if (isSparkDue) {
    const sparkCost = maintenancePricing.labor_items.spark_plugs.prices_by_model[modelKey] || 57.5;
    items.push({
      item_ar: `غيار شمعات الإشعال (البواجي)${isTurbo ? ' - محرك تيربو' : ''}`,
      cost: sparkCost
    });
    totalCost += sparkCost;
  }

  return {
    model: modelKey,
    mileageKm,
    items,
    totalLaborCost: totalCost,
    currency: "ريال",
    vat_included: true,
    labor_only: true,
    note: "الأسعار تخص أجور اليد فقط شاملة ضريبة القيمة المضافة 15%، ولا تشمل قيمة قطع الغيار أو الزيوت."
  };
}

// Helper function to get service items for a specific mileage (e.g. 10000, 20000, 40000, 60000)
function getServiceByMileage(mileageKm) {
  const k = `${Math.round(mileageKm / 1000)}k`;
  return maintenanceData.maintenance_items.filter(item => {
    if (item.action === '.') return true;
    if (item.schedule) {
      if (item.schedule['10k-150k']) return true;
      if (item.schedule[k]) return true;
    }
    if (item.interval_note && item.interval_note.includes(`${mileageKm.toLocaleString()}`)) return true;
    return false;
  });
}

module.exports = {
  maintenanceData,
  maintenancePricing,
  calculateMaintenanceCost,
  getServiceByMileage
};

