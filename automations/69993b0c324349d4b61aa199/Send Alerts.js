const twilio = require("twilio")

;(async () => {
  let managerContactsRaw = getContext("managerContacts")
  let managerContacts = []

  // Robust parsing with full coverage for invalid/falsy values
  if (!managerContactsRaw || managerContactsRaw === "not_required" || managerContactsRaw === "" || managerContactsRaw === null || managerContactsRaw === undefined) {
    console.log("Manager contacts config is missing, set to 'not_required', or empty. Skipping alerting. If you wish to send alerts, correctly configure contacts as JSON array.")
    managerContacts = []
  } else if (Array.isArray(managerContactsRaw)) {
    managerContacts = managerContactsRaw
  } else if (typeof managerContactsRaw === "string") {
    try {
      managerContacts = JSON.parse(managerContactsRaw)
      if (!Array.isArray(managerContacts)) managerContacts = []
    } catch (e) {
      console.error("Could not parse manager contacts config as JSON. Skipping alerting. To fix: set contacts variable as JSON array.", managerContactsRaw)
      managerContacts = []
    }
  } else {
    managerContacts = []
  }

  const analysis = getContext("salesAnalysis")
  if (!managerContacts || !Array.isArray(managerContacts) || managerContacts.length === 0) {
    console.log("No valid manager contacts found. Skipping alerting. To enable alerting, set contacts as a JSON array in config or upstream step.")
    return
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
