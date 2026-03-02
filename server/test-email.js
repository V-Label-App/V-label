import { EmailService } from './dist/src/services/email/email.service.js';

async function testEmail() {
    console.log('🧪 Testing Email Service...\n');

    const emailService = new EmailService();

    try {
        console.log('Sending test email with TASK_ASSIGNED template...');

        await emailService.sendEmail({
            to: 'buitrongtri2004@gmail.com', // Test email
            templateType: 'TASK_ASSIGNED',
            variables: {
                userName: 'Test User',
                projectName: 'Test Project',
                taskId: '12345678',
                deadline: 'March 02, 2026 10:00 AM',
                taskUrl: 'http://localhost:5173/annotator/tasks/test-123'
            }
        });

        console.log('\n✅ Email sent successfully!');
        console.log('Check your inbox at: buitrongtri2004@gmail.com');
    } catch (error) {
        console.error('\n❌ Email failed:', error.message);
        console.error('Full error:', error);
    }

    process.exit(0);
}

testEmail();
