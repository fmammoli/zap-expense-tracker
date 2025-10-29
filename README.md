This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Whatsapp test curl

Adding an expense
curl -X POST http://localhost:3000/api/zap \
 -H "Content-Type: application/json" \
 -d '{
"object": "whatsapp_business_account",
"entry": [
{
"id": "123456789",
"changes": [
{
"field": "messages",
"value": {
"messaging_product": "whatsapp",
"contacts": [
{
"profile": { "name": "Felipe" },
"wa_id": "5512991788976"
}
],
"messages": [
{
"from": "5512991788976",
"id": "wamid.HBgL1234",
"timestamp": "1700000000",
"type": "text",
"text": { "body": "Almoco 20" }
}
]
}
}
]
}
]
}'

Asking for report
curl -X POST http://localhost:3000/api/zap \
 -H "Content-Type: application/json" \
 -d '{
"object": "whatsapp_business_account",
"entry": [
{
"id": "123456789",
"changes": [
{
"field": "messages",
"value": {
"messaging_product": "whatsapp",
"contacts": [
{
"profile": { "name": "Felipe" },
"wa_id": "5512991788976"
}
],
"messages": [
{
"from": "5512991788976",
"id": "wamid.HBgL1234",
"timestamp": "1700000000",
"type": "text",
"text": { "body": "Quanto eu gastei esse mês?" }
}
]
}
}
]
}
]
}'

Image message
curl -X POST http://localhost:3000/api/zap \
 -H "Content-Type: application/json" \
 -d '{
"object": "whatsapp_business_account",
"entry": [
{
"id": "1163715615691396",
"changes": [
{
"value": {
"messaging_product": "whatsapp",
"metadata": {
"display_phone_number": "551151990251",
"phone_number_id": "841926722336934"
},
"contacts": [
{
"profile": {
"name": "Felipe Mammoli"
},
"wa_id": "5512991788976"
}
],
"messages": [
{
"from": "5512991788976",
"id": "wamid.HBgNNTUxMjk5MTc4ODk3NhUCABIYIEFDMDU1NzM3NjIwRjc4NkE5NzIyRjQ5OUVCNEE2MDJDAA==",
"timestamp": "1761748101",
"type": "image",
"image": {
"mime_type": "image/jpeg",
"sha256": "Qr4bkM8cuW+UjdfLpMQ0Vd+Nl2nxMwSOGrV6iq3DCjc=",
"id": "1355877182605393"
}
}
]
},
"field": "messages"
}
]
}
]
}'
