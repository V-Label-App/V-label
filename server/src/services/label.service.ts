import { prisma } from '../utils/database.js';
import { Prisma } from '@prisma/client';
import { NotificationService } from './notification.service.js';
import * as XLSX from 'xlsx';

// =========================================================
// CSV IMPORT/EXPORT TYPES
// =========================================================

export interface LabelImportRow {
    category_name: string;
    category_description: string;
    label_name: string;
    label_color: string;
    is_global: string;
}

export interface LabelImportResult {
    success: boolean;
    categoriesCreated: number;
    labelsCreated: number;
    labelsSkipped: number;
    errors: string[];
}

export interface LabelExportRow {
    category_name: string;
    category_description: string;
    label_name: string;
    label_color: string;
    is_global: string;
}

// =========================================================
// LABEL CATEGORY SERVICE
// =========================================================

export class LabelCategoryService {
    /**
     * Get all categories
     */
    static async getAll() {
        return await prisma.labelCategory.findMany({
            include: {
                _count: {
                    select: { labels: true },
                },
                creator: {
                    select: { id: true, fullName: true, email: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get category by ID
     */
    static async getById(id: string) {
        return await prisma.labelCategory.findUnique({
            where: { id },
            include: {
                creator: {
                    select: { id: true, fullName: true, email: true },
                },
                labels: {
                    include: {
                        creator: {
                            select: { id: true, fullName: true, email: true },
                        },
                    },
                },
            },
        });
    }

    /**
     * Create a new category
     */
    static async create(data: { name: string; description?: string; createdBy?: string }) {
        return await prisma.labelCategory.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                createdBy: data.createdBy ?? null,
            },
            include: {
                creator: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });
    }

    /**
     * Update a category
     */
    static async update(id: string, data: { name?: string; description?: string }) {
        return await prisma.labelCategory.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete a category (only if no labels are associated)
     */
    static async delete(id: string) {
        // Check if category has labels
        const labelsCount = await prisma.label.count({
            where: { categoryId: id },
        });

        if (labelsCount > 0) {
            throw new Error(`Cannot delete category: ${labelsCount} labels are still associated`);
        }

        return await prisma.labelCategory.delete({
            where: { id },
        });
    }
}

// =========================================================
// LABEL SERVICE
// =========================================================

export class LabelService {
    /**
     * Get all labels with optional filters
     */
    static async getAll(filters?: { isGlobal?: boolean; categoryId?: string; search?: string }) {
        const where: Prisma.LabelWhereInput = {};

        if (filters?.isGlobal !== undefined) {
            where.isGlobal = filters.isGlobal;
        }

        if (filters?.categoryId) {
            where.categoryId = filters.categoryId;
        }

        if (filters?.search) {
            where.name = {
                contains: filters.search,
                mode: 'insensitive',
            };
        }

        return await prisma.label.findMany({
            where,
            include: {
                category: true,
                creator: {
                    select: { id: true, fullName: true, email: true },
                },
                _count: {
                    select: { projectLabels: true },
                },
            },
            orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
        });
    }

    /**
     * Get label by ID
     */
    static async getById(id: string) {
        return await prisma.label.findUnique({
            where: { id },
            include: {
                category: true,
                creator: {
                    select: { id: true, fullName: true, email: true },
                },
                projectLabels: {
                    include: {
                        project: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });
    }

    /**
     * Create a new label
     */
    static async create(data: {
        name: string;
        color: string;
        isGlobal?: boolean;
        categoryId?: string;
        createdBy: string;
    }) {
        // Validate color format
        if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
            throw new Error('Invalid color format. Use hex format: #RRGGBB');
        }

        // Check for duplicate name in same category
        const existing = await prisma.label.findFirst({
            where: {
                name: { equals: data.name, mode: 'insensitive' },
                categoryId: data.categoryId || null,
            },
        });

        if (existing) {
            throw new Error(`Label "${data.name}" already exists in this category`);
        }

        const label = await prisma.label.create({
            data: {
                name: data.name,
                color: data.color,
                isGlobal: data.isGlobal ?? false,
                categoryId: data.categoryId ?? null,
                createdBy: data.createdBy,
            },
            include: {
                category: true,
                creator: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });

        // Notify all users about new label creation
        await NotificationService.createLabelCreatedNotification({
            labelId: label.id,
            labelName: label.name,
            labelColor: label.color,
            isGlobal: label.isGlobal,
            creatorId: data.createdBy,
            creatorName: label.creator?.fullName || label.creator?.email || 'Unknown',
            ...(label.category?.name && { categoryName: label.category.name }),
        });

        return label;
    }

    /**
     * Update a label
     */
    static async update(
        id: string,
        data: {
            name?: string;
            color?: string;
            isGlobal?: boolean;
            categoryId?: string | null;
        }
    ) {
        // Validate color format if provided
        if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
            throw new Error('Invalid color format. Use hex format: #RRGGBB');
        }

        // Check for duplicate name if name is being changed
        if (data.name) {
            const whereClause: Prisma.LabelWhereInput = {
                name: { equals: data.name, mode: 'insensitive' },
                id: { not: id },
            };
            // Only add categoryId filter if it's explicitly provided (not undefined)
            if (data.categoryId !== undefined) {
                whereClause.categoryId = data.categoryId;
            }
            const existing = await prisma.label.findFirst({
                where: whereClause,
            });

            if (existing) {
                throw new Error(`Label "${data.name}" already exists in this category`);
            }
        }

        return await prisma.label.update({
            where: { id },
            data,
            include: {
                category: true,
                creator: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });
    }

    /**
     * Delete a label (only if not used in any project)
     */
    static async delete(id: string) {
        // Check if label is used in any project
        const usageCount = await prisma.projectLabel.count({
            where: { labelId: id },
        });

        if (usageCount > 0) {
            throw new Error(`Cannot delete label: it is used in ${usageCount} project(s)`);
        }

        return await prisma.label.delete({
            where: { id },
        });
    }

    /**
     * Get labels available for a project (global labels + project's own labels)
     */
    static async getAvailableForProject(projectId: string) {
        // Get all global labels
        const globalLabels = await prisma.label.findMany({
            where: { isGlobal: true },
            include: {
                category: true,
            },
        });

        // Get labels already assigned to this project
        const projectLabels = await prisma.projectLabel.findMany({
            where: { projectId },
            include: {
                label: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        const assignedLabelIds = new Set(projectLabels.map((pl) => pl.labelId));

        return {
            available: globalLabels.filter((l) => !assignedLabelIds.has(l.id)),
            assigned: projectLabels.map((pl) => pl.label),
        };
    }

    /**
     * Export all labels to CSV format
     */
    static async exportToCSV(): Promise<string> {
        const labels = await prisma.label.findMany({
            include: {
                category: true,
            },
            orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
        });

        // CSV header
        const header = 'category_name,category_description,label_name,label_color,is_global';

        // CSV rows
        const rows = labels.map(label => {
            const categoryName = label.category?.name || '';
            const categoryDesc = label.category?.description || '';
            // Escape fields that might contain commas or quotes
            const escapeCsvField = (field: string) => {
                if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };

            return [
                escapeCsvField(categoryName),
                escapeCsvField(categoryDesc),
                escapeCsvField(label.name),
                label.color,
                label.isGlobal ? 'true' : 'false',
            ].join(',');
        });

        return [header, ...rows].join('\n');
    }

    /**
     * Import labels from CSV data
     */
    static async importFromCSV(csvData: string, createdBy: string): Promise<LabelImportResult> {
        const result: LabelImportResult = {
            success: true,
            categoriesCreated: 0,
            labelsCreated: 0,
            labelsSkipped: 0,
            errors: [],
        };

        // Parse CSV
        const lines = csvData.trim().split('\n');
        if (lines.length < 2) {
            result.success = false;
            result.errors.push('CSV file is empty or has no data rows');
            return result;
        }

        // Validate header
        const headerLine = lines[0];
        if (!headerLine) {
            result.success = false;
            result.errors.push('CSV file has no header row');
            return result;
        }
        const header = headerLine.toLowerCase().trim();
        const expectedHeader = 'category_name,category_description,label_name,label_color,is_global';
        if (!header.includes('label_name') || !header.includes('label_color')) {
            result.success = false;
            result.errors.push('Invalid CSV header. Expected: ' + expectedHeader);
            return result;
        }

        // Parse header to get column indices
        const headerCols = this.parseCSVLine(header);
        const colIndex = {
            category_name: headerCols.indexOf('category_name'),
            category_description: headerCols.indexOf('category_description'),
            label_name: headerCols.indexOf('label_name'),
            label_color: headerCols.indexOf('label_color'),
            is_global: headerCols.indexOf('is_global'),
        };

        // Cache for categories to avoid repeated lookups
        const categoryCache = new Map<string, string>(); // name -> id

        // Process each data row
        for (let i = 1; i < lines.length; i++) {
            const rawLine = lines[i];
            if (!rawLine) continue;
            const line = rawLine.trim();
            if (!line) continue;

            try {
                const cols = this.parseCSVLine(line);

                const categoryName = colIndex.category_name >= 0 ? (cols[colIndex.category_name]?.trim() || '') : '';
                const categoryDesc = colIndex.category_description >= 0 ? (cols[colIndex.category_description]?.trim() || '') : '';
                const labelName = colIndex.label_name >= 0 ? (cols[colIndex.label_name]?.trim() || '') : '';
                const labelColor = colIndex.label_color >= 0 ? (cols[colIndex.label_color]?.trim() || '') : '';
                const isGlobalStr = colIndex.is_global >= 0 ? (cols[colIndex.is_global]?.trim()?.toLowerCase() || 'true') : 'true';

                // Validate required fields
                if (!labelName) {
                    result.errors.push(`Row ${i + 1}: label_name is required`);
                    result.labelsSkipped++;
                    continue;
                }

                // Validate and normalize color
                let color = labelColor;
                if (!color) {
                    // Generate random color if not provided
                    const defaultColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'] as const;
                    color = defaultColors[Math.floor(Math.random() * defaultColors.length)] ?? '#FF6B6B';
                } else if (!color.startsWith('#')) {
                    color = '#' + color;
                }

                if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    result.errors.push(`Row ${i + 1}: Invalid color format "${labelColor}". Use hex format: #RRGGBB`);
                    result.labelsSkipped++;
                    continue;
                }

                const isGlobal = isGlobalStr === 'true' || isGlobalStr === '1' || isGlobalStr === 'yes';

                // Get or create category
                let categoryId: string | null = null;
                if (categoryName) {
                    if (categoryCache.has(categoryName)) {
                        categoryId = categoryCache.get(categoryName)!;
                    } else {
                        // Check if category exists
                        let category = await prisma.labelCategory.findFirst({
                            where: { name: { equals: categoryName, mode: 'insensitive' } },
                        });

                        if (!category) {
                            // Create new category
                            category = await prisma.labelCategory.create({
                                data: {
                                    name: categoryName,
                                    description: categoryDesc || null,
                                },
                            });
                            result.categoriesCreated++;
                        }

                        categoryId = category.id;
                        categoryCache.set(categoryName, categoryId);
                    }
                }

                // Check if label already exists
                const existingLabel = await prisma.label.findFirst({
                    where: {
                        name: { equals: labelName, mode: 'insensitive' },
                        categoryId: categoryId,
                    },
                });

                if (existingLabel) {
                    result.errors.push(`Row ${i + 1}: Label "${labelName}" already exists in category "${categoryName || 'Uncategorized'}"`);
                    result.labelsSkipped++;
                    continue;
                }

                // Create label
                await prisma.label.create({
                    data: {
                        name: labelName,
                        color: color,
                        isGlobal: isGlobal,
                        categoryId: categoryId,
                        createdBy: createdBy,
                    },
                });
                result.labelsCreated++;

            } catch (error: any) {
                result.errors.push(`Row ${i + 1}: ${error.message}`);
                result.labelsSkipped++;
            }
        }

        if (result.labelsCreated === 0 && result.labelsSkipped > 0) {
            result.success = false;
        }

        return result;
    }

    /**
     * Parse a CSV line handling quoted fields
     */
    private static parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * Get CSV template
     */
    static getCSVTemplate(): string {
        const header = 'category_name,category_description,label_name,label_color,is_global';
        const examples = [
            'Animals,Animal detection labels,Dog,#FF6B6B,true',
            'Animals,Animal detection labels,Cat,#4ECDC4,true',
            'Animals,Animal detection labels,Bird,#10B981,true',
            'Vehicles,Vehicle detection labels,Car,#3B82F6,true',
            'Vehicles,Vehicle detection labels,Truck,#8B5CF6,false',
            ',,Person,#EC4899,true',
        ];
        return [header, ...examples].join('\n');
    }

    /**
     * Export all labels to Excel format
     */
    static async exportToExcel(): Promise<Buffer> {
        const labels = await prisma.label.findMany({
            include: {
                category: true,
            },
            orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
        });

        // Prepare data for Excel
        const data: LabelExportRow[] = labels.map(label => ({
            category_name: label.category?.name || '',
            category_description: label.category?.description || '',
            label_name: label.name,
            label_color: label.color,
            is_global: label.isGlobal ? 'true' : 'false',
        }));

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 20 }, // category_name
            { wch: 30 }, // category_description
            { wch: 20 }, // label_name
            { wch: 12 }, // label_color
            { wch: 10 }, // is_global
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Labels');

        // Generate buffer
        return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    }

    /**
     * Import labels from Excel buffer
     */
    static async importFromExcel(buffer: Buffer, createdBy: string): Promise<LabelImportResult> {
        const result: LabelImportResult = {
            success: true,
            categoriesCreated: 0,
            labelsCreated: 0,
            labelsSkipped: 0,
            errors: [],
        };

        try {
            // Read workbook from buffer
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                result.success = false;
                result.errors.push('Excel file has no sheets');
                return result;
            }

            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                result.success = false;
                result.errors.push('Could not read worksheet');
                return result;
            }
            const rows = XLSX.utils.sheet_to_json<LabelImportRow>(worksheet);

            if (rows.length === 0) {
                result.success = false;
                result.errors.push('Excel sheet is empty');
                return result;
            }

            // Cache for categories
            const categoryCache = new Map<string, string>();

            // Process each row
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;
                const rowNum = i + 2; // +2 because Excel is 1-indexed and has header

                try {
                    const categoryName = String(row.category_name ?? '').trim();
                    const categoryDesc = String(row.category_description ?? '').trim();
                    const labelName = String(row.label_name ?? '').trim();
                    const labelColor = String(row.label_color ?? '').trim();
                    const isGlobalStr = String(row.is_global ?? 'true').toLowerCase().trim();

                    // Validate required fields
                    if (!labelName) {
                        result.errors.push(`Row ${rowNum}: label_name is required`);
                        result.labelsSkipped++;
                        continue;
                    }

                    // Validate and normalize color
                    let color = labelColor;
                    if (!color) {
                        const defaultColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'] as const;
                        color = defaultColors[Math.floor(Math.random() * defaultColors.length)] ?? '#FF6B6B';
                    } else if (!color.startsWith('#')) {
                        color = '#' + color;
                    }

                    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                        result.errors.push(`Row ${rowNum}: Invalid color format "${labelColor}". Use hex format: #RRGGBB`);
                        result.labelsSkipped++;
                        continue;
                    }

                    const isGlobal = isGlobalStr === 'true' || isGlobalStr === '1' || isGlobalStr === 'yes';

                    // Get or create category
                    let categoryId: string | null = null;
                    if (categoryName) {
                        if (categoryCache.has(categoryName)) {
                            categoryId = categoryCache.get(categoryName)!;
                        } else {
                            let category = await prisma.labelCategory.findFirst({
                                where: { name: { equals: categoryName, mode: 'insensitive' } },
                            });

                            if (!category) {
                                category = await prisma.labelCategory.create({
                                    data: {
                                        name: categoryName,
                                        description: categoryDesc || null,
                                    },
                                });
                                result.categoriesCreated++;
                            }

                            categoryId = category.id;
                            categoryCache.set(categoryName, categoryId);
                        }
                    }

                    // Check if label already exists
                    const existingLabel = await prisma.label.findFirst({
                        where: {
                            name: { equals: labelName, mode: 'insensitive' },
                            categoryId: categoryId,
                        },
                    });

                    if (existingLabel) {
                        result.errors.push(`Row ${rowNum}: Label "${labelName}" already exists in category "${categoryName || 'Uncategorized'}"`);
                        result.labelsSkipped++;
                        continue;
                    }

                    // Create label
                    await prisma.label.create({
                        data: {
                            name: labelName,
                            color: color,
                            isGlobal: isGlobal,
                            categoryId: categoryId,
                            createdBy: createdBy,
                        },
                    });
                    result.labelsCreated++;

                } catch (error: any) {
                    result.errors.push(`Row ${rowNum}: ${error.message}`);
                    result.labelsSkipped++;
                }
            }

            if (result.labelsCreated === 0 && result.labelsSkipped > 0) {
                result.success = false;
            }

        } catch (error: any) {
            result.success = false;
            result.errors.push(`Failed to parse Excel file: ${error.message}`);
        }

        return result;
    }

    /**
     * Get Excel template
     */
    static getExcelTemplate(): Buffer {
        const data: LabelExportRow[] = [
            { category_name: 'Animals', category_description: 'Animal detection labels', label_name: 'Dog', label_color: '#FF6B6B', is_global: 'true' },
            { category_name: 'Animals', category_description: 'Animal detection labels', label_name: 'Cat', label_color: '#4ECDC4', is_global: 'true' },
            { category_name: 'Animals', category_description: 'Animal detection labels', label_name: 'Bird', label_color: '#10B981', is_global: 'true' },
            { category_name: 'Vehicles', category_description: 'Vehicle detection labels', label_name: 'Car', label_color: '#3B82F6', is_global: 'true' },
            { category_name: 'Vehicles', category_description: 'Vehicle detection labels', label_name: 'Truck', label_color: '#8B5CF6', is_global: 'false' },
            { category_name: '', category_description: '', label_name: 'Person', label_color: '#EC4899', is_global: 'true' },
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 20 },
            { wch: 30 },
            { wch: 20 },
            { wch: 12 },
            { wch: 10 },
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Labels');

        return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    }
}

// =========================================================
// PROJECT LABEL SERVICE
// =========================================================

export class ProjectLabelService {
    /**
     * Get all labels for a project
     */
    static async getProjectLabels(projectId: string) {
        return await prisma.projectLabel.findMany({
            where: { projectId },
            include: {
                label: {
                    include: {
                        category: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Assign a label to a project
     */
    static async assignLabel(projectId: string, labelId: string) {
        // Check if already assigned
        const existing = await prisma.projectLabel.findUnique({
            where: {
                projectId_labelId: { projectId, labelId },
            },
        });

        if (existing) {
            throw new Error('Label is already assigned to this project');
        }

        return await prisma.projectLabel.create({
            data: {
                projectId,
                labelId,
            },
            include: {
                label: {
                    include: {
                        category: true,
                    },
                },
            },
        });
    }

    /**
     * Assign multiple labels to a project
     */
    static async assignLabels(projectId: string, labelIds: string[]) {
        // Filter out already assigned labels
        const existing = await prisma.projectLabel.findMany({
            where: {
                projectId,
                labelId: { in: labelIds },
            },
            select: { labelId: true },
        });

        const existingIds = new Set(existing.map((e) => e.labelId));
        const newLabelIds = labelIds.filter((id) => !existingIds.has(id));

        if (newLabelIds.length === 0) {
            return { count: 0 };
        }

        return await prisma.projectLabel.createMany({
            data: newLabelIds.map((labelId) => ({
                projectId,
                labelId,
            })),
        });
    }

    /**
     * Remove a label from a project
     */
    static async removeLabel(projectId: string, labelId: string) {
        return await prisma.projectLabel.delete({
            where: {
                projectId_labelId: { projectId, labelId },
            },
        });
    }

    /**
     * Update project's labels (replace all)
     */
    static async updateProjectLabels(projectId: string, labelIds: string[]) {
        // Delete all existing
        await prisma.projectLabel.deleteMany({
            where: { projectId },
        });

        // Create new associations
        if (labelIds.length > 0) {
            await prisma.projectLabel.createMany({
                data: labelIds.map((labelId) => ({
                    projectId,
                    labelId,
                })),
            });
        }

        // Return updated list
        return await this.getProjectLabels(projectId);
    }
}
