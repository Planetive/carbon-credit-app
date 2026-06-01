import fs from "fs";

const p = "src/pages/Dashboard2.tsx";
let s = fs.readFileSync(p, "utf8");

const startMarker =
  '                          <div className="space-y-3">\n                            <motion.div className="flex justify-between text-sm font-medium">\n                              <span className="text-gray-700">Environmental</span>';
const idx = s.indexOf(
  '                          <motion.div className="space-y-3">\n                            <motion.div className="flex justify-between text-sm font-medium">\n                              <span className="text-gray-700">Environmental</span>'
);
const idx2 = s.indexOf(
  '                          <div className="space-y-3">\n                            <div className="flex justify-between text-sm font-medium">\n                              <span className="text-gray-700">Environmental</span>'
);
const start = idx2 >= 0 ? idx2 : idx;

const endMarker = '                          <motion.div className="mt-6" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>';
const end = s.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  console.error("Markers not found", start, end);
  process.exit(1);
}

const replacement = `                          <div className="space-y-3">
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-gray-700">Assessment progress</span>
                              <span className="text-gray-900 font-bold">{esgAssessment.total_completion ?? 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: \`\${esgAssessment.total_completion ?? 0}%\` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-gradient-to-r from-teal-500 to-cyan-600 h-3 rounded-full shadow-lg"
                              />
                            </div>
                          </div>
                          {esgScores?.readiness_overall_score != null && (
                            <p className="text-sm text-gray-600">
                              Readiness score:{" "}
                              <span className="font-semibold text-gray-900">
                                {Math.round(esgScores.readiness_overall_score)}%
                              </span>
                              {esgScores.readiness_maturity_band ? \` · \${esgScores.readiness_maturity_band}\` : ""}
                            </p>
                          )}
`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log("Dashboard2 ESG section patched");
