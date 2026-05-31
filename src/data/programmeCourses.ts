// Programme-specific course catalog (UMaT SPS)
// Populated progressively from official UMaT postgraduate programme documents.
// Add new departments/programmes here as their course lists become available.

export type CourseCategory = "core" | "elective" | "mandatory";

export interface ProgrammeCourse {
  code: string;
  name: string;
  credits: number;
  category: CourseCategory; // core = required taught, mandatory = seminar/research, elective = optional
}

export interface ProgrammeCourseCatalog {
  /** Unique key, e.g. "geomatic-msc" */
  key: string;
  /** Display name shown in selectors */
  label: string;
  department: string;
  /** Degree levels these courses apply to */
  levels: string[];
  courses: ProgrammeCourse[];
  /** Optional notes shown to the student (graduation requirements, prerequisites, etc.) */
  notes?: string[];
}

// Default credit weighting where the source document does not specify
const C = 3;

// ─── Geomatic Engineering ────────────────────────────────────────────────
// Source: UMaT SPS — Faculty of Geoscience and Environmental Studies,
// Geomatic Engineering Department postgraduate programmes.

const GEOMATIC_MSC_MPHIL: ProgrammeCourseCatalog = {
  key: "geomatic-msc-mphil",
  label: "Geomatic Engineering (MSc / MPhil)",
  department: "Geomatic Engineering",
  levels: ["MSc", "MPhil"],
  notes: [
    "Applicants without a Geomatic Engineering background must take and pass Introduction to Geomatics Engineering as a prerequisite.",
  ],
  courses: [
    // Mandatory seminar
    { code: "GM 550", name: "MSc/MPhil Seminar", credits: C, category: "mandatory" },
    // Core (compulsory taught)
    { code: "GM 473", name: "Computer Applications in Geomatic Engineering", credits: C, category: "core" },
    { code: "GM 555", name: "Statistical Models", credits: C, category: "core" },
    { code: "GM 571", name: "Geographic Information Systems", credits: C, category: "core" },
    { code: "GM 572", name: "Digital Photogrammetry", credits: C, category: "core" },
    { code: "GM 573", name: "Remote Sensing", credits: C, category: "core" },
    { code: "GM 578", name: "Global Navigation Satellite Systems", credits: C, category: "core" },
    { code: "GM 592", name: "Engineering Surveying", credits: C, category: "core" },
    // Electives
    { code: "GM 554", name: "Mine Economic and Financial Evaluation", credits: C, category: "elective" },
    { code: "GM 575", name: "Fleet Management", credits: C, category: "elective" },
    { code: "GM 576", name: "Environmental and Spatial Statistics", credits: C, category: "elective" },
    { code: "GM 577", name: "Land Administration and Information Systems", credits: C, category: "elective" },
    { code: "GM 579", name: "Shoreline Change Modelling and Prediction", credits: C, category: "elective" },
    { code: "GM 581", name: "Artificial Intelligence Application in Geomatic Engineering", credits: C, category: "elective" },
    { code: "GM 582", name: "GIS Modelling and Decision Support Systems", credits: C, category: "elective" },
    { code: "GM 583", name: "Geographic Data for Resource Management", credits: C, category: "elective" },
    { code: "GM 586", name: "Geographic Information Management", credits: C, category: "elective" },
    { code: "GM 587", name: "Advanced Least Squares Adjustment", credits: C, category: "elective" },
    { code: "GM 588", name: "Mine and Subsurface Surveying", credits: C, category: "elective" },
    { code: "GM 589", name: "Coastal Planning", credits: C, category: "elective" },
    { code: "GM 594", name: "Applications of GIS and Remote Sensing", credits: C, category: "elective" },
    { code: "GM 598", name: "Drone Technology and Application", credits: C, category: "elective" },
  ],
};

