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
  const deliveryDateFormatted = new Date(order.deliveryDate).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

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

Items Total: ₹${order.itemsTotal}
Delivery Fee: ₹${order.deliveryFee}
Total:    ₹${order.total}
Delivery: ${deliveryDateFormatted} | ${order.deliveryTime}
Notes:    ${order.notes || '—'}
    `.trim()
  };

  // Confirmation email to customer (only if they provided an email)
  const customerMail = order.email ? {
    from: `"Ainora Mane Thota" <${process.env.GMAIL_USER}>`,
    to: order.email,
    subject: `Thank you for your order, ${order.customerName}! 🌿`,
    text: `
Hi ${order.customerName}! 👋

Thank you so much for ordering from Ainora Mane Thota — we're really happy to have you!

We've received your order and will reach out to you on WhatsApp soon to confirm it. Please keep an eye out for our message.

Here's a summary of what you ordered:

  ${itemLines}

  Items Total:  ₹${order.itemsTotal}
  Delivery Fee: ₹${order.deliveryFee}
  Total:        ₹${order.total}

  Delivery: ${deliveryDateFormatted} | ${order.deliveryTime}
  Address:  ${order.address}
${order.notes ? `  Notes:    ${order.notes}\n` : ''}
Fresh from our farm in Magadi, straight to your door. 🌱

With love,
Ainora Mane Thota
Magadi, Karnataka
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
