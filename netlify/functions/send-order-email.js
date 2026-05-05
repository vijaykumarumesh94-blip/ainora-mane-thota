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

  // Notify store owner
  const ownerMail = {
    from: `"Ainora Mane Thota" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `New Order from ${order.customerName} — ₹${order.total}`,
    text: `
New Order — Ainora Mane Thota

Customer: ${order.customerName}
Phone:    ${order.phone}
Email:    ${order.email || '—'}
Address:  ${order.address}

Items:
${itemLines}

Total:    ₹${order.total}
Delivery: ${order.deliveryDate} | ${order.deliveryTime}
Notes:    ${order.notes || '—'}
    `.trim()
  };

  // Confirmation email to customer (only if they provided an email)
  const customerMail = order.email ? {
    from: `"Ainora Mane Thota" <${process.env.GMAIL_USER}>`,
    to: order.email,
    subject: `Order Confirmed — Ainora Mane Thota 🌿`,
    text: `
Hi ${order.customerName},

Thank you for your order! We've received it and will get it ready for you.

─────────────────────────────
ORDER SUMMARY
─────────────────────────────
Items:
${itemLines}

Items Total: ₹${order.itemsTotal}
Delivery Fee: ₹${order.deliveryFee}
Total: ₹${order.total}

Delivery: ${order.deliveryDate} | ${order.deliveryTime}
Address: ${order.address}
${order.notes ? `\nNotes: ${order.notes}` : ''}
─────────────────────────────

If you have any questions, feel free to reach out to us on WhatsApp.

With love,
Ainora Mane Thota 🌿
    `.trim()
  } : null;

  try {
    const sends = [transporter.sendMail(ownerMail)];
    if (customerMail) sends.push(transporter.sendMail(customerMail));
    await Promise.all(sends);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Mail error:', err);
    return { statusCode: 500, body: 'Failed to send email' };
  }
};
