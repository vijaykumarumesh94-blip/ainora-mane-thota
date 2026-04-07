const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let order;
  try {
    order = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const itemLines = order.items.map(i => `  • ${i.name} x${i.qty} — ₹${i.subtotal}`).join('\n');

  const mailOptions = {
    from: `"Ainora Mane Thota" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `New Order from ${order.customerName} — ₹${order.total}`,
    text: `
New Order — Ainora Mane Thota

Customer: ${order.customerName}
Phone:    ${order.phone}
Address:  ${order.address}

Items:
${itemLines}

Total:    ₹${order.total}
Delivery: ${order.deliveryDate} | ${order.deliveryTime}
Notes:    ${order.notes || '—'}
    `.trim()
  };

  try {
    await transporter.sendMail(mailOptions);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Mail error:', err);
    return { statusCode: 500, body: 'Failed to send email' };
  }
};