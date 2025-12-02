// SAED Skills array
export const SAED_SKILLS = [
  "Food Processing",
  "Animal Feed Production-Processing & Packaging",
  "Biofuel Production",
  "Agrochemicals",
  "Forestry",
  "Fish Farming",
  "Bee & Honey Farming",
  "Hydroponics",
  "Piggery",
  "Snail Production",
  "Poultry Farming",
  "Livestock Farming",
  "Crop Production",
  "Computer Hardware",
  "Software Development",
  "Internet and Networking Technologies",
  "Cloud Computing",
  "Mobile Devices",
  "Programming Language (Python)",
  "Programming Language (Java)",
  "Web Design",
  "Robotics",
  "Artificial Intelligence",
  "Data Analysis",
  "Automation",
  "Mobile App Development",
  "UI/UX Design",
  "Blockchain Technology",
  "Cybersecurity",
  "Digital Marketing",
  "Advertising and Marketing",
  "Fashion",
  "Film",
  "Video",
  "Music",
  "Publishing",
  "Pattern Drafting",
  "Gele",
  "Barbing and Hair Styling",
  "Interior Design",
  "Make-up",
  "Event Management",
  "Graphic Design",
  "Animation",
  "Theatre Arts",
  "Painting (Graffiti)",
  "Sculpting",
  "Drawing",
  "Choreography",
  "Leatherworks",
  "Aluminium & Steel Works",
  "3D Panels",
  "Electrical Works & Maintenance",
  "Interlock Making",
  "Paint Production",
  "Plumbing",
  "Block Production",
  "Screeding",
  "Tiling",
  "Recycling Waste",
  "Catering Services",
  "Drinks & Beverage Production",
  "Solar Panel Installation",
  "Inverter Battery Maintenance",
  "CCTV Installation & Maintenance",
  "Installation & Maintenance of Decoders",
  "Soap Making",
  "Organic Cream Production",
  "Hand Wash Production",
  "Liquid/Sanitiser Production",
  "Laundry",
  "Dry-Cleaning & Packaging",
  "Industrial Cleaning",
  "Alcohol Disinfectant Production",
  "Auto Electrician/Wiring",
  "Spray Painting",
  "Wheel Balancing and Alignment",
  "Engine Overhaul and Servicing",
  "Auto Air Conditioning",
  "Training",
  "Establishment of Day Care Centres",
  "Driving Schools",
  "Nursery and Primary Schools",
  "Delivery/Logistics Services",
  "Communication",
  "Collaboration",
  "Leadership",
  "Adaptability",
  "Problem Solving",
  "Time Management",
  "Creativity",
  "Emotional Intelligence",
  "Project Management",
  "Human Resource Management",
  "Customer Service and Relationship Management",
  "Health Safety and Environment",
];

// SAED Skill Trainers
export interface SAEDTrainer {
  name: string;
  business: string;
  sex: "M" | "F";
  skill: string;
  address: string;
  lga: string;
  phone: string;
  email: string;
}

