import moment from 'moment-timezone';
import timezones from 'timezones.json';
import {CustomValidationException, PhoneNumber} from "@_shared/types/general.types";

const UTCTimezones: string[] = [].concat(...timezones.map(timezone => timezone.utc || ""));
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
const ipAddressPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const phoneNumberPattern = /^\+?[1-9]\d{1,14}$/;

// ============ General Function =======================================
function validationException(error: string, type: string, insertThese: string[] = [], formEntry: string): CustomValidationException {
    return {
        error,
        type,
        insertThese,
        formEntry
    };
}

// ============ Type Guards ============================================
export function isStringType(value: any): value is string {
    return typeof value === 'string';
}

export function isNumberType(value: any): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isBooleanType(value: any): value is boolean {
    return typeof value === 'boolean';
}

export function isArrayType(value: any): value is any[] {
    return Array.isArray(value);
}

export function isObjectType(value: any): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDateType(value: any): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
}

export function isNull(value: any): value is null {
    return value === null;
}

export function isUndefined(value: any): value is undefined {
    return typeof value === 'undefined';
}

export function isEmpty(value: any): boolean {
    if (isNull(value) || isUndefined(value)) return true;
    if (isStringType(value)) return value.trim() === '';
    if (isArrayType(value)) return value.length === 0;
    if (isObjectType(value)) return Object.keys(value).length === 0;
    return false;
}

// ============ Format Validators ============================================
export function isEmail(email: any, name: string): CustomValidationException | null {
    // Type check
    if (!isStringType(email)) {
        return validationException("notString", "format", [name], name);
    }
    // Empty check
    if (isEmpty(email)) {
        return validationException("notEmpty", "format", [name], name);
    }
    // Format check
    if (!emailPattern.test(email)) {
        return validationException("notEmail", "format", [name], name);
    }
    return null;
}

export function isCorrectPassword(password: any, name: string): CustomValidationException | null {
    // Type check
    if (!isStringType(password)) {
        return validationException("notString", "format", [name], name);
    }
    // Empty check
    if (isEmpty(password)) {
        return validationException("notEmpty", "format", [name], name);
    }
    // Length check
    if (password.length < 8) {
        return validationException("passwordTooShort", "format", [name, "8"], name);
    }
    // Format check
    if (!passwordPattern.test(password)) {
        return validationException("notPassword", "format", [name], name);
    }
    return null;
}

export function isCorrectPhoneNumber(phoneNumber: PhoneNumber, name: string, prefix: string): CustomValidationException[] {
    const errors: CustomValidationException[] = [];
    // Type check for phoneNumber object
    if (!isObjectType(phoneNumber) || !('prefix' in phoneNumber) || !('number' in phoneNumber)) {
        errors.push(validationException("notPhoneNumberObject", "format", [name], name));
        return errors;
    }
    // Validate prefix
    if (!isStringType(phoneNumber.prefix) || isEmpty(phoneNumber.prefix)) {
        errors.push(validationException("notEmpty", "string", [prefix], prefix));
    } else if (!phoneNumberPattern.test(phoneNumber.number)) {
        errors.push(validationException("invalidPhonePrefix", "format", [prefix], prefix));
    }
    // Validate number
    if (!isStringType(phoneNumber.number) || isEmpty(phoneNumber.number)) {
        errors.push(validationException("notEmpty", "string", [name], name));
    } else if (!phoneNumberPattern.test(phoneNumber.number)) {
        errors.push(validationException("invalidPhoneNumber", "format", [name], name));
    }
    return errors;
}

export function isUrl(url: any, name: string): CustomValidationException | null {
    // Type check
    if (!isStringType(url)) {
        return validationException("notString", "format", [name], name);
    }
    // Empty check
    if (isEmpty(url)) {
        return validationException("notEmpty", "format", [name], name);
    }
    // Format check
    if (!urlPattern.test(url)) {
        return validationException("notUrl", "format", [name], name);
    }
    return null;
}

