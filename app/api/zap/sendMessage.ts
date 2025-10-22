import { NextResponse } from "next/server";

export default async function sendMessage(to: string, bodyText: string) {
  const token = process.env.WHATSAPP_TOKEN; // set in .env.local
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID; // set in .env.local

  try {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            preview_url: true,
            body: bodyText,
          },
        }),
      }
    );

    const result = await response.json();
    console.log("WhatsApp API response:", result);

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