export const SAED_TRAINERS: SAEDTrainer[] = [
  {
    name: "AROWOLO OLUWAKERMI TOSIN",
    business: "ALEMAX CREATIONS",
    sex: "F",
    skill: "FASHION (UNISEX)",
    address: "Suites 23, bailey's mall, Alagbaka",
    lga: "AKURE SOUTH",
    phone: "07031043118",
    email: "Temmykem@gmail.com",
  },
  {
    name: "OLATUBOSUM YUSUFF BARIKPEE",
    business: "MIZZY'S GLAM BEAUTY SALON",
    sex: "F",
    skill: "MAKE UP AND HAIR STYLING",
    address: "Shop 6, Adejuyibe sawmill complex, Oda Road",
    lga: "AKURE SOUTH",
    phone: "09030508292",
    email: "Mizpehboson@gmail.com",
  },
  {
    name: "BUSOLA SEUN KOMOLAFE",
    business: "BUSSY FASHION CREATIVE DESIGNS",
    sex: "F",
    skill: "FASHION DESIGNS AND STYLE INTERPRETATION",
    address: "15 Adeporoye Street, oluyuotu Quarters Akure",
    lga: "AKURE SOUTH",
    phone: "08130571152",
    email: "Bkomola#c46@yahoo.com",
  },
  {
    name: "ATUNPOR ISAAC",
    business: "INSPIRED ACE CONSULTING",
    sex: "M",
    skill: "PUBLIC SPEAKING",
    address: "Mouka foam building by No. 20, Temidire Street, Obele Akure",
    lga: "AKURE SOUTH",
    phone: "08169031459",
    email: "inspiredace@gmail.com",
  },
  {
    name: "OMOTOSHO JUMOKE",
    business: "PEAN PASTRIES HUB",
    sex: "M",
    skill: "BAKING",
    address: "Obele Akure",
    lga: "AKURE SOUTH",
    phone: "08061271198",
    email: "OmotoshoRuthS@gmail.com",
  },
  {
    name: "EDOR ABIGAIL F.",
    business: "HAYBEE EMPIRE ENTERPRISE",
    sex: "F",
    skill: "HAIR STYLING",
    address: "Shop 2, Sijuade hospital junction, Akure",
    lga: "AKURE SOUTH",
    phone: "07033196722",
    email: "Edorabigail@gmail.com",
  },
  {
    name: "OMOEJI IDOWU HAMAOLE",
    business: "CREDIOMETER LIMITED",
    sex: "M",
    skill: "ICT/OPERATIONS MANAGEMENT",
    address: "No. 1, Ilomu Junction, Oba-Adesida Road, Akure",
    lga: "AKURE SOUTH",
    phone: "08032531731",
    email: "Contact@crediometer.com",
  },
  {
    name: "OLATUNDE VICTOR ADEOLUWA",
    business: "THE GROWTH HUB",
    sex: "M",
    skill: "TECH AND ENTERPRISE SUPPORT",
    address: "White House opp. Treasure Hotel at Akad, Akure",
    lga: "AKURE SOUTH",
    phone: "08064917302",
    email: "Thegrowthhub30@gmail.com",
  },
  {
    name: "AIBINUOMO TEMILOLA",
    business: "TLR ORGANICS",
    sex: "F",
    skill: "COSMETOLOGY",
    address: "P16, Cuda office complex, Alagbaka, Akure",
    lga: "AKURE SOUTH",
    phone: "08102883351",
    email: "Tlrorganics@gmail.com",
  },
  {
    name: "TEMITOPE MOMOH",
    business: "ASOR CULTURE INT'L INITIATIVE",
    sex: "F",
    skill: "DIGITAL SKILLS",
    address: "Block 5 Plot 9, Illado Estate, Alagbaka, Akure",
    lga: "AKURE SOUTH",
    phone: "08033894734",
    email: "Temitopemomoh.com",
  },
  {
    name: "AKINTAYO OLUDUNMNI ADEBISI",
    business: "AFRICAN COLLEGE OF AGRICULTURE",
    sex: "F",
    skill: "ICT, CREATIVE INDUSTRY, GREEN ENERGY",
    address: "KM 4, Oba Ile Road, Akure",
    lga: "AKURE NORTH",
    phone: "08060178501",
    email: "Bunmiakintayo@onandmmail.com",
  },
  {
    name: "OLAGBEMIRO ADEJUMOKE ADESOLA",
    business: "EKLAT PROFIT LTD",
    sex: "F",
    skill: "EDUCATION",
    address: "4th Floor, Left Wing, Bank Of Industry Building, Akure",
    lga: "AKURE SOUTH",
    phone: "08037869158",
    email: "sumoke.olagbemiro@eklatprofit.com",
  },
  {
    name: "OJULARI OLAMETAN OLUWASEAMILOI A",
    business: "TENTAGROW INTEGRATED FARM LIMITED",
    sex: "F",
    skill: "SOFT SKILL",
    address: "23 Oshinta Street, Beside Adetola, Akure",
    lga: "AKURE SOUTH",
    phone: "07068399181",
    email: "Ojoiniari@gmail.com",
  },
  {
    name: "OBEDO UGOCHUNWU ANTHONY",
    business: "SABI PROGRAMMERS",
    sex: "M",
    skill: "SOFTWARE DEVELOPMENT",
    address: "74B Hospital Road, Continental Road, Akure",
    lga: "AKURE SOUTH",
    phone: "08065827397",
    email: "Obedsonline@gmail.com",
  },
  {
    name: "IGEOLATINKA SUNDAY",
    business: "SUNSTEL FARMS",
    sex: "M",
    skill: "AGRICULTURAL PRACTICE",
    address: "Plots 7 & 8 Cannuland Oba-Ile, Akure",
    lga: "AKURE SOUTH",
    phone: "08060759536",
    email: "igeyinka@gmail.com",
  },
  {
    name: "AKINYUUMI GIDEON",
    business: "SAFETY & PROTECTION OFFICERS NIGERIA",
    sex: "M",
    skill: "SELF EMPLOYABLE AND JOBS CREATION SKILLS",
    address: "NYSC Zonal Office, Oda Road, Akure",
    lga: "AKURE SOUTH",
    phone: "08038079547",
    email: "Adipasnaedu@gmail.com",
  },
  {
    name: "FALANA OLUWABUKOLA HELEN",
    business: "HIS MERCY SILHOUETTE COUTURE",
    sex: "F",
    skill: "CREATIVE SKILLS (FASHION)",
    address: "No. 59 Opp. Unity Bank, Oyemekun Road, Akure",
    lga: "AKURE SOUTH",
    phone: "08033634874",
    email: "Helemadejumo40@gmail.com",
  },
  {
    name: "AKINSIPE VICTOR TEMITOPE",
    business: "VICTEMA INTEGRATED SERVICES",
    sex: "M",
    skill: "GREEN ENERGY AND SECURITY GADGET INSTALLATION",
    address: "Opposite Fuel ulo, Beside Muslim prayer Ground, Oda Road, Akure",
    lga: "AKURE SOUTH",
    phone: "08065620308",
    email: "Akinsipevictortemitope@gmail.com",
  },
];

