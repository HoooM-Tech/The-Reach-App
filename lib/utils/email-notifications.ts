/**
 * Email notification utilities for wallet transactions
 * Integrate with your email service (SendGrid, AWS SES, etc.)
 */

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

/**
 * Send email notification
 * Replace this with your actual email service integration
 */
export async function sendEmail(data: EmailData): Promise<void> {
  // TODO: Integrate with email service
  // Example with SendGrid, AWS SES, or Nodemailer:
  
  console.log('Email notification:', {
    to: data.to,
    subject: data.subject,
    template: data.template,
    data: data.data,
  });

  // Example implementation:
  // await emailService.send({
  //   to: data.to,
  //   subject: data.subject,
  //   html: renderTemplate(data.template, data.data),
  // });
}

/**
 * Send deposit confirmation email
 */
export async function sendDepositConfirmationEmail(
  userEmail: string,
  userName: string,
  amount: number,
  reference: string,
  balance: number
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: 'Wallet Funded Successfully',
    template: 'deposit-confirmation',
    data: {
      name: userName,
      amount: amount.toLocaleString('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }),
      reference,
      balance: balance.toLocaleString('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }),
      date: new Date().toLocaleString('en-NG'),
    },
  });
}

/**
 * Send withdrawal confirmation email
 */
export async function sendWithdrawalConfirmationEmail(
  userEmail: string,
  userName: string,
  amount: number,
  bankName: string,
  accountNumber: string,
  reference: string
): Promise<void> {
  const maskedAccount = accountNumber.slice(-4).padStart(accountNumber.length, '*');
  
  await sendEmail({
    to: userEmail,
    subject: 'Withdrawal Request Received',
    template: 'withdrawal-confirmation',
    data: {
      name: userName,
      amount: amount.toLocaleString('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }),
      bank_name: bankName,
      account_number: maskedAccount,
      reference,
      estimated_arrival: '10-30 minutes',
      date: new Date().toLocaleString('en-NG'),
    },
  });
}

/**
 * Send withdrawal completion email
 */
export async function sendWithdrawalCompletedEmail(
  userEmail: string,
  userName: string,
  amount: number,
  reference: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: 'Withdrawal Completed',
    template: 'withdrawal-completed',
    data: {
      name: userName,
      amount: amount.toLocaleString('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }),
      reference,
      date: new Date().toLocaleString('en-NG'),
    },
  });
}

/**
 * Send withdrawal failed email
 */
export async function sendWithdrawalFailedEmail(
  userEmail: string,
  userName: string,
  amount: number,
  reference: string,
  reason?: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: 'Withdrawal Failed',
    template: 'withdrawal-failed',
    data: {
      name: userName,
      amount: amount.toLocaleString('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }),
      reference,
      reason: reason || 'Payment gateway error',
      date: new Date().toLocaleString('en-NG'),
    },
  });
}
