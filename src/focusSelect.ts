// A select prompt whose emphasis falls off from the live row, instead of
// lighting that one row and leaving every other one flat.
//
// `@inquirer/select` cannot express this. Its renderer is
// `const color = isActive ? theme.style.highlight : (x) => x`, so there is no
// styling hook for any row but the active one, and `normalizeChoices` reads
// each `name` into a plain string before the first keypress, so a getter can't
// reach the cursor either. This is that prompt's loop narrowed to what the card
// needs: one flat list, every row selectable, no separators, and no paging —
// the menu is a short fixed list shown all at once, which is what `pageSize`
// was already set to.

import {
  createPrompt,
  isBackspaceKey,
  isDownKey,
  isEnterKey,
  isNumberKey,
  isUpKey,
  useKeypress,
  useMemo,
  useRef,
  useState,
} from '@inquirer/core';
import chalk from 'chalk';
import { focusInk, glyph, ink, link, soft, success } from './ui.js';

export interface FocusChoice<T> {
  name: string;
  description?: string;
  value: T;
}

export interface FocusSelectConfig<T> {
  message: string;
  choices: ReadonlyArray<FocusChoice<T>>;
}

// How long a typed prefix stays live before the buffer is cleared, matching
// `@inquirer/select`.
const SEARCH_RESET_MS = 700;

const helpLine = [
  `${ink.bold(glyph.arrows)} ${soft('navigate')}`,
  `${ink.bold(glyph.enter)} ${soft('select')}`,
].join(soft(' • '));

const prompt = createPrompt<unknown, FocusSelectConfig<unknown>>((config, done) => {
  const [status, setStatus] = useState<'idle' | 'done'>('idle');
  const [active, setActive] = useState(0);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const items = useMemo(() => [...config.choices], [config.choices]);

  const current = items[active];
  if (current === undefined) {
    throw new Error('focusSelect was given no choices');
  }

  useKeypress((key, rl) => {
    clearTimeout(searchTimeout.current);

    if (isEnterKey(key)) {
      setStatus('done');
      done(current.value);
      return;
    }

    if (isUpKey(key) || isDownKey(key)) {
      rl.clearLine(0);
      const offset = isUpKey(key) ? -1 : 1;
      // Wraps at both ends, like the stock prompt's `loop`.
      setActive((active + offset + items.length) % items.length);
      return;
    }

    if (isNumberKey(key) && !Number.isNaN(Number(rl.line))) {
      const index = Number(rl.line) - 1;
      if (index >= 0 && index < items.length) setActive(index);
      searchTimeout.current = setTimeout(() => rl.clearLine(0), SEARCH_RESET_MS);
      return;
    }

    if (isBackspaceKey(key)) {
      rl.clearLine(0);
      return;
    }

    // Type-ahead: jump to the first row starting with what has been typed.
    const term = rl.line.toLowerCase();
    const match = items.findIndex((item) => item.name.toLowerCase().startsWith(term));
    if (match !== -1) setActive(match);
    searchTimeout.current = setTimeout(() => rl.clearLine(0), SEARCH_RESET_MS);
  });

  const message = ink.bold(config.message);

  // Answered: collapse to the prefix, the question and the chosen row.
  if (status === 'done') {
    return `${success(glyph.tick)} ${message} ${link(current.name)}`;
  }

  const rows = items.map((item, index) => {
    const paint = chalk.hex(focusInk(index - active));
    const live = index === active;
    return `${live ? paint(glyph.pointer) : ' '} ${live ? paint.bold(item.name) : paint(item.name)}`;
  });

  return [
    `${link(glyph.pointer)} ${message}`,
    ...rows,
    ' ',
    current.description ? soft(`  ${current.description}`) : '',
    helpLine,
  ]
    .filter(Boolean)
    .join('\n');
});

// `createPrompt` is instantiated once, so the generic lives on this wrapper;
// the casts are confined to here and the public signature stays honest.
export function focusSelect<T>(config: FocusSelectConfig<T>): Promise<T> {
  return prompt(config as FocusSelectConfig<unknown>) as Promise<T>;
}
