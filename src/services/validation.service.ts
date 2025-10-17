import { plainToClass } from 'class-transformer';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';

import type { IValidationService, IServiceResponse } from '../common/interfaces/service.interface.js';

/**
 * Service for handling data validation using class-validator
 */
export class ValidationService implements IValidationService {
  /**
   * Validate DTO using class-validator decorators
   */
  async validateDto<T>(dto: any, dtoClass: new () => T): Promise<IServiceResponse<T>> {
    try {
      // Transform plain object to class instance
      const classInstance = plainToClass(dtoClass, dto);

      // Validate the class instance
      const errors: ValidationError[] = await validate(classInstance as any);

      if (errors.length > 0) {
        const errorMessages = this.formatValidationErrors(errors);
        return {
          success: false,
          error: `Validation failed: ${errorMessages.join(', ')}`,
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data: classInstance,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate required fields
   */
  validateRequired(fields: Record<string, any>): IServiceResponse<void> {
    const missingFields: string[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null || value === '') {
        missingFields.push(key);
      }
    }

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        timestamp: new Date()
      };
    }

    return {
      success: true,
      timestamp: new Date()
    };
  }

  /**
   * Format validation errors into readable messages
   */
  private formatValidationErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];

    for (const error of errors) {
      if (error.constraints) {
        const constraintMessages = Object.values(error.constraints);
        messages.push(...constraintMessages);
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedMessages = this.formatValidationErrors(error.children);
        messages.push(...nestedMessages.map(msg => `${error.property}.${msg}`));
      }
    }

    return messages;
  }
}

// Export singleton instance
export const validationService = new ValidationService();