// Helper function to normalize strings for matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ") // Replace special chars with spaces
    .replace(/\s+/g, " "); // Normalize whitespace
}

// Helper function to check if two skill strings match
function skillsMatch(skill1: string, skill2: string): boolean {
  const norm1 = normalizeString(skill1);
  const norm2 = normalizeString(skill2);
  
  // Direct match
  if (norm1 === norm2) return true;
  
  // One contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Word-based matching
  const words1 = norm1.split(" ").filter(w => w.length > 2);
  const words2 = norm2.split(" ").filter(w => w.length > 2);
  
  // If they share significant words
  const commonWords = words1.filter(w => words2.includes(w));
  if (commonWords.length > 0 && commonWords.length >= Math.min(words1.length, words2.length) / 2) {
    return true;
  }
  
  return false;
}

// Helper function to match skills to trainers
export function getTrainersForSkill(skill: string): SAEDTrainer[] {
  if (!skill) return [];
  
  const normalizedSkill = skill.toLowerCase().trim();
  
  // Skill mappings - map from dropdown skill names to trainer skill variations
  const skillMappings: Record<string, string[]> = {
    "fashion": ["fashion", "creative skills (fashion)", "fashion designs and style interpretation"],
    "pattern drafting": ["fashion", "creative skills (fashion)", "fashion designs and style interpretation"],
    "make-up": ["make up and hair styling", "cosmetology"],
    "barbing and hair styling": ["make up and hair styling", "hair styling"],
    "software development": ["software development"],
    "programming language (python)": ["software development"],
    "programming language (java)": ["software development"],
    "web design": ["ict/operations management", "tech and enterprise support"],
    "mobile app development": ["software development"],
    "ui/ux design": ["tech and enterprise support"],
    "digital marketing": ["digital skills"],
    "advertising and marketing": ["digital skills"],
    "event management": ["event management"],
    "training": ["education"],
    "establishment of day care centres": ["education"],
    "nursery and primary schools": ["education"],
    "public speaking": ["public speaking"],
    "catering services": ["baking"],
    "crop production": ["agricultural practice"],
    "livestock farming": ["agricultural practice"],
    "poultry farming": ["agricultural practice"],
    "fish farming": ["agricultural practice"],
    "green energy and security gadget installation": ["green energy and security gadget installation"],
    "solar panel installation": ["green energy and security gadget installation"],
    "ict/operations management": ["ict/operations management", "tech and enterprise support"],
    "communication": ["soft skill"],
    "collaboration": ["soft skill"],
    "leadership": ["soft skill"],
    "problem solving": ["soft skill"],
  };
  
  const matchingTrainers: SAEDTrainer[] = [];
  
  // Find all matching trainers
  for (const trainer of SAED_TRAINERS) {
    const trainerSkill = trainer.skill;
    
    // Direct matching
    if (skillsMatch(skill, trainerSkill)) {
      matchingTrainers.push(trainer);
      continue;
    }
    
    // Check skill mappings
    const mappings = skillMappings[normalizedSkill] || [];
    for (const mappedSkill of mappings) {
      if (skillsMatch(mappedSkill, trainerSkill)) {
        matchingTrainers.push(trainer);
        break;
      }
    }
    
    // Fuzzy matching for partial words
    const skillWords = normalizedSkill.split(/\s+/).filter(w => w.length > 3);
    const trainerWords = normalizeString(trainerSkill).split(/\s+/).filter(w => w.length > 3);
    
    if (skillWords.length > 0) {
      const matchingWords = skillWords.filter(sw => 
        trainerWords.some(tw => tw.includes(sw) || sw.includes(tw))
      );
      
      // If more than half the skill words match trainer skill
      if (matchingWords.length > skillWords.length / 2) {
        matchingTrainers.push(trainer);
        continue;
      }
    }
  }
  
  // Remove duplicates
  return matchingTrainers.filter((trainer, index, self) =>
    index === self.findIndex((t) => t.name === trainer.name && t.phone === trainer.phone)
  );
}