export function isIpAddress(ip: any, name: string): CustomValidationException | null {
    // Type check
    if (!isStringType(ip)) {
        return validationException("notString", "format", [name], name);
    }
    // Empty check
    if (isEmpty(ip)) {
        return validationException("notEmpty", "format", [name], name);
    }
    // Format check
    if (!ipAddressPattern.test(ip)) {
        return validationException("notIpAddress", "format", [name], name);
    }
    return null;
}

// ============ String Validators ===========================================
export function notEmpty(value: any, name: string): CustomValidationException | null {
    // Type check
    if (!isStringType(value)) {
        return validationException("notString", "string", [name], name);
    }
    // Empty check
    if (isEmpty(value)) {
        return validationException("notEmpty", "string", [name], name);
    }
    return null;
}

export function isMatch(value: any, compareValue: any, firstName: string, secondName: string): CustomValidationException | null {
    // Type checks
    if (!isStringType(value)) {
        return validationException("notString", "string", [firstName], firstName);
    }
    if (!isStringType(compareValue)) {
        return validationException("notString", "string", [secondName], secondName);
    }
    // Match check
    if (value !== compareValue) {
        return validationException("noMatch", "string", [firstName, secondName], firstName);
    }
    return null;
}

export function shouldNotMatch(value: any, compareValue: any, firstName: string, secondName: string): CustomValidationException | null {
    // Type checks
    if (!isStringType(value)) {
        return validationException("notString", "string", [firstName], firstName);
    }
    if (!isStringType(compareValue)) {
        return validationException("notString", "string", [secondName], secondName);
    }
    // Match check
    if (value === compareValue) {
        return validationException("shouldNotMatch", "string", [firstName, secondName], firstName);
    }
    return null;
}

export function mustBe(value: any, name: string, checkThese: string[]): CustomValidationException | null {
    // Type check
    if (!isStringType(value)) {
        return validationException("notString", "string", [name], name);
    }
    // Array check
    if (!isArrayType(checkThese)) {
        return validationException("invalidOptions", "string", [name], name);
    }
    // Value check
    if (!checkThese.includes(value)) {
        return validationException("mustBe", "string", [name, checkThese.join(", ")], name);
    }
    return null;
}

export function stringLength(value: any, name: string, minLength: number, maxLength: number): CustomValidationException | null {
    // Type check
    if (!isStringType(value)) {
        return validationException("notString", "string", [name], name);
    }
    // Length checks
    if (value.length < minLength) {
        return validationException("stringTooShort", "string", [name, minLength.toString()], name);
    }
    if (value.length > maxLength) {
        return validationException("stringTooLong", "string", [name, maxLength.toString()], name);
    }
    return null;
}

// ============ Number Validators ============================================
export function greaterThanOrEqual(value: any, name: string, greaterThan: number): CustomValidationException | null {
    // Type check
    if (!isNumberType(value)) {
        return validationException("notNumber", "number", [name], name);
    }
    // Comparison check
    if (value < greaterThan) {
        return validationException("greaterThanOrEqual", "number", [name, greaterThan.toString()], name);
    }
    return null;
}

export function lessThanOrEqual(value: any, name: string, lessThan: number): CustomValidationException | null {
    // Type check
    if (!isNumberType(value)) {
        return validationException("notNumber", "number", [name], name);
    }
    // Comparison check
    if (value > lessThan) {
        return validationException("lessThanOrEqual", "number", [name, lessThan.toString()], name);
    }
    return null;
}

export function isNumber(value: any, name: string): CustomValidationException | null {
    // Undefined check
    if (isUndefined(value)) {
        return validationException("notEmpty", "number", [name], name);
    }
    // Type check
    if (!isNumberType(value)) {
        return validationException("notNumber", "number", [name], name);
    }
    return null;
}

export function isInteger(value: any, name: string): CustomValidationException | null {
    // Number check first
    const numberError = isNumber(value, name);
    if (numberError) return numberError;
    // Integer check
    if (!Number.isInteger(value)) {
        return validationException("notInteger", "number", [name], name);
    }
    return null;
}

export function isPositive(value: any, name: string): CustomValidationException | null {
    // Number check first
    const numberError = isNumber(value, name);
    if (numberError) return numberError;
    // Positive check
    if (value <= 0) {
        return validationException("notPositive", "number", [name], name);
    }
    return null;
}

