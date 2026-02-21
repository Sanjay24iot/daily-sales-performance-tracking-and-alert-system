// Send alerts to managers by email and SMS using Turbotic/Builtin and Twilio
const twilio = require("twilio")

;(async () => {
  const managerContacts = getContext("managerContacts")
  const analysis = getContext("salesAnalysis")
  if (!managerContacts || !Array.isArray(managerContacts) || managerContacts.length === 0) {
    console.error("No manager contacts found. Cannot send alerts.")
    process.exit(1)
  }
  if (!analysis) {
    console.error("No analysis available to send alerts.")
    process.exit(1)
  }
  // Format messages
  const subject = analysis.dropAlert ? "ALERT: Sales Drop Detected" : "Sales Report"
  const html = `<h3>${subject}</h3><ul><li>Total Sales: ${analysis.totalSales}</li><li>Previous Day Sales: ${analysis.previousDaySales}</li><li>Drop Percent: ${analysis.dropPercent?.toFixed(2) || 0}%</li><li>Sales Target: ${analysis.salesTarget}</li><li>Reached Target: ${analysis.reachedTarget ? "Yes" : "No"}</li></ul>`
  const textMsg = `${subject}\nTotal Sales: ${analysis.totalSales}\nPrevious: ${analysis.previousDaySales}\nDrop: ${analysis.dropPercent?.toFixed(2) || 0}%\nTarget: ${analysis.salesTarget}\nHit Target: ${analysis.reachedTarget ? "Yes" : "No"}`

  // Email via Turbotic helper
  try {
    const to = managerContacts.map(m => m.email).filter(Boolean)
    await sendEmailViaTurbotic({ to, subject, html, text: textMsg })
    console.log("Emails sent to:", to)
  } catch (e) {
    console.error("Email send error:", e.message)
  }

  // SMS via Twilio
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_SMS_FROM
  if (sid && token && from) {
    const tClient = twilio(sid, token)
    for (const m of managerContacts) {
      if (m.phone) {
        try {
          await tClient.messages.create({ body: textMsg, from, to: m.phone })
          console.log("SMS sent to:", m.phone)
        } catch (err) {
          console.error("SMS error:", err.message, "for", m.phone)
        }
      }
    }
  } else {
    console.log("Twilio not configured, skipping SMS.")
  }
})()
