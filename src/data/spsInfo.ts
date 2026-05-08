// Official School of Postgraduate Studies (SPS) reference data
// Source: POSTGRADUATE_PROGRAMMES_2026.docx — UMaT SPS

export interface SPSProgramme {
  name: string;
  levels: string[]; // e.g. ["PhD", "MPhil", "MSc"]
  department: string;
}

export const SPS_PROGRAMMES: SPSProgramme[] = [
  { name: "Geomatic Engineering", levels: ["PhD", "MPhil", "MSc"], department: "Geomatic Engineering" },
  { name: "Geological Engineering", levels: ["DEng", "PhD", "MPhil", "MSc"], department: "Geological Engineering" },
  { name: "Occupational Health and Safety", levels: ["PhD", "MPhil", "MSc"], department: "Environmental & Safety Engineering" },
  { name: "Environmental Engineering", levels: ["PhD", "MPhil", "MSc"], department: "Environmental & Safety Engineering" },
  { name: "Mining Engineering", levels: ["DEng", "PhD", "MPhil", "MSc", "PgD", "Executive Certificate"], department: "Mining Engineering" },
  { name: "Minerals Engineering", levels: ["DEng", "PhD", "MPhil", "MSc", "Executive Certificate"], department: "Minerals Engineering" },
  { name: "Petroleum Engineering", levels: ["PhD", "MPhil", "MSc"], department: "Petroleum Engineering" },
  { name: "Petroleum Refining and Petrochemical Engineering", levels: ["PhD", "MPhil", "MSc"], department: "Petroleum Engineering" },
  { name: "Mechanical Engineering", levels: ["PhD", "MPhil", "MSc"], department: "Mechanical Engineering" },
  { name: "Electrical & Electronic Engineering", levels: ["DEng", "PhD", "MPhil", "MSc"], department: "Electrical Engineering" },
  { name: "Computer Science and Engineering", levels: ["PhD", "MPhil", "MSc"], department: "Computer Science" },
  { name: "Mathematics", levels: ["PhD", "MPhil", "MSc"], department: "Mathematical Sciences" },
  { name: "Strategic Human Resource Management", levels: ["MBTM"], department: "Management Studies" },
  { name: "Finance and Investment", levels: ["MBTM"], department: "Management Studies" },
  { name: "Supply Chain Management", levels: ["MBTM"], department: "Management Studies" },
  { name: "Management Information Systems", levels: ["MBTM"], department: "Management Studies" },
  { name: "Engineering Management", levels: ["MSc"], department: "Management Studies" },
];

export const SPS_DEPARTMENTS = Array.from(
  new Set(SPS_PROGRAMMES.map((p) => p.department))
);

export interface SPSStaff {
  name: string;
  position: string;
  systemRole?: "Dean" | "Admin" | "Accountant" | "ExamsOfficer" | "Supervisor";
  email?: string;
}

export const SPS_STAFF: SPSStaff[] = [
  { name: "Assoc Prof Solomon Nunoo", position: "Dean", systemRole: "Dean", email: "dean@umat.edu.gh" },
  { name: "Assoc Prof Peter Ekow Baffoe", position: "Vice Dean" },
  { name: "Mr Francis Nyarko", position: "Deputy Registrar" },
  { name: "Mr Thomas Kwame Nkrumah", position: "Senior Accountant", systemRole: "Accountant", email: "accountant@umat.edu.gh" },
  { name: "Mr Michael Fynn Hammond", position: "Assistant Registrar" },
  { name: "Ms Anita Awuki Akunor", position: "Principal Administrative Assistant" },
  { name: "Ms Candy Brew", position: "Senior Accounting Assistant" },
];

export const SPS_CONTACT = {
  general: "sps@umat.edu.gh",
  admissions: "spsadmin@umat.edu.gh",
  finance: "spsaccount@umat.edu.gh",
  tel: ["+233 332092695", "+233 531100305"],
  whatsapp: "+233 593134347",
  website: "https://sps.umat.edu.gh/",
};