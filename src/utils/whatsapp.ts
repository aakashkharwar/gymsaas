/**
 * Mock service for WhatsApp integration.
 * In production, this would integrate with MSG91 or Meta BSP.
 */

export async function sendOwnerSummary(
  ownerPhone: string,
  gymName: string,
  overdueCount: number,
  totalAmount: number
) {
  console.log('==================================================');
  console.log(`[WhatsApp API Mock] -> To Gym Owner (${ownerPhone})`);
  console.log(`Hi ${gymName} Admin,`);
  console.log(`You have ${overdueCount} members with overdue fees today.`);
  console.log(`Total amount pending: ₹${totalAmount.toLocaleString('en-IN')}.`);
  console.log('Check your GymOS dashboard for details.');
  console.log('==================================================');
  return true;
}

export async function sendMemberReminder(
  memberPhone: string,
  memberName: string,
  gymName: string,
  amount: number,
  dueDate: string
) {
  console.log('==================================================');
  console.log(`[WhatsApp API Mock] -> To Member (${memberPhone})`);
  console.log(`Hello ${memberName},`);
  console.log(`This is a polite reminder from ${gymName} that your fee of ₹${amount} was due on ${dueDate}.`);
  console.log('Please pay at the front desk to avoid late fees.');
  console.log('Thank you!');
  console.log('==================================================');
  return true;
}
