import { BadRequestError } from "./error.js";

export const COACH_TYPES = Object.freeze([
     'AC_FIRST_CLASS',
     'AC_TWO_TIER',
     'AC_THREE_TIER',
     'SLEEPER',
     'GENERAL'
]);

export const BERTH_TYPES = Object.freeze([
     'LOWER',
     'MIDDLE',
     'UPPER',
     'SIDE_LOWER',
     'SIDE_UPPER'
]);

export const SCHEDULE_STATUSES = Object.freeze([
     'ACTIVE',
     'CANCELLED'
]);

export const assertAllowedValue = (fieldName, value, allowedValues) => {
     if (!allowedValues.includes(value)) {
          throw new BadRequestError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
     }
};

export const parsePositiveInteger = (fieldName, value) => {
     const number = Number(value);

     if (!Number.isInteger(number) || number <= 0) {
          throw new BadRequestError(`${fieldName} must be a positive integer`);
     }

     return number;
};

export const parsePositiveNumber = (fieldName, value) => {
     const number = Number(value);

     if (!Number.isFinite(number) || number <= 0) {
          throw new BadRequestError(`${fieldName} must be a positive number`);
     }

     return number;
};
