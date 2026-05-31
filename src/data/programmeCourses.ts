// Programme-specific course catalog (UMaT SPS)
// Populated progressively from official UMaT postgraduate programme documents.
// Add new departments/programmes here as their course lists become available.

export type CourseCategory = "core" | "elective" | "mandatory";

export type AdmissionCycle = "January" | "July";

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
  /** Admission cycle this catalog applies to (UMaT runs dual January/July intakes). */
  admissionCycle?: AdmissionCycle;
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
  admissionCycle: "January",
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
  admissionCycle: "January",
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
  admissionCycle: "January",
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
  admissionCycle: "January",
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

// ─── Electrical and Electronic Engineering (July intake) ─────────────────
// Source: UMaT SPS — Faculty of Engineering, Electrical and Electronic
// Engineering Department postgraduate modular programme, 2025/2026 academic
// year July admission cycle (modules run July 2025 – June 2026).

const EEE_MSC_MPHIL_JULY: ProgrammeCourseCatalog = {
  key: "eee-msc-mphil-july",
  label: "Electrical and Electronic Engineering (MSc / MPhil) — July",
  department: "Electrical and Electronic Engineering",
  levels: ["MSc", "MPhil"],
  admissionCycle: "July",
  notes: [
    "July 2025/2026 intake schedule. Modules run from 7th July 2025 to 19th June 2026.",
    "MSc requires a minimum of 57 credit hours: 7 compulsory core modules (≥21 credits), at least 3 electives, Postgraduate Seminar (3), Field/Laboratory Work (3) and Thesis (21).",
    "MPhil requires a minimum of 60 credit hours: 7 compulsory core modules (≥21 credits), at least 1 elective, Postgraduate Seminar (3), Field/Laboratory Work (3) and Thesis (30).",
    "Module fee: GH¢1,000.00 per registered student / GH¢1,400.00 per non-registered participant / $500.00 per foreign participant. Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // University mandatory
    { code: "EL 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "EL 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "EL 556", name: "Field/Laboratory Work", credits: C, category: "mandatory" },
    // Preparatory / Introductory (audit for students without EEE background)
    { code: "EL 401", name: "MATLAB/Simulink for Engineers", credits: C, category: "core" },
    { code: "EL 403", name: "Introduction to Computer Applications", credits: C, category: "core" },
    { code: "EL 405", name: "Numerical Methods", credits: C, category: "core" },
    { code: "EL 407", name: "Probability and Statistics for Engineers", credits: C, category: "core" },
    // Core (compulsory taught) modules
    { code: "EL 560", name: "Engineering Economics", credits: C, category: "core" },
    { code: "EL 571", name: "Modelling and Simulation", credits: C, category: "core" },
    { code: "EL 572", name: "Advanced Signal Processing", credits: C, category: "core" },
    { code: "EL 573", name: "Artificial Intelligence in Manufacturing", credits: C, category: "core" },
    { code: "EL 574", name: "Microprocessor Systems", credits: C, category: "core" },
    { code: "EL 575", name: "Power System Planning, Protection and Operations", credits: C, category: "core" },
    { code: "EL 579", name: "Computer Control Systems", credits: C, category: "core" },
    // Electives / specialisation modules
    { code: "EL 553", name: "Operations Research", credits: C, category: "elective" },
    { code: "EL 576", name: "Power System Modelling, Stability and Control", credits: C, category: "elective" },
    { code: "EL 577", name: "Microwave Engineering and Optical Communication Systems", credits: C, category: "elective" },
    { code: "EL 578", name: "Broadcasting Technologies", credits: C, category: "elective" },
    { code: "EL 580", name: "Wireless Technologies", credits: C, category: "elective" },
    { code: "EL 581", name: "Advanced Robotics", credits: C, category: "elective" },
    { code: "EL 582", name: "Electrical Machines and Power Electronics Drives", credits: C, category: "elective" },
    { code: "EL 583", name: "Industrial Automation", credits: C, category: "elective" },
    { code: "EL 584", name: "Optimal Control Systems", credits: C, category: "elective" },
    { code: "EL 586", name: "Mobile Communication Systems", credits: C, category: "elective" },
    { code: "EL 588", name: "Environmental and Safety Engineering", credits: C, category: "elective" },
    { code: "EL 590", name: "Power Systems Optimisation and Economics", credits: C, category: "elective" },
    { code: "EL 592", name: "Green Energy and Smart Grid Systems", credits: C, category: "elective" },
  ],
};

