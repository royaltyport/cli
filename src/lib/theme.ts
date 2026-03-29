import chalk from 'chalk';

export const brand = chalk.green;
export const accent = chalk.cyan;
export const dim = chalk.dim;
export const bold = chalk.bold;
export const error = chalk.red;
export const warning = chalk.yellow;

export const spinnerColor = 'white';

export function brandBold(text: string): string {
  return chalk.bold(text);
}
