export const selectValidator =
  /^Select\s+(?:(\*|\w+)\s*(?:(?=from\b)|,\s*))+from\s+\w+(\s+where\s+\w+\s*(=|<|>|<=|>=)(\s+)?('\w+'|\w+))?$/i;

export const insertValidator =
  /^insert into\s+\w+(\s+\((\w+((\s*)?,\s*)?)+\))?\s+values\s+\((\w+((\s*)?,\s*)?(\s+)?)+\)/i;

export const idValidator = /^[0-9]{9}$/;
export const fullNameValidator = /^[a-zA-Z]{1,10}$/;
