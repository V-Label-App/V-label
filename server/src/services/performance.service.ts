
import { prisma } from '../utils/database.js';
import { AssignmentStatus } from '@prisma/client';

export class PerformanceService {
    /**
     * Get weekly activity (Completed vs Rejected) for the last 7 days
     */
    static async getWeeklyActivity(userId: string) {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 6); // Go back 6 days + today = 7 days
        lastWeek.setHours(0, 0, 0, 0);

        const tasks = await prisma.taskAssignment.findMany({
            where: {
                annotatorId: userId,
                updatedAt: {
                    gte: lastWeek,
                },
                status: {
                    in: ['APPROVED', 'SUBMITTED', 'REJECTED'],
                },
            },
            select: {
                status: true,
                updatedAt: true,
            },
        });

        // Initialize map for last 7 days
        const activityMap = new Map<string, { completed: number; rejected: number }>();
        for (let i = 0; i < 7; i++) {
            const d = new Date(lastWeek);
            d.setDate(lastWeek.getDate() + i);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
            activityMap.set(dayName, { completed: 0, rejected: 0 });
        }

        // Populate data
        tasks.forEach(task => {
            const dayName = task.updatedAt.toLocaleDateString('en-US', { weekday: 'short' });
            if (activityMap.has(dayName)) {
                const entry = activityMap.get(dayName)!;
                if (task.status === 'REJECTED') {
                    entry.rejected++;
                } else {
                    // APPROVED or SUBMITTED counts as "Completed" for activity chart
                    entry.completed++;
                }
            }
        });

        // Convert to array
        return Array.from(activityMap.entries()).map(([name, data]) => ({
            name,
            completed: data.completed,
            rejected: data.rejected
        }));
    }

    /**
     * Get overall task status distribution
     */
    static async getTaskStatusDistribution(userId: string) {
        const distribution = await prisma.taskAssignment.groupBy({
            by: ['status'],
            where: {
                annotatorId: userId,
            },
            _count: {
                status: true,
            },
        });

        // Map Prisma status to UI categories
        let assigned = 0;
        let submitted = 0;
        let rejected = 0;

        distribution.forEach(item => {
            const count = item._count.status;
            switch (item.status) {
                case 'ASSIGNED':
                case 'IN_PROGRESS':
                    assigned += count;
                    break;
                case 'SUBMITTED':
                case 'APPROVED': // Approved is also a form of submitted/done
                    submitted += count;
                    break;
                case 'REJECTED':
                    rejected += count;
                    break;
                case 'SKIPPED':
                    // Maybe ignore or add to assigned? Let's ignore for now or add to assigned as 'todo'
                    assigned += count;
                    break;
            }
        });

        return [
            { name: 'Assigned', value: assigned, color: '#3B82F6' },
            { name: 'Submitted', value: submitted, color: '#8B5CF6' },
            { name: 'Rejected', value: rejected, color: '#EF4444' },
        ];
    }

    /**
     * Get today's hourly progress
     */
    static async getTodayProgress(userId: string) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await prisma.taskAssignment.findMany({
            where: {
                annotatorId: userId,
                updatedAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: {
                    in: ['APPROVED', 'SUBMITTED'], // Only count productive actions
                },
            },
            select: {
                updatedAt: true,
            },
        });

        // Initialize hourly buckets (9 AM to 5 PM usually, but let's do full day or dynamic)
        // The design shows specific hours. Let's do 24h or a range. The screenshot shows 9 AM - 4 PM.
        // Let's return dynamic cumulative count.

        // Sort tasks by time
        tasks.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

        // We can just return the raw data points or bucket them. 
        // Let's bucket by hour for 9 AM to 6 PM (standard work hours) or just all active hours.

        const progressMap = new Map<string, number>();

        // Initialize some standard hours to always show the axis even if empty
        const standardHours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];
        standardHours.forEach(h => progressMap.set(h, 0));

        // Calculate cumulative? Or per hour?
        // Screenshot looks like cumulative ("Today's Progress" usually implies cumulative total so far).
        // Area chart usually shows trend. Let's do cumulative.

        let cumulative = 0;
        // We need to map time to "9 AM" format

        // Easier approach: Get all tasks today, map to hour.
        const hourlyCounts = new Map<number, number>(); // hour 0-23 -> count

        tasks.forEach(t => {
            const h = t.updatedAt.getHours();
            hourlyCounts.set(h, (hourlyCounts.get(h) || 0) + 1);
        });

        const result = [];
        let currentTotal = 0;

        // Generate data for 7 AM to 8 PM (covering most work hours)
        for (let hour = 7; hour <= 20; hour++) {
            const count = hourlyCounts.get(hour) || 0;
            currentTotal += count;

            // Format time
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            const timeLabel = `${displayHour} ${ampm}`;

            result.push({
                time: timeLabel,
                tasks: currentTotal
            });
        }

        return result;
    }
}
