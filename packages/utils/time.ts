/** Contains methods relating to time */
export const time = {
  /**
   * Wait a certain amount of time and then resolve
   * @param ms - how many milliseconds to wait before resolving
   */
  wait: (ms: number) =>
    // Our timeout promise
    new Promise((resolve) => {
      // Set timeout to whatever time is provided
      const id = setTimeout(() => {
        clearTimeout(id);
        resolve(null);
      }, ms);
    }),
  /** Convert a time string into milliseconds */
  stringToMilliseconds: (timeString: string) => {
    /** The accepted time units */
    const timeUnits: { [key: string]: number } = {
      second: 1000,
      seconds: 1000,
      minute: 60 * 1000,
      minutes: 60 * 1000,
      hour: 60 * 60 * 1000,
      hours: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000, // Approximate month
      months: 30 * 24 * 60 * 60 * 1000, // Approximate month
      year: 365 * 24 * 60 * 60 * 1000, // Approximate year
      years: 365 * 24 * 60 * 60 * 1000, // Approximate year
    };

    // Extract the time unit match using regex
    const regex =
      /(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)/i;
    const match = timeString.match(regex);

    // Multiply our match by our unit to determine the correct number of milliseconds
    if (match) {
      const value = Number.parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      const milliseconds = timeUnits[unit] * value;

      return milliseconds;
    } else throw new Error('[time.stringToMilliseconds] Invalid time string format');
  },
};