const EEE_PHD_JULY: ProgrammeCourseCatalog = {
  key: "eee-phd-july",
  label: "Electrical and Electronic Engineering (PhD) — July",
  department: "Electrical and Electronic Engineering",
  levels: ["PhD"],
  admissionCycle: "July",
  notes: [
    "July 2025/2026 intake schedule. Modules run from 7th July 2025 to 19th June 2026.",
    "Minimum 57 credit hours: Thesis (45), two Seminars (6), Research Methods (3) and Individual Studies (3).",
    "Preparatory modules (EL 401, EL 403, EL 405, EL 407) are mandatory for all PhD students without an EEE background.",
    "EL 656 University Teaching Experience is mandatory only for UMaT PhD students on staff development.",
    "Successful thesis defence and publication of at least two (2) technical papers are required for award of the PhD.",
  ],
  courses: [
    // University mandatory / research
    { code: "EL 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "EL 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "EL 655", name: "Individual Studies", credits: C, category: "mandatory" },
    { code: "EL 656", name: "University Teaching Experience", credits: C, category: "mandatory" },
    // Preparatory / Introductory
    { code: "EL 401", name: "MATLAB/Simulink for Engineers", credits: C, category: "core" },
    { code: "EL 403", name: "Introduction to Computer Applications", credits: C, category: "core" },
    { code: "EL 405", name: "Numerical Methods", credits: C, category: "core" },
    { code: "EL 407", name: "Probability and Statistics for Engineers", credits: C, category: "core" },
    // Audited / elective specialisation modules (selected with supervisor)
    { code: "EL 571", name: "Modelling and Simulation", credits: C, category: "elective" },
    { code: "EL 572", name: "Advanced Signal Processing", credits: C, category: "elective" },
    { code: "EL 573", name: "Artificial Intelligence in Manufacturing", credits: C, category: "elective" },
    { code: "EL 574", name: "Microprocessor Systems", credits: C, category: "elective" },
    { code: "EL 575", name: "Power System Planning, Protection and Operations", credits: C, category: "elective" },
    { code: "EL 576", name: "Power System Modelling, Stability and Control", credits: C, category: "elective" },
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
  admissionCycle: "January",
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
  admissionCycle: "January",
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

// ─── Mathematics ─────────────────────────────────────────────────────────
// Source: UMaT SPS — Faculty of Computing and Mathematical Sciences,
// Mathematics Department postgraduate modular programme (2025 academic year).

const MATH_MSC_MPHIL: ProgrammeCourseCatalog = {
  key: "math-msc-mphil",
  label: "Mathematics (MSc / MPhil)",
  department: "Mathematics",
  levels: ["MSc", "MPhil"],
  admissionCycle: "January",
  notes: [
    "Participation fee: GH¢1,000.00 per module (registered students), GH¢1,400.00 per module (other participants), US$500.00 per module (foreign participants).",
    "Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // University mandatory
    { code: "MA 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "MA 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "MA 556", name: "Labwork/Fieldwork and Report", credits: C, category: "mandatory" },
    // Compulsory modules (*)
    { code: "MA 275", name: "Numerical Methods", credits: C, category: "core" },
    { code: "MA 553", name: "Operations Research", credits: C, category: "core" },
    { code: "MA 571", name: "Numerical Methods for Linear and Nonlinear Equations", credits: C, category: "core" },
    { code: "MA 573", name: "Time Series and Forecasting", credits: C, category: "core" },
    { code: "MA 577", name: "Advanced Probability and Statistics", credits: C, category: "core" },
    { code: "MA 579", name: "Computer Programming", credits: C, category: "core" },
    // Electives (**)
    { code: "MA 572", name: "Multivariate Analysis", credits: C, category: "elective" },
    { code: "MA 574", name: "Design and Analysis of Experiments", credits: C, category: "elective" },
    { code: "MA 576", name: "Stochastic Processes with Applications", credits: C, category: "elective" },
    { code: "MA 578", name: "Statistical Models", credits: C, category: "elective" },
    { code: "MA 581", name: "Computational Finance", credits: C, category: "elective" },
    { code: "MA 582", name: "Optimisation Models in Economics and Finance", credits: C, category: "elective" },
    { code: "MA 583", name: "Investment Analysis and Portfolio Theory", credits: C, category: "elective" },
    { code: "MA 584", name: "Macroeconomics", credits: C, category: "elective" },
    { code: "MA 586", name: "Risk Analysis and Management", credits: C, category: "elective" },
    { code: "MA 588", name: "Sample Survey", credits: C, category: "elective" },
    { code: "MA 591", name: "Application of Numerical Analysis to ODEs", credits: C, category: "elective" },
    { code: "MA 592", name: "Advanced Numerical Methods", credits: C, category: "elective" },
    { code: "MA 593", name: "Application of Numerical Analysis to PDEs", credits: C, category: "elective" },
    { code: "MA 594", name: "Computational Methods in Optimisation", credits: C, category: "elective" },
    { code: "MA 596", name: "Computational Methods for Optimal Control Problems", credits: C, category: "elective" },
  ],
};

const MATH_PHD: ProgrammeCourseCatalog = {
  key: "math-phd",
  label: "Mathematics (PhD)",
  department: "Mathematics",
  levels: ["PhD"],
  admissionCycle: "January",
  notes: [
    "MA 600 PhD Thesis, MA 551 Research Methods and MA 655 Individual Studies are compulsory for all PhD candidates.",
    "MA 656 University Teaching Experience is compulsory only for Postgraduate Assistants.",
  ],
  courses: [
    { code: "MA 600", name: "PhD Thesis", credits: C, category: "mandatory" },
    { code: "MA 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "MA 655", name: "Individual Studies", credits: C, category: "mandatory" },
    { code: "MA 656", name: "University Teaching Experience", credits: C, category: "mandatory" },
    // Specialisation electives (selected with supervisor)
    { code: "MA 571", name: "Numerical Methods for Linear and Nonlinear Equations", credits: C, category: "elective" },
    { code: "MA 576", name: "Stochastic Processes with Applications", credits: C, category: "elective" },
    { code: "MA 581", name: "Computational Finance", credits: C, category: "elective" },
    { code: "MA 582", name: "Optimisation Models in Economics and Finance", credits: C, category: "elective" },
    { code: "MA 591", name: "Application of Numerical Analysis to ODEs", credits: C, category: "elective" },
    { code: "MA 592", name: "Advanced Numerical Methods", credits: C, category: "elective" },
    { code: "MA 593", name: "Application of Numerical Analysis to PDEs", credits: C, category: "elective" },
    { code: "MA 594", name: "Computational Methods in Optimisation", credits: C, category: "elective" },
    { code: "MA 596", name: "Computational Methods for Optimal Control Problems", credits: C, category: "elective" },
  ],
};

// ─── Minerals Engineering ────────────────────────────────────────────────
// ─── Mathematical Sciences (July intake) ─────────────────────────────────
// Source: UMaT SPS — Faculty of Computing and Mathematical Sciences,
// Mathematics Department postgraduate modular programme (July 2025 intake).

const MATH_MSC_MPHIL_JULY: ProgrammeCourseCatalog = {
  key: "math-msc-mphil-july",
  label: "Mathematical Sciences (MSc / MPhil) — July",
  department: "Mathematical Sciences",
  levels: ["MSc", "MPhil"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake schedule. Modules run from 14th July 2025 to 12th December 2025.",
    "Participation fee: GH¢1,000.00 per module for registered students / GH¢1,400.00 per other participants / $500.00 per foreign participant.",
    "Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // Compulsory modules
    { code: "MA 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "MA 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "MA 553", name: "Operations Research", credits: C, category: "core" },
    { code: "MA 573", name: "Time Series and Forecasting", credits: C, category: "core" },
    { code: "MA 275", name: "Numerical Methods", credits: C, category: "core" },
    { code: "MA 579", name: "Computer Programming", credits: C, category: "core" },
    // Elective modules
    { code: "MA 572", name: "Multivariate Analysis", credits: C, category: "elective" },
    { code: "MA 574", name: "Design and Analysis of Experiments", credits: C, category: "elective" },
    { code: "MA 581", name: "Computational Finance", credits: C, category: "elective" },
    { code: "MA 583", name: "Investment Analysis and Portfolio Theory", credits: C, category: "elective" },
    { code: "MA 591", name: "Application of Numerical Analysis to ODEs", credits: C, category: "elective" },
    { code: "MA 593", name: "Application of Numerical Analysis to PDEs", credits: C, category: "elective" },
  ],
};

// Source: UMaT SPS — Faculty of Mineral Resources Technology, Minerals
// Engineering Department postgraduate modular programme (January admission,
// 2025/2026 academic year).

const MINERALS_MSC_MPHIL: ProgrammeCourseCatalog = {
  key: "minerals-msc-mphil",
  label: "Minerals Engineering (MSc / MPhil)",
  department: "Minerals Engineering",
  levels: ["MSc", "MPhil"],
  admissionCycle: "January",
  notes: [
    "MR 491 Introduction to Minerals Processing and MR 493 Introduction to Extractive Metallurgy are pre-requisite modules for non-Minerals Engineers.",
    "Participation fee: GH¢1,000.00 per module (registered students), GH¢1,400.00 per module (other participants), US$500.00 per module (foreign participants).",
    "Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // Compulsory (**)
    { code: "MR 554", name: "Economic and Financial Evaluation", credits: C, category: "core" },
    { code: "MR 556", name: "Labwork/Fieldwork and Report", credits: C, category: "mandatory" },
    { code: "MR 576", name: "Mineral Process Design and Control", credits: C, category: "core" },
    { code: "MR 579", name: "Aqueous Processes in Mineral Engineering", credits: C, category: "core" },
    // Pre-requisites for non-Minerals Engineers (*)
    { code: "MR 491", name: "Introduction to Minerals Processing", credits: C, category: "elective" },
    { code: "MR 493", name: "Introduction to Extractive Metallurgy", credits: C, category: "elective" },
    // Other taught modules (electives)
    { code: "MR 572", name: "Industrial Minerals Beneficiation", credits: C, category: "elective" },
    { code: "MR 573", name: "Advanced Process Mineralogy", credits: C, category: "elective" },
    { code: "MR 578", name: "Mine Waste Management", credits: C, category: "elective" },
    { code: "MR 580", name: "Non-ferrous Metal Beneficiation", credits: C, category: "elective" },
  ],
};

// ─── Geological Engineering ──────────────────────────────────────────────
// Source: UMaT SPS — Faculty of Geoscience and Environmental Studies,
// Geological Engineering Department postgraduate modular programme
// (2026 academic year).

const GEOLOGICAL_MSC_MPHIL: ProgrammeCourseCatalog = {
  key: "geological-msc-mphil",
  label: "Geological Engineering (MSc / MPhil)",
  department: "Geological Engineering",
  levels: ["MSc", "MPhil"],
  admissionCycle: "January",
  notes: [
    "GL 261 Introductory Geology is a prerequisite module for candidates without a Geology background.",
    "Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // University mandatory
    { code: "GL 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "GL 556", name: "Labwork/Fieldwork and Report", credits: C, category: "mandatory" },
    // Compulsory taught modules (*)
    { code: "GL 553", name: "Operations Research", credits: C, category: "core" },
    { code: "GL 554", name: "Mine Economic and Financial Evaluation", credits: C, category: "core" },
    { code: "GL 555", name: "Statistical Models", credits: C, category: "core" },
    { code: "GL 557", name: "Environmental Management", credits: C, category: "core" },
    { code: "GL 561", name: "Computer Applications in Geological Engineering", credits: C, category: "core" },
    { code: "GL 574", name: "Remote Sensing and GIS", credits: C, category: "core" },
    { code: "GL 579", name: "Applied Artificial Intelligence in Geological Engineering", credits: C, category: "core" },
    // Prerequisite for non-Geology candidates
    { code: "GL 261", name: "Introductory Geology", credits: C, category: "elective" },
    // Elective specialisation modules
    { code: "GL 552", name: "Mineral Resource Evaluation", credits: C, category: "elective" },
    { code: "GL 559", name: "Applied Rock Mechanics", credits: C, category: "elective" },
    { code: "GL 571", name: "Applied Hydrogeology", credits: C, category: "elective" },
    { code: "GL 572", name: "Mine Water Hydrology", credits: C, category: "elective" },
    { code: "GL 573", name: "Ore Deposit Geology", credits: C, category: "elective" },
    { code: "GL 575", name: "Mineral Exploration Geochemistry", credits: C, category: "elective" },
    { code: "GL 576", name: "Exploration Drilling and Sampling", credits: C, category: "elective" },
    { code: "GL 577", name: "Water Resources Management", credits: C, category: "elective" },
    { code: "GL 578", name: "Industrial Minerals", credits: C, category: "elective" },
    { code: "GL 582", name: "Groundwater Engineering", credits: C, category: "elective" },
    { code: "GL 584", name: "Mineral Exploration Geophysics", credits: C, category: "elective" },
    { code: "GL 586", name: "Advanced Ore Microscopy", credits: C, category: "elective" },
  ],
};

// ─── Petroleum Engineering ───────────────────────────────────────────────
// Source: UMaT SPS — Petroleum Engineering Department postgraduate
// modular programme (January 2026 academic year).

const PETROLEUM_MSC_MPHIL: ProgrammeCourseCatalog = {
  key: "petroleum-msc-mphil",
  label: "Petroleum Engineering (MSc / MPhil)",
  department: "Petroleum Engineering",
  levels: ["MSc", "MPhil"],
  admissionCycle: "January",
  notes: [
    "PE 511 Introduction to Petroleum Engineering and PE 513 Introduction to Engineering Mechanics are prerequisite modules for candidates without a Petroleum Engineering background.",
    "Participation fee: GH¢1,000.00 per module (registered students), GH¢1,400.00 per module (other participants), US$500.00 per module (foreign participants).",
    "Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // Mandatory
    { code: "PE 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "PE 550", name: "Graduate Seminar", credits: C, category: "mandatory" },
    { code: "PE 556", name: "Labwork/Fieldwork and Report", credits: C, category: "mandatory" },
    // Prerequisites
    { code: "PE 511", name: "Introduction to Petroleum Engineering", credits: C, category: "elective" },
    { code: "PE 513", name: "Introduction to Engineering Mechanics", credits: C, category: "elective" },
    // Taught specialisation modules
    { code: "PE 574", name: "Health, Safety and Environment in Petroleum Industry", credits: C, category: "elective" },
    { code: "PE 576", name: "Petroleum Economics and Management", credits: C, category: "elective" },
    { code: "PE 578", name: "Offshore Drilling Technology", credits: C, category: "elective" },
    { code: "PE 582", name: "Advanced Reservoir Modelling and Simulation", credits: C, category: "elective" },
    { code: "PE 584", name: "Improved Recovery Methods", credits: C, category: "elective" },
    { code: "PE 586", name: "Well Test Analysis", credits: C, category: "elective" },
    { code: "PE 588", name: "Multi-phase Flow in Pipes", credits: C, category: "elective" },
    { code: "PE 592", name: "Advanced Well Logging", credits: C, category: "elective" },
    { code: "PE 594", name: "Petroleum Refinery Operations", credits: C, category: "elective" },
  ],
};

const PETROLEUM_PHD: ProgrammeCourseCatalog = {
  key: "petroleum-phd",
  label: "Petroleum Engineering (PhD)",
  department: "Petroleum Engineering",
  levels: ["PhD"],
  admissionCycle: "January",
  notes: [
    "PE 500 Thesis, PE 550 Graduate Seminar and PE 665 Individual Study are compulsory for all PhD candidates.",
    "PE 656 University Teaching Experience is compulsory only for Postgraduate Assistants.",
  ],
  courses: [
    { code: "PE 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "PE 550", name: "Graduate Seminar", credits: C, category: "mandatory" },
    { code: "PE 665", name: "Individual Study", credits: C, category: "mandatory" },
    { code: "PE 656", name: "University Teaching Experience", credits: C, category: "mandatory" },
    // Specialisation electives (selected with supervisor)
    { code: "PE 574", name: "Health, Safety and Environment in Petroleum Industry", credits: C, category: "elective" },
    { code: "PE 576", name: "Petroleum Economics and Management", credits: C, category: "elective" },
    { code: "PE 578", name: "Offshore Drilling Technology", credits: C, category: "elective" },
    { code: "PE 582", name: "Advanced Reservoir Modelling and Simulation", credits: C, category: "elective" },
    { code: "PE 584", name: "Improved Recovery Methods", credits: C, category: "elective" },
    { code: "PE 586", name: "Well Test Analysis", credits: C, category: "elective" },
    { code: "PE 588", name: "Multi-phase Flow in Pipes", credits: C, category: "elective" },
    { code: "PE 592", name: "Advanced Well Logging", credits: C, category: "elective" },
    { code: "PE 594", name: "Petroleum Refinery Operations", credits: C, category: "elective" },
  ],
};

// ─── Computer Science and Engineering ────────────────────────────────────
// Source: UMaT SPS — Department of Computer Science and Engineering
// postgraduate modular programme (2026 academic year).

const CSE_MSC_MPHIL: ProgrammeCourseCatalog = {
  key: "cse-msc-mphil",
  label: "Computer Science and Engineering (MSc / MPhil)",
  department: "Computer Science and Engineering",
  levels: ["MSc", "MPhil"],
  admissionCycle: "January",
  notes: [
    "Electives are grouped into specialisation tracks: Artificial Intelligence, Software Systems, Embedded Systems and Control, Information and Cyber Security, and Data Communication and Networks.",
    "Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // University mandatory / research
    { code: "CE 500", name: "MSc Thesis", credits: 21, category: "mandatory" },
    { code: "CE 550", name: "MSc Seminar", credits: 3, category: "mandatory" },
    { code: "CE 551", name: "Research Methods", credits: 3, category: "mandatory" },
    { code: "CE 556", name: "Field/Laboratory Work", credits: 3, category: "mandatory" },
    // Core modules (*)
    { code: "CE 571", name: "Very Large Scale Integration (VLSI)", credits: 3, category: "core" },
    { code: "CE 573", name: "Optimisation Methods and Applications", credits: 3, category: "core" },
    { code: "CE 575", name: "Realtime Systems", credits: 3, category: "core" },
    { code: "CE 577", name: "Parallel Computing", credits: 3, category: "core" },
    { code: "CE 579", name: "Data Mining", credits: 3, category: "core" },
    { code: "CE 589", name: "Information Theory and Coding", credits: 3, category: "core" },
    // Artificial Intelligence electives
    { code: "CE 581", name: "Probability and Random Processes", credits: 3, category: "elective" },
    { code: "CE 583", name: "Computational Intelligence", credits: 3, category: "elective" },
    { code: "CE 572", name: "Multi-Agent Systems", credits: 3, category: "elective" },
    { code: "CE 574", name: "Computer Vision and Pattern Recognition", credits: 3, category: "elective" },
    { code: "CE 576", name: "Natural Language Processing", credits: 3, category: "elective" },
    // Software Systems electives
    { code: "CE 585", name: "Information Systems Analysis, Modeling and Design", credits: 3, category: "elective" },
    { code: "CE 587", name: "Software Testing and Quality Assurance", credits: 3, category: "elective" },
    { code: "CE 578", name: "Advanced Data Modeling", credits: 3, category: "elective" },
    { code: "CE 580", name: "Advanced Database Systems", credits: 3, category: "elective" },
    { code: "CE 582", name: "Pattern Based Software Development", credits: 3, category: "elective" },
    // Embedded Systems and Control electives
    { code: "CE 597", name: "Advanced Embedded Systems Design", credits: 3, category: "elective" },
    { code: "CE 599", name: "Implementation of Digital Signal Processing Systems", credits: 3, category: "elective" },
    { code: "CE 562", name: "Internet of Things Technology and Applications", credits: 3, category: "elective" },
    { code: "CE 594", name: "Systems-On-Chip Design", credits: 3, category: "elective" },
    { code: "CE 598", name: "Adaptive Signal Processing", credits: 3, category: "elective" },
    // Information and Cyber Security electives
    { code: "CE 593", name: "Information Security Concepts and Cryptography", credits: 3, category: "elective" },
    { code: "CE 595", name: "Cyber Threat Intelligence", credits: 3, category: "elective" },
    { code: "CE 588", name: "Computer Network Security", credits: 3, category: "elective" },
    { code: "CE 590", name: "Computer Networks: Architectures, Protocols and Standards", credits: 3, category: "elective" },
    { code: "CE 592", name: "Cyber Incident Handling and Reporting", credits: 3, category: "elective" },
    { code: "CE 596", name: "Malware and Email Security Analysis", credits: 3, category: "elective" },
    // Data Communication and Networks electives
    { code: "CE 591", name: "Mobile and Ad-hoc Computing", credits: 3, category: "elective" },
    { code: "CE 584", name: "Digital Communications", credits: 3, category: "elective" },
    { code: "CE 586", name: "Software Defined Networks", credits: 3, category: "elective" },
  ],
};

// ─── Mining Engineering (July intake) ────────────────────────────────────
// Source: UMaT SPS — Faculty of Mineral Resources Technology, Mining
// Engineering Department postgraduate modular programme (July 2025 intake).

const MINING_MSC_MPHIL_JULY: ProgrammeCourseCatalog = {
  key: "mining-msc-mphil-july",
  label: "Mining Engineering (MSc / MPhil) — July",
  department: "Mining Engineering",
  levels: ["MSc", "MPhil", "PhD"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake schedule. Modules run from 14th July 2025 to 12th December 2025.",
    "MN 655 Individual Studies is compulsory for all PhD candidates.",
    "MN 656 University Teaching Experience is compulsory only for Postgraduate Assistants.",
    "Participation fee: GH¢1,000.00 per module for registered students / GH¢1,400.00 per other participants / $500.00 per foreign participant.",
    "Registration closes one (1) week before the commencement of each module. Contact: The Secretary, Mining Engineering Department, UMaT (+233 312291786).",
  ],
  courses: [
    // Compulsory taught + research modules
    { code: "MN 261", name: "Introduction to Mining Engineering", credits: C, category: "core" },
    { code: "MN 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "MN 553", name: "Operations Research", credits: C, category: "core" },
    { code: "MN 554", name: "Mine Economic and Financial Evaluation", credits: C, category: "core" },
    { code: "MN 555", name: "Statistical Models", credits: C, category: "core" },
    { code: "MN 556", name: "Labwork/Fieldwork and Report", credits: C, category: "mandatory" },
    { code: "MN 557", name: "Environmental Management", credits: C, category: "core" },
    { code: "MN 559", name: "Applied Rock Mechanics", credits: C, category: "core" },
    { code: "MN 563", name: "Data Mining and Advanced Analysis", credits: C, category: "core" },
    { code: "GL/MN 552", name: "Mineral Resource Evaluation (Geology)", credits: C, category: "elective" },
    // PhD / Postgraduate Assistant requirements
    { code: "MN 655", name: "Individual Studies", credits: C, category: "mandatory" },
    { code: "MN 656", name: "University Teaching Experience", credits: C, category: "mandatory" },
  ],
};

// ─── Geological Engineering (July intake) ────────────────────────────────
// Source: UMaT SPS — Faculty of Mineral Resources Technology, Geological
// Engineering Department postgraduate modular programme (July 2025 intake).

const GEOLOGICAL_MSC_MPHIL_JULY: ProgrammeCourseCatalog = {
  key: "geological-msc-mphil-july",
  label: "Geological Engineering (MSc / MPhil) — July",
  department: "Geological Engineering",
  levels: ["MSc", "MPhil"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake schedule. Modules run from 14th July 2025 to 12th December 2025.",
    "Participation fee: GH¢1,000.00 per module for registered students / GH¢1,400.00 per other participants / $500.00 per foreign participant.",
    "Registration closes one (1) week before the commencement of each module. Contact: The Administrator, Geological Engineering Department, UMaT (+233 362 20306, gl@umat.edu.gh).",
  ],
  courses: [
    // Compulsory modules
    { code: "GL 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "GL 553", name: "Operations Research", credits: C, category: "core" },
    { code: "GL 554", name: "Mine Economic and Financial Evaluation", credits: C, category: "core" },
    { code: "GL 555", name: "Statistical Models", credits: C, category: "core" },
    { code: "GL 561", name: "Computer Applications in Geological Engineering", credits: C, category: "core" },
    { code: "GL 574", name: "Remote Sensing and GIS", credits: C, category: "core" },
    { code: "GL 579", name: "Applied Artificial Intelligence in Geological Engineering", credits: C, category: "core" },
    // Elective / additional taught modules
    { code: "GL 261", name: "Introductory Geology", credits: C, category: "elective" },
    { code: "GL 552", name: "Mineral Resource Evaluation", credits: C, category: "elective" },
    { code: "GL 559", name: "Applied Rock Mechanics", credits: C, category: "elective" },
    { code: "GL 575", name: "Mineral Exploration Geochemistry", credits: C, category: "elective" },
    { code: "GL 577", name: "Water Resources Management", credits: C, category: "elective" },
    { code: "GL 578", name: "Industrial Minerals", credits: C, category: "elective" },
  ],
};

// ─── Petroleum Refining and Petrochemical Engineering (July intake) ─────
// Source: UMaT SPS — Petroleum Refining and Petrochemical Engineering
// Department postgraduate modular programme (July 2025 intake).

const REFINING_MSC_MPHIL_JULY: ProgrammeCourseCatalog = {
  key: "refining-msc-mphil-july",
  label: "Petroleum Refining and Petrochemical Engineering (MSc / MPhil) — July",
  department: "Petroleum Refining and Petrochemical Engineering",
  levels: ["MSc", "MPhil", "PhD"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake schedule. Modules run from 14th July 2025 to 12th December 2025.",
    "RP 511 is a prerequisite/introductory module for non-Petroleum Refining and Petrochemical Engineering applicants.",
    "RP 513 is a prerequisite/introductory module for Physical Sciences applicants.",
    "RP 665 Individual Study is compulsory for all PhD candidates.",
    "RP 656 University Teaching Experience is compulsory only for Postgraduate Assistants.",
    "Participation fee: GH¢1,000.00 per module for registered students / GH¢1,400.00 per other participants / $500.00 per foreign participant.",
    "Registration closes one (1) week before the commencement of each module.",
  ],
  courses: [
    // Mandatory / research
    { code: "RP 500", name: "Thesis", credits: C, category: "mandatory" },
    { code: "RP 550", name: "Graduate Seminar", credits: C, category: "mandatory" },
    { code: "RP 551", name: "Research Methods", credits: C, category: "mandatory" },
    // Prerequisite / Introductory
    { code: "RP 511", name: "Introduction to Petroleum Refining and Petrochemical Engineering", credits: C, category: "core" },
    { code: "RP 513", name: "Introduction to Transport Phenomena", credits: C, category: "core" },
    // Core taught modules
    { code: "RP 570", name: "Advanced Chemical Reaction Engineering", credits: C, category: "core" },
    { code: "RP 571", name: "Applied Computational Methods", credits: C, category: "core" },
    { code: "RP 576", name: "Plant Design and Economics", credits: C, category: "core" },
    { code: "RP 577", name: "Corrosion Engineering", credits: C, category: "core" },
    { code: "RP 582", name: "Nanotechnology in Refining and Petrochemical Industries", credits: C, category: "core" },
    { code: "RP 584", name: "Application of Artificial Intelligence in Petroleum Refining", credits: C, category: "core" },
    { code: "RP 592", name: "Design of Experiment", credits: C, category: "core" },
    // PhD / Postgraduate Assistant requirements
    { code: "RP 665", name: "Individual Study", credits: C, category: "mandatory" },
    { code: "RP 656", name: "University Teaching Experience", credits: C, category: "mandatory" },
  ],
};

// ─── Management Studies — Master of Business and Technology Management ───
// Source: UMaT SPS — Department of Management Studies postgraduate
// programmes (July 2025 intake, 2025/2026 academic year). Five tracks share
// the same Semester I core; Semester II differs per specialisation.

const MBTM_CORE_SEM1 = (prefix: string) => [
  { code: `${prefix} 551`, name: "Research Methods", credits: C, category: "mandatory" as const },
  { code: `${prefix} 571`, name: "Management and Organisational Behaviour", credits: C, category: "core" as const },
  { code: `${prefix} 573`, name: prefix === "EM" ? "Business Economics" : "Managerial Economics", credits: C, category: "core" as const },
  { code: `${prefix} 575`, name: "Accounting for Business Decisions", credits: C, category: "core" as const },
  { code: `${prefix} 577`, name: "Quantitative Methods", credits: C, category: "core" as const },
  { code: `${prefix} 579`, name: "Project and Operations Management", credits: C, category: "core" as const },
  { code: `${prefix} 581`, name: "Business Intelligence and Data Analytics", credits: C, category: "core" as const },
  { code: `${prefix} 583`, name: "Management Information Systems", credits: C, category: "core" as const },
  { code: `${prefix} 589`, name: "Strategic Management", credits: C, category: "core" as const },
];

const MBTM_SUPPLY_CHAIN_JULY: ProgrammeCourseCatalog = {
  key: "mbtm-supply-chain-july",
  label: "Master of Business and Technology Management — Supply Chain Management (July)",
  department: "Management Studies",
  levels: ["MBA"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake. Semester I runs 2 Aug 2025 – 14 Dec 2025; Semester II runs 17 Jan 2026 – 19 Jul 2026.",
    "Classes are held on weekends (Saturdays and Sundays) from 8:00 am – 5:00 pm.",
  ],
  courses: [
    ...MBTM_CORE_SEM1("MBS"),
    { code: "MBS 591", name: "Strategic Sourcing", credits: C, category: "elective" },
    { code: "MBS 587", name: "Technology Entrepreneurship", credits: C, category: "elective" },
    { code: "MBS 574", name: "Supply Chain Management", credits: C, category: "elective" },
    { code: "MBS 572", name: "Logistics Engineering and International Trade", credits: C, category: "elective" },
    { code: "MBS 576", name: "Contract and Procurement", credits: C, category: "elective" },
    { code: "MBS 582", name: "E-Commerce and Logistics Automation", credits: C, category: "elective" },
    { code: "MBS 584", name: "Total Quality Management", credits: C, category: "elective" },
    { code: "MBS 578", name: "Enterprise Resource Management", credits: C, category: "elective" },
    { code: "MBS 586", name: "Green Supply Chain Management", credits: C, category: "elective" },
  ],
};

const MBTM_FINANCE_JULY: ProgrammeCourseCatalog = {
  key: "mbtm-finance-july",
  label: "Master of Business and Technology Management — Finance and Investment (July)",
  department: "Management Studies",
  levels: ["MBA"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake. Semester I runs 2 Aug 2025 – 14 Dec 2025; Semester II runs 17 Jan 2026 – 19 Jul 2026.",
  ],
  courses: [
    ...MBTM_CORE_SEM1("MBF"),
    { code: "MBF 591", name: "Strategic Sourcing", credits: C, category: "elective" },
    { code: "MBF 587", name: "Technology Entrepreneurship", credits: C, category: "elective" },
    { code: "MBF 572", name: "International Finance", credits: C, category: "elective" },
    { code: "MBF 578", name: "Derivatives and Investment Management", credits: C, category: "elective" },
    { code: "MBF 574", name: "Monetary Economics", credits: C, category: "elective" },
    { code: "MBF 576", name: "Corporate Finance", credits: C, category: "elective" },
    { code: "MBF 580", name: "Quantitative Finance", credits: C, category: "elective" },
    { code: "MBF 582", name: "Financial Markets and Institutions", credits: C, category: "elective" },
    { code: "MBF 584", name: "Financial Risk Management", credits: C, category: "elective" },
  ],
};

const MBTM_MIS_JULY: ProgrammeCourseCatalog = {
  key: "mbtm-mis-july",
  label: "Master of Business and Technology Management — Management Information Systems (July)",
  department: "Management Studies",
  levels: ["MBA"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake. Semester I runs 2 Aug 2025 – 14 Dec 2025; Semester II runs 17 Jan 2026 – 19 Jul 2026.",
  ],
  courses: [
    ...MBTM_CORE_SEM1("MBM"),
    { code: "MBM 591", name: "Strategic Sourcing", credits: C, category: "elective" },
    { code: "MBM 587", name: "Technology Entrepreneurship", credits: C, category: "elective" },
    { code: "MBM 572", name: "Object Oriented Programming Using Java", credits: C, category: "elective" },
    { code: "MBM 574", name: "Emerging Technologies", credits: C, category: "elective" },
    { code: "MBM 576", name: "Cyber Security", credits: C, category: "elective" },
    { code: "MBM 578", name: "Enterprise Resource Management", credits: C, category: "elective" },
    { code: "MBM 580", name: "Database Management Systems", credits: C, category: "elective" },
  ],
};

const MBTM_HR_JULY: ProgrammeCourseCatalog = {
  key: "mbtm-hr-july",
  label: "Master of Business and Technology Management — Strategic Human Resource Management (July)",
  department: "Management Studies",
  levels: ["MBA"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake. Semester I runs 2 Aug 2025 – 14 Dec 2025; Semester II runs 17 Jan 2026 – 19 Jul 2026.",
  ],
  courses: [
    ...MBTM_CORE_SEM1("MBH"),
    { code: "MBH 591", name: "Strategic Sourcing", credits: C, category: "elective" },
    { code: "MBH 587", name: "Technology Entrepreneurship", credits: C, category: "elective" },
    { code: "MBH 572", name: "Human Resource Management", credits: C, category: "elective" },
    { code: "MBH 574", name: "Workplace Health and Safety Management", credits: C, category: "elective" },
    { code: "MBH 576", name: "Human Performance and Reward Management", credits: C, category: "elective" },
    { code: "MBH 582", name: "Industrial Culture and Behaviour", credits: C, category: "elective" },
    { code: "MBH 584", name: "Cross-Cultural Management", credits: C, category: "elective" },
    { code: "MBH 588", name: "Human Capital Development", credits: C, category: "elective" },
  ],
};

const MSC_ENG_MGMT_JULY: ProgrammeCourseCatalog = {
  key: "msc-engineering-management-july",
  label: "MSc Engineering Management (July)",
  department: "Management Studies",
  levels: ["MSc"],
  admissionCycle: "July",
  notes: [
    "July 2025 intake. Semester I runs 2 Aug 2025 – 14 Dec 2025; Semester II runs 17 Jan 2026 – 19 Jul 2026.",
  ],
  courses: [
    { code: "EM 551", name: "Research Methods", credits: C, category: "mandatory" },
    { code: "EM 571", name: "Management and Organisational Behaviour", credits: C, category: "core" },
    { code: "EM 573", name: "Business Economics", credits: C, category: "core" },
    { code: "EM 575", name: "Accounting for Business Decisions", credits: C, category: "core" },
    { code: "EM 577", name: "Management Information Systems", credits: C, category: "core" },
    { code: "EM 579", name: "Project and Operations Management", credits: C, category: "core" },
    { code: "EM 581", name: "Procurement Management", credits: C, category: "core" },
    { code: "EM 583", name: "Supply Chain Management", credits: C, category: "core" },
    { code: "EM 585", name: "Business Intelligence and Data Analytics", credits: C, category: "core" },
    { code: "EM 591", name: "Strategic Management", credits: C, category: "core" },
    { code: "EM 572", name: "Corporate Finance", credits: C, category: "elective" },
    { code: "EM 574", name: "Energy and Environmental Policy Analysis", credits: C, category: "elective" },
    { code: "EM 576", name: "Sustainable Engineering", credits: C, category: "elective" },
    { code: "EM 578", name: "Management of Technology and Innovation", credits: C, category: "elective" },
    { code: "EM 580", name: "Engineering Economics", credits: C, category: "elective" },
    { code: "EM 582", name: "Resource Management", credits: C, category: "elective" },
    { code: "EM 587", name: "Technology Entrepreneurship", credits: C, category: "elective" },
  ],
};

export const PROGRAMME_COURSE_CATALOGS: ProgrammeCourseCatalog[] = [
  GEOMATIC_MSC_MPHIL,
  GEOMATIC_PHD,
  EEE_MSC_MPHIL,
  EEE_PHD,
  EEE_MSC_MPHIL_JULY,
  EEE_PHD_JULY,
  MECH_MSC_MPHIL,
  MECH_PHD,
  MATH_MSC_MPHIL,
  MATH_PHD,
  MATH_MSC_MPHIL_JULY,
  MINERALS_MSC_MPHIL,
  MINING_MSC_MPHIL_JULY,
  GEOLOGICAL_MSC_MPHIL,
  GEOLOGICAL_MSC_MPHIL_JULY,
  PETROLEUM_MSC_MPHIL,
  PETROLEUM_PHD,
  REFINING_MSC_MPHIL_JULY,
  CSE_MSC_MPHIL,
  MBTM_SUPPLY_CHAIN_JULY,
  MBTM_FINANCE_JULY,
  MBTM_MIS_JULY,
  MBTM_HR_JULY,
  MSC_ENG_MGMT_JULY,
  OHS_MSC_MPHIL_PHD_JULY,
];

export const getCatalogByKey = (key: string) =>
  PROGRAMME_COURSE_CATALOGS.find((c) => c.key === key);

export const getCatalogsByDepartment = (department: string) =>
  PROGRAMME_COURSE_CATALOGS.filter((c) => c.department === department);