export function isNegative(value: any, name: string): CustomValidationException | null {
    // Number check first
    const numberError = isNumber(value, name);
    if (numberError) return numberError;
    // Negative check
    if (value >= 0) {
        return validationException("notNegative", "number", [name], name);
    }
    return null;
}

export function lessThanOrEqualToField(value: any, name: string, compareValue: any, compareName: string): CustomValidationException | null {
    // Type checks
    if (!isNumberType(value)) {
        return validationException("notNumber", "number", [name], name);
    }
    if (!isNumberType(compareValue)) {
        return validationException("notNumber", "number", [compareName], compareName);
    }
    // Comparison check
    if (value > compareValue) {
        return validationException("less_than_or_equal_to_field", "number", [name, compareName], name);
    }
    return null;
}

export function greaterThanOrEqualToField(value: any, name: string, compareValue: any, compareName: string): CustomValidationException | null {
    // Type checks
    if (!isNumberType(value)) {
        return validationException("notNumber", "number", [name], name);
    }
    if (!isNumberType(compareValue)) {
        return validationException("notNumber", "number", [compareName], compareName);
    }
    // Comparison check
    if (value < compareValue) {
        return validationException("greater_than_or_equal_to_field", "number", [name, compareName], name);
    }
    return null;
}

// ============ Date Validators ==============================================
export function convertDateToUTC(dateStr: string, timeZone: string): Date | null {
    const parsedDate = moment.tz(dateStr, 'YYYY-MM-DD', true, timeZone);
    return parsedDate.isValid() ? parsedDate.toDate() : null;
}

export function isValidTimeZone(timeZone: any, name: string): CustomValidationException | null {
    // Type check
    if (!isStringType(timeZone)) {
        return validationException("notString", "date", [name], name);
    }
    // Empty check
    if (isEmpty(timeZone)) {
        return validationException("notEmpty", "date", [name], name);
    }
    // Timezone check
    if (!UTCTimezones.includes(timeZone)) {
        return validationException("wrongTimezone", "date", [name], name);
    }
    return null;
}

export function isValidDate(value: any, name: string, timezone: string): CustomValidationException | null {
    // Type check
    if (!isStringType(value)) {
        return validationException("notString", "date", [name], name);
    }
    // Empty check
    if (isEmpty(value)) {
        return validationException("notEmpty", "date", [name], name);
    }
    // Timezone validation
    // const timezoneError = isValidTimeZone(timezone, "timezone", languageCode, null);
    // if (timezoneError) {
    //     return validationException("notCorrectDate", "date", [name], name);
    //
    //     return validationExceptionJoiner(timezoneError, error);
    // }
    // Date validation
    const date = convertDateToUTC(value, timezone);
    if (!date || isNaN(date.getTime())) {
        return validationException("notCorrectDate", "date", [name], name);
    }
    return null;
}

export function notInTheFuture(value: any, name: string, timezone: string): CustomValidationException | null {
    // Date validation first
    const dateError = isValidDate(value, name, timezone);
    if (dateError) return dateError;
    const today = new Date();
    const UTCValue = convertDateToUTC(value, timezone);
    if (UTCValue && UTCValue > today) {
        return validationException("notInTheFuture", "date", [name], name);
    }
    return null;
}

export function mustBe18(value: any, timezone: string, name: string): CustomValidationException | null {
    // Date validation first
    const dateError = isValidDate(value, name, timezone);
    if (dateError) return dateError;
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    const UTCValue = convertDateToUTC(value, timezone);
    if (UTCValue && UTCValue > eighteenYearsAgo) {
        return validationException("mustBe18", "user", [], name);
    }
    return null;
}

// ============ ObjectId Validators ==========================================
export function isObjectId(value: any, name: string): CustomValidationException | null {
    // Type check
    if (!isStringType(value)) {
        return validationException("notString", "objectId", [name], name);
    }
    // Empty check
    if (isEmpty(value)) {
        return validationException("notEmpty", "objectId", [name], name);
    }
    // Format check
    if (!objectIdPattern.test(value)) {
        return validationException("notCorrect", "objectId", [name], name);
    }
    return null;
}

