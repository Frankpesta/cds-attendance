"use client";
import { useState, useCallback } from "react";
import { ValidationError, ValidationResult } from "@/lib/validation";

export interface UseFormValidationReturn {
  errors: ValidationError[];
  validateField: (field: string, value: any) => boolean;
  validateForm: (validationFn: () => ValidationResult) => boolean;
  clearErrors: () => void;
  clearFieldError: (field: string) => void;
  setFieldError: (field: string, message: string) => void;
  getFieldError: (field: string) => string | undefined;
  hasErrors: boolean;
}

export const useFormValidation = (): UseFormValidationReturn => {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateField = useCallback((field: string, value: any): boolean => {
    // Remove existing error for this field
    setErrors(prev => prev.filter(error => error.field !== field));
    return true; // Individual field validation will be handled by the validation functions
  }, []);

  const validateForm = useCallback((validationFn: () => ValidationResult): boolean => {
    const result = validationFn();
    setErrors(result.errors);
    return result.isValid;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => {
      const filtered = prev.filter(error => error.field !== field);
      return [...filtered, { field, message }];
    });
  }, []);

  const getFieldError = useCallback((field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  }, [errors]);

  const hasErrors = errors.length > 0;

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError,
    setFieldError,
    getFieldError,
    hasErrors,
  };
};
