const tokenPattern = /\d+(?:\.\d+)?|[()+\-*/]/g;

export const evaluateArithmetic = (input: string) => {
  const compactInput = input.replace(/\s/g, '');
  const tokens = compactInput.match(tokenPattern) ?? [];

  if (tokens.join('') !== compactInput) {
    return Number.NaN;
  }

  let index = 0;

  const parseFactor = (): number => {
    const token = tokens[index++];

    if (token === '+' || token === '-') {
      const value = parseFactor();
      return token === '-' ? -value : value;
    }

    if (token === '(') {
      const value = parseExpression();
      return tokens[index++] === ')' ? value : Number.NaN;
    }

    return token === undefined ? Number.NaN : Number(token);
  };

  const parseTerm = (): number => {
    let value = parseFactor();

    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++];
      const operand = parseFactor();
      value = operator === '*' ? value * operand : value / operand;
    }

    return value;
  };

  function parseExpression(): number {
    let value = parseTerm();

    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      const operand = parseTerm();
      value = operator === '+' ? value + operand : value - operand;
    }

    return value;
  }

  const result = parseExpression();
  return index === tokens.length && Number.isFinite(result) ? result : Number.NaN;
};
