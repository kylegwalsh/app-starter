import * as changeCase from 'change-case';
import dayjs from 'dayjs';
import { isArray, isObject, transform } from 'lodash-es';

/** The different casing options available */
type Cases = Exclude<keyof typeof changeCase, 'split' | 'splitSeparateNumbers'>;

/** Provides utilities relating to formatting */
export const format = {
  /** Formats a string into a certain casing */
  case: (value: string | null, casing: Cases) => {
    // If the value doesn't exist return an empty string
    if (!value) {
      return '';
    }
    // If we can't find the case method, throw an error
    if (!changeCase[casing]) {
      throw new Error(`Format.case: Unable to find case method for ${casing}`);
    }

    // Otherwise, format the value
    return changeCase[casing](value);
  },
  caseKeys: (obj: object, casing: Cases) => {
    // If we can't find the case method, throw an error
    if (!changeCase[casing]) {
      throw new Error(`Format.case: Unable to find case method for ${casing}`);
    }

    // Otherwise, format the keys of the object recursively
    return transform(
      obj,
      (acc: Record<string, unknown>, value: unknown, key: string, target: unknown) => {
        const camelKey = isArray(target) ? key : changeCase[casing](key);
        acc[camelKey] = isObject(value) ? format.caseKeys(value, casing) : value;
      }
    );
  },
  /** Formats a date in a shorthand fashion */
  shorthandDate: (date: string | Date, format: 'monthDay' | 'monthYear') => {
    const baseDate = dayjs(date);

    switch (format) {
      case 'monthDay': {
        return baseDate.format('MMM D');
      }
      case 'monthYear': {
        return baseDate.format("MMM 'YY");
      }
    }
  },
  /** Formats a number in a shorthand fashion */
  shorthandNumber: (number: number) => {
    // If the number is less than 1000, just return it as is
    if (number < 1000) return `${number}`;
    // If the number is less than 1 million, format it with K
    else if (number < 1_000_000) return `${Math.round(number / 1000)}K`;
    // If the number is less than 1 billion, format it with M
    else if (number < 1_000_000_000) return `${Math.round(number / 1_000_000)}M`;
    // Otherwise, format it with B
    else return `${Math.round(number / 1_000_000_000)}B`;
  },
  /** Formats a number with commas */
  number: (number: number) => {
    return number.toLocaleString();
  },
  /** Formats date as "Oct 31, 2018" default case (can provide override format) */
  date: (date: Date, format = 'MMM D, YYYY') => dayjs(date).format(format),
  /** Formats time as "12:30 PM" */
  time: (date: Date) => dayjs(date).format('h:mm A'),
};
