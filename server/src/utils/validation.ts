import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[\W_]/, 'Password must contain at least one special character (!@#$%^&*)');

export const phoneSchema = z
    .string()
    .regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, 'Invalid phone number format (Vietnam standard)')
    .optional()
    .or(z.literal(''));

export const fullNameSchema = z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must not exceed 50 characters')
    .regex(/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/, 'Full name must only contain letters and spaces');

export const userCreateSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    fullName: fullNameSchema,
    phoneNumber: phoneSchema,
    role: z.nativeEnum(UserRole).optional(),
});

export const userUpdateSchema = z.object({
    fullName: fullNameSchema.optional(),
    phoneNumber: phoneSchema,
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
});

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    fullName: fullNameSchema,
});

export const formatZodError = (error: z.ZodError) => {
    const errors = (error as any).issues || (error as any).errors || [];
    return errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
    }));
};
