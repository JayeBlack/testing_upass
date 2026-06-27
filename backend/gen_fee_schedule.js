const XLSX = require("xlsx");
const programmes = [
  { department: "Geomatic Engineering", levels: ["MSc","MPhil","PhD"] },
  { department: "Geological Engineering", levels: ["MSc","MPhil","PhD","DEng"] },
  { department: "Environmental Engineering", levels: ["MSc","MPhil","PhD"] },
  { department: "Occupational Health and Safety", levels: ["MSc","MPhil","PhD"] },
  { department: "Mining Engineering", levels: ["MSc","MPhil","PhD","DEng"] },
  { department: "Minerals Engineering", levels: ["MSc","MPhil","PhD","DEng"] },
  { department: "Petroleum Engineering", levels: ["MSc","MPhil","PhD"] },
  { department: "Petroleum Refining and Petrochemical Engineering", levels: ["MSc","MPhil","PhD"] },
  { department: "Mechanical Engineering", levels: ["MSc","MPhil","PhD"] },
  { department: "Electrical & Electronic Engineering", levels: ["MSc","MPhil","PhD","DEng"] },
  { department: "Computer Science and Engineering", levels: ["MSc","MPhil","PhD"] },
  { department: "Mathematics", levels: ["MSc","MPhil","PhD"] },
  { department: "Strategic Human Resource Management", levels: ["MBTM"] },
  { department: "Finance and Investment", levels: ["MBTM"] },
  { department: "Supply Chain Management", levels: ["MBTM"] },
  { department: "Management Information Systems", levels: ["MBTM"] },
  { department: "Engineering Management", levels: ["MSc"] },
];
const fees = { "MSc":8500, "MPhil":9500, "PhD":12000, "DEng":15000, "MBTM":12000 };
const rows = [["Programme","Level","Amount (GHS)"]];
programmes.forEach((p) => p.levels.forEach((l) => {
  rows.push([p.department, l, fees[l] || 8000]);
}));
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);
ws["!cols"] = [{ wch: 45 }, { wch: 20 }, { wch: 15 }];
XLSX.utils.book_append_sheet(wb, ws, "Fee Schedule");
const outPath = require("path").join(__dirname, "..", "sample_fee_schedule.xlsx");
XLSX.writeFile(wb, outPath);
console.log("Generated " + outPath + " with " + (rows.length - 1) + " rows");