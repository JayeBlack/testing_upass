// Grading utility function for UPASS
// Converts marks (0-100) to letter grades

function marksToGrade(marks) {
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 50) return 'D';
  return 'F';
}

// Realistic grade distribution
// A: 10%, B: 25%, C: 35%, D: 20%, F: 10%
function generateRealisticMark() {
  const rand = Math.random();
  if (rand < 0.10) return 80 + Math.floor(Math.random() * 21); // A (80-100) - 10%
  if (rand < 0.35) return 70 + Math.floor(Math.random() * 10); // B (70-79) - 25%
  if (rand < 0.70) return 60 + Math.floor(Math.random() * 10); // C (60-69) - 35%
  if (rand < 0.90) return 50 + Math.floor(Math.random() * 10); // D (50-59) - 20%
  return 40 + Math.floor(Math.random() * 10); // F (40-49) - 10%
}

module.exports = { marksToGrade, generateRealisticMark };