export function isArrayOfObjectIds(value: any, name: string): CustomValidationException | null {
    // Type check
    if (!isArrayType(value)) {
        return validationException("notArray", "objectId", [name], name);
    }
    // Empty array check
    if (value.length === 0) {
        return validationException("notEmpty", "objectId", [name], name);
    }
    // Validate each element
    const errors: CustomValidationException[] = [];
    for (let i = 0; i < value.length; i++) {
        const elementName = `${name}[${i}]`;
        const elementError = isObjectId(value[i], elementName);
        if (elementError) {
            errors.push(elementError);
        }
    }
    if (errors.length > 0) {
        return validationException("notCorrectArray", "objectId", [name], name);
    }
    return null;
}

// ============ Boolean Validators ===========================================
export function isBoolean(value: any, name: string): CustomValidationException | null {
    // Undefined check
    if (isUndefined(value)) {
        return validationException("notEmpty", "boolean", [name], name);
    }
    // Type check
    if (!isBooleanType(value)) {
        return validationException("notBoolean", "boolean", [name], name);
    }
    return null;
}

export function isTrueBoolean(value: any, name: string): CustomValidationException | null {
    // Boolean check first
    const booleanError = isBoolean(value, name);
    if (booleanError) return booleanError;
    // True check
    if (value !== true) {
        return validationException("notTrue", "boolean", [name], name);
    }
    return null;
}

export function isFalseBoolean(value: any, name: string): CustomValidationException | null {
    // Boolean check first
    const booleanError = isBoolean(value, name);
    if (booleanError) return booleanError;
    // False check
    if (value !== false) {
        return validationException("notFalse", "boolean", [name], name);
    }
    return null;
}

// ============ Array Validators =============================================
export function isArray(value: any, name: string): CustomValidationException | null {
    if (!isArrayType(value)) {
        return validationException("notArray", "array", [name], name);
    }
    return null;
}

export function arrayNotEmpty(value: any, name: string): CustomValidationException | null {
    // Array check first
    const arrayError = isArray(value, name);
    if (arrayError) return arrayError;
    // Empty check
    if (value.length === 0) {
        return validationException("notEmpty", "array", [name], name);
    }
    return null;
}

export function arrayLength(value: any, name: string, minLength: number, maxLength: number): CustomValidationException | null {
    // Array check first
    const arrayError = isArray(value, name);
    if (arrayError) return arrayError;
    // Length checks
    if (value.length < minLength) {
        return validationException("arrayTooShort", "array", [name, minLength.toString()], name);
    }
    if (value.length > maxLength) {
        return validationException("arrayTooLong", "array", [name, maxLength.toString()], name);
    }
    return null;
}

// ============ Object Validators ============================================
export function isObject(value: any, name: string): CustomValidationException | null {
    if (!isObjectType(value)) {
        return validationException("notObject", "object", [name], name);
    }
    return null;
}

export function objectNotEmpty(value: any, name: string): CustomValidationException | null {
    // Object check first
    const objectError = isObject(value, name);
    if (objectError) return objectError;

    // Empty check
    if (Object.keys(value).length === 0) {
        return validationException("notEmpty", "object", [name], name);
    }
    return null;
}

// ============ Utility Functions ============================================
export function notNull(value: any, name: string): CustomValidationException | null {
    if (isNull(value) || isUndefined(value)) {
        return validationException("notEmpty", "any", [name], name);
    }
    return null;
}

export function isCorrectFormat(format: string, name: string): CustomValidationException | null {
    return validationException("notCorrect", "format", [name, format], name);
}

// ============ Combined Validators ==========================================
export function validateRequired(value: any, name: string): CustomValidationException | null {
    return notNull(value, name);
}

export function validateOptionalString(value: any, name: string): CustomValidationException | null {
    if (isNull(value) || isUndefined(value)) {
        return null;
    }
    return notEmpty(value, name);
}

export function validateOptionalNumber(value: any, name: string): CustomValidationException | null {
    if (isNull(value) || isUndefined(value)) {
        return null;
    }
    return isNumber(value, name);
}


