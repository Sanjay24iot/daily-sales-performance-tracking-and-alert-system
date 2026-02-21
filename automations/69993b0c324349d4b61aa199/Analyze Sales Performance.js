// Analyze sales data for drop percentage and/or target
const SALES_DROP_PERCENT = Number(process.env.SALES_DROP_PERCENT || 0)
const SALES_TARGET = Number(process.env.SALES_TARGET || 0)

function findNumericField(row) {
  // Helper: find the first numeric field ("sales", "amount", etc) in row
  return Object.keys(row).find(k => typeof row[k] === "number" && row[k] !== null && isFinite(row[k]))
}

;(async () => {
  const data = getContext("salesData")
  if (!Array.isArray(data) || data.length === 0) {
    console.error("No sales data found or salesData context is empty.")
    process.exit(1)
  }

  // Find the main sales numeric field to analyze
  const field = findNumericField(data[0])
  if (!field) {
    console.error("Could not detect sales value field in data.")
    process.exit(1)
  }

  const salesValues = data.map(r => (typeof r[field] === "number" ? r[field] : Number(r[field]) || 0))
  const totalSales = salesValues.reduce((a, b) => a + b, 0)
  let previousDaySales = 0
  if (salesValues.length > 1) previousDaySales = salesValues[salesValues.length - 2]
  const dropPercent = previousDaySales ? (100 * (previousDaySales - totalSales)) / previousDaySales : 0
  const reachedTarget = SALES_TARGET > 0 ? totalSales >= SALES_TARGET : undefined

  const findings = {
    fieldName: field,
    totalSales,
    previousDaySales,
    dropPercent,
    dropAlert: SALES_DROP_PERCENT > 0 && dropPercent >= SALES_DROP_PERCENT,
    salesTarget: SALES_TARGET,
    reachedTarget
  }
  setContext("salesAnalysis", findings)
  console.log("Sales analysis:", findings)
})()