const GEOMATIC_PHD: ProgrammeCourseCatalog = {
  key: "geomatic-phd",
  label: "Geomatic Engineering (PhD)",
  department: "Geomatic Engineering",
  levels: ["PhD"],
  notes: [
    "GM 656 University Teaching Experience is compulsory only for UMaT staff pursuing PhD.",
  ],
  courses: [
    { code: "GM 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "GM 650", name: "PhD Seminar I", credits: C, category: "mandatory" },
    { code: "GM 660", name: "PhD Seminar II", credits: C, category: "mandatory" },
    { code: "GM 655", name: "Individual Studies", credits: C, category: "mandatory" },
    { code: "GM 656", name: "University Teaching Experience", credits: C, category: "mandatory" },
  ],
};

// ─── Electrical and Electronic Engineering ───────────────────────────────
// Source: UMaT SPS — Faculty of Engineering, Electrical and Electronic
// Engineering Department postgraduate modular programme (Jan–Dec 2026).

const EEE_MSC_MPHIL: ProgrammeCourseCatalog = {
  key: "eee-msc-mphil",
  label: "Electrical and Electronic Engineering (MSc / MPhil)",
  department: "Electrical and Electronic Engineering",
  levels: ["MSc", "MPhil"],
  notes: [
    "MSc requires a minimum of 57 credit hours: 7 compulsory core modules (≥21 credits), at least 3 electives, Postgraduate Seminar (3), Field/Laboratory Work (3) and Thesis (21).",
    "MPhil requires a minimum of 60 credit hours: 7 compulsory core modules (≥21 credits), at least 1 elective, Postgraduate Seminar (3), Field/Laboratory Work (3) and Thesis (30).",
    "Module fee: GH¢1,000.00 per module. Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // University mandatory
    { code: "EL 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "EL 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "EL 556", name: "Field/Laboratory Work", credits: C, category: "mandatory" },
    // Core (compulsory taught) modules
    { code: "EL 560", name: "Engineering Economics", credits: C, category: "core" },
    { code: "EL 571", name: "Modelling and Simulation", credits: C, category: "core" },
    { code: "EL 572", name: "Advanced Signal Processing", credits: C, category: "core" },
    { code: "EL 574", name: "Microprocessor Systems", credits: C, category: "core" },
    { code: "EL 575", name: "Power System Planning, Protection and Operations", credits: C, category: "core" },
    { code: "EL 579", name: "Computer Control Systems", credits: C, category: "core" },
    { code: "EL 586", name: "Mobile Communication Systems", credits: C, category: "core" },
    // Electives
    { code: "EL 553", name: "Operations Research", credits: C, category: "elective" },
    { code: "EL 573", name: "Power System Modelling, Stability and Control", credits: C, category: "elective" },
    { code: "EL 577", name: "Microwave Engineering and Optical Communication Systems", credits: C, category: "elective" },
    { code: "EL 578", name: "Broadcasting Technologies", credits: C, category: "elective" },
    { code: "EL 580", name: "Wireless Technologies", credits: C, category: "elective" },
    { code: "EL 581", name: "Advanced Robotics", credits: C, category: "elective" },
    { code: "EL 582", name: "Electrical Machines and Power Electronics Drives", credits: C, category: "elective" },
    { code: "EL 583", name: "Industrial Automation", credits: C, category: "elective" },
    { code: "EL 584", name: "Optimal Control Systems", credits: C, category: "elective" },
    { code: "EL 588", name: "Environmental and Safety Engineering", credits: C, category: "elective" },
    { code: "EL 590", name: "Power Systems Optimisation and Economics", credits: C, category: "elective" },
    { code: "EL 592", name: "Green Energy and Smart Grid Systems", credits: C, category: "elective" },
  ],
};

const EEE_PHD: ProgrammeCourseCatalog = {
  key: "eee-phd",
  label: "Electrical and Electronic Engineering (PhD)",
  department: "Electrical and Electronic Engineering",
  levels: ["PhD"],
  notes: [
    "Minimum 57 credit hours: Thesis (45), two Seminars (6), Research Methods (3) and Individual Studies (3).",
    "Preparatory modules (EL 401, EL 403, EL 405, EL 407) are mandatory for all PhD students.",
    "EL 656 University Teaching Experience is mandatory only for UMaT PhD students on staff development.",
    "Successful thesis defence and publication of at least two (2) technical papers are required for award of the PhD.",
  ],
  courses: [
    // University mandatory / research
    { code: "EL 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "EL 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "EL 655", name: "Individual Studies", credits: C, category: "mandatory" },
    { code: "EL 656", name: "University Teaching Experience", credits: C, category: "mandatory" },
    // Preparatory / Introductory (mandatory for all PhD students)
    { code: "EL 401", name: "MATLAB/Simulink for Engineers", credits: C, category: "core" },
    { code: "EL 403", name: "Introduction to Computer Applications", credits: C, category: "core" },
    { code: "EL 405", name: "Numerical Methods", credits: C, category: "core" },
    { code: "EL 407", name: "Probability and Statistics for Engineers", credits: C, category: "core" },
    // Audited / elective specialisation modules (selected with supervisor)
    { code: "EL 571", name: "Modelling and Simulation", credits: C, category: "elective" },
    { code: "EL 572", name: "Advanced Signal Processing", credits: C, category: "elective" },
    { code: "EL 573", name: "Power System Modelling, Stability and Control", credits: C, category: "elective" },
    { code: "EL 574", name: "Microprocessor Systems", credits: C, category: "elective" },
    { code: "EL 575", name: "Power System Planning, Protection and Operations", credits: C, category: "elective" },
    { code: "EL 577", name: "Microwave Engineering and Optical Communication Systems", credits: C, category: "elective" },
    { code: "EL 579", name: "Computer Control Systems", credits: C, category: "elective" },
    { code: "EL 581", name: "Advanced Robotics", credits: C, category: "elective" },
    { code: "EL 584", name: "Optimal Control Systems", credits: C, category: "elective" },
    { code: "EL 586", name: "Mobile Communication Systems", credits: C, category: "elective" },
    { code: "EL 590", name: "Power Systems Optimisation and Economics", credits: C, category: "elective" },
    { code: "EL 592", name: "Green Energy and Smart Grid Systems", credits: C, category: "elective" },
  ],
};

// ─── Mechanical Engineering ──────────────────────────────────────────────
// Source: UMaT SPS — Faculty of Engineering, Mechanical Engineering
// Department postgraduate modular programme (2025/2026 academic year).

const MECH_MSC_MPHIL: ProgrammeCourseCatalog = {
  key: "mech-msc-mphil",
  label: "Mechanical Engineering (MSc / MPhil)",
  department: "Mechanical Engineering",
  levels: ["MSc", "MPhil"],
  notes: [
    "MC 401, MC 403, MC 405 and MC 407 are audit courses for students without a Mechanical Engineering background (offered on demand).",
    "Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // University mandatory
    { code: "MC 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "MC 556", name: "Field/Laboratory Work", credits: C, category: "mandatory" },
    // Taught modules (selected with supervisor)
    { code: "MC 533", name: "Operations Research", credits: C, category: "elective" },
    { code: "MC 562", name: "Engineering Economics", credits: C, category: "elective" },
    { code: "MC 570", name: "Advanced Manufacturing Processes", credits: C, category: "elective" },
    { code: "MC 571", name: "Engineering Heat Transfer", credits: C, category: "elective" },
    { code: "MC 572", name: "Gas Turbines and Fuel Cells", credits: C, category: "elective" },
    { code: "MC 573", name: "Advanced Fluid Mechanics", credits: C, category: "elective" },
    { code: "MC 574", name: "Gas Dynamics", credits: C, category: "elective" },
    { code: "MC 575", name: "Computational Fluid Dynamics", credits: C, category: "elective" },
    { code: "MC 576", name: "Advanced Engineering Thermodynamics", credits: C, category: "elective" },
    { code: "MC 577", name: "Combustion and Internal Combustion Engines", credits: C, category: "elective" },
    { code: "MC 578", name: "Renewable Energy Resources", credits: C, category: "elective" },
    { code: "MC 580", name: "Composite Mechanics", credits: C, category: "elective" },
    { code: "MC 581", name: "Structural Optimisation", credits: C, category: "elective" },
    { code: "MC 582", name: "Fatigue and Fractures", credits: C, category: "elective" },
    { code: "MC 583", name: "Advanced Stress Analysis", credits: C, category: "elective" },
    { code: "MC 586", name: "Product System Automation", credits: C, category: "elective" },
    { code: "MC 588", name: "Advanced CAD/CAM", credits: C, category: "elective" },
    { code: "MC 589", name: "Product Modelling and Optimisation", credits: C, category: "elective" },
    { code: "MC 590", name: "Design and Development of Manufacturing Operations", credits: C, category: "elective" },
    { code: "MC 591", name: "Advanced Vibrations", credits: C, category: "elective" },
    { code: "MC 592", name: "Multi Body Dynamics and Robotics", credits: C, category: "elective" },
    { code: "MC 593", name: "Reverse Engineering and Rapid Prototyping", credits: C, category: "elective" },
    { code: "MC 594", name: "Material Selection in Mechanical Design", credits: C, category: "elective" },
    { code: "MC 595", name: "Industrial Production Management", credits: C, category: "elective" },
    { code: "MC 597", name: "Advanced Material Technology", credits: C, category: "elective" },
  ],
};

const MECH_PHD: ProgrammeCourseCatalog = {
  key: "mech-phd",
  label: "Mechanical Engineering (PhD)",
  department: "Mechanical Engineering",
  levels: ["PhD"],
  notes: [
    "MC 551 Research Methods and MC 655 Individual Studies are compulsory for all PhD candidates.",
    "MC 656 University Teaching Experience is compulsory only for Postgraduate Assistants.",
    "MC 401, MC 403, MC 405 and MC 407 are audit prerequisites for candidates without a Mechanical Engineering background (offered on demand).",
  ],
  courses: [
    { code: "MC 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "MC 655", name: "Individual Studies", credits: C, category: "mandatory" },
    { code: "MC 656", name: "University Teaching Experience", credits: C, category: "mandatory" },
    // Audit / preparatory
    { code: "MC 401", name: "Introduction to Mechanical Engineering", credits: C, category: "core" },
    { code: "MC 403", name: "Numerical Methods", credits: C, category: "core" },
    { code: "MC 405", name: "Control Systems", credits: C, category: "core" },
    { code: "MC 407", name: "Computer Applications: Programming in C/C++", credits: C, category: "core" },
  ],
};

export const PROGRAMME_COURSE_CATALOGS: ProgrammeCourseCatalog[] = [
  GEOMATIC_MSC_MPHIL,
  GEOMATIC_PHD,
  EEE_MSC_MPHIL,
  EEE_PHD,
  MECH_MSC_MPHIL,
  MECH_PHD,
];

export const getCatalogByKey = (key: string) =>
  PROGRAMME_COURSE_CATALOGS.find((c) => c.key === key);

export const getCatalogsByDepartment = (department: string) =>
  PROGRAMME_COURSE_CATALOGS.filter((c) => c.department === department);
