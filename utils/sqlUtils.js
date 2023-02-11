import { open } from "node:fs/promises";
import test from "node:test";
import { dbSchema } from "../database/dbSchema.js";
import {
  insertValidator,
  selectValidator,
  idValidator,
  fullNameValidator,
} from "../sql/sqlValidators.js";
import { printUser } from "./utils.js";

export const getQuery = async (rl) => {
  try {
    const query = await rl.question(
      "Enter your SQL query here (SELECT or INSERT INTO only):\n"
    );
    if (!selectValidator.test(query) && !insertValidator.test(query)) {
      throw new Error("Query is invalid. Check your SQL syntax.");
    }
    return query;
  } catch (error) {
    console.log(error.message + "\n");
  }
};

export const sqlQueryAnalyze = (query) => {
  try {
    if (!query) {
      throw new Error("No query was entered.");
    }
    let queryArr = query
      .trim()
      .toLowerCase()
      .replace(/['‘’"“”()]/g, "")
      .replaceAll(",", " ")
      .replace(/\s\s+/g, " ")
      .split(" ");

    let i = 0;

    const action = getSqlAction(queryArr);
    let analyzedQuery = {};
    if (action === "select") {
      analyzedQuery = selectAnalyze(queryArr, i);
    } else if (action === "insert into") {
      analyzedQuery = insertIntoAnalyze(queryArr, i);
    }
    return {
      action,
      ...analyzedQuery,
    };
  } catch (error) {
    console.error(error.message + "\n");
  }
};

export const getSqlAction = (queryArr) => {
  try {
    let action = "";
    if (queryArr[0] === "select") {
      action = "select";
    } else if (queryArr[0] === "insert" && queryArr[1] === "into") {
      action = "insert into";
    } else {
      throw new Error("Unknown or unsupported query.");
    }
    return action;
  } catch (error) {
    console.error(error.message + "\n");
  }
};

export const selectAnalyze = (queryArr, i) => {
  i++;
  if (queryArr[i] === "from") {
    throw new Error(
      "Missing fields to select. Minimum of one field is required."
    );
  }
  let fields = [];
  while (queryArr[i] !== "from") {
    fields.push(queryArr[i]);
    i++;
  }
  i++;
  let file = queryArr[i];
  i++;

  let filter = {};
  if (queryArr[i] === "where") {
    filter = analyzeFilter(queryArr, i);
  }

  return {
    file,
    fields,
    filter,
  };
};

export const analyzeFilter = (queryArr, i) => {
  const filter = {
    field: "",
    logic: "",
    value: "",
  };
  i++;
  if (
    queryArr[i].includes(">") ||
    queryArr[i].includes("=") ||
    queryArr[i].includes("<")
  ) {
    const filterField = queryArr[i];
    let j = 0;
    while (
      filterField[j] !== "<" &&
      filterField[j] !== "=" &&
      filterField[j] !== ">"
    ) {
      j++;
    }
    const result = [filterField.slice(0, j), filterField.slice(j)];
    queryArr[i] = result[0];
    if (queryArr[i + 1]) {
      queryArr[i + 2] = queryArr[i + 1];
      queryArr[i + 1] = result[1];
    } else {
      queryArr[i + 1] = result[1];
    }
  }
  filter.field = queryArr[i];
  i++;
  if (i === queryArr.length - 1) {
    const logic = queryArr[i];
    let j = 0;
    while (logic[j] === "<" || logic[j] === "=" || logic[j] === ">") {
      j++;
    }
    const result = [logic.slice(0, j), logic.slice(j)];
    filter.logic = result[0];
    filter.value = result[1];
  } else {
    filter.logic = queryArr[i];
    i++;
    filter.value = queryArr[i];
  }

  return filter;
};

export const validateQueryObject = (queryObj) => {
  try {
    if (!validateFields(queryObj.fields))
      throw new Error("Some columns doesn't exist.");
    if (!validateFile(queryObj.file))
      throw new Error(`'${queryObj.file}' Table doesn't exist.`);
    if (queryObj.filter.field) {
      const filterValidation = validateFilter(queryObj.filter);
      if (filterValidation.error) {
        if (filterValidation.type === "field")
          throw new Error(`'${queryObj.filter.field}' column doesn't exist.`);
        if (filterValidation.type === "logic")
          throw new Error(
            `'${queryObj.filter.logic}' is not valid on column ${queryObj.filter.field}`
          );
      }
    }
    return true;
  } catch (error) {
    console.log(error.message + "\n");
    return false;
  }
};

export const validateQueryObjectInsert = (queryObj) => {
  try {
    if (!validateFile(queryObj.file)) {
      throw new Error(`'${queryObj.file}' Table doesn't exist.`);
    }
    if (!validateFieldsInsert(queryObj.fields)) {
      throw new Error("Some columns doesn't exist.");
    }
    if (!validateFieldsValues(queryObj)) {
      return false;
    }
    return true;
  } catch (error) {
    console.log(error.message + "\n");
  }
};

export const validateUniqueFields = (fields) => {
  const map = new Map();
  for (let field of fields) {
    if (map.has(field)) return false;
    map.set(field);
  }
  return true;
};

export const validateFieldsValues = (queryObj) => {
  try {
    if (queryObj.fields.length === 0) {
      if (
        !idValidator.test(queryObj.values[0]) ||
        !fullNameValidator.test(queryObj.values[1]) ||
        !fullNameValidator.test(queryObj.values[2])
      )
        throw new Error("Values doesn't match table's schema");
    } else if (queryObj.fields.length > 0) {
      if (!validateUniqueFields(queryObj.fields))
        throw new Error("Each column must be set only once.");
      if (queryObj.fields.length !== queryObj.values.length)
        throw new Error("All specified columns must have values");
      for (let i = 0; i < queryObj.fields.length; i++) {
        switch (queryObj.fields[i]) {
          case "id":
            if (!idValidator.test(queryObj.values[i])) {
              throw new Error("ID value doesn't match ID column");
            }
            break;
          case "firstname":
            if (!fullNameValidator.test(queryObj.values[i])) {
              throw new Error("Firstname value doesn't match Firstname column");
            }
            break;
          case "lastname":
            if (!fullNameValidator.test(queryObj.values[i])) {
              throw new Error("Lastname value doesn't match Lasstname column");
            }
            break;
          default:
            break;
        }
      }
    }
    return true;
  } catch (error) {
    console.log(error.message + "\n");
  }
};

export const validateFields = (fields) => {
  for (let i = 0; i < fields.length; i++) {
    if (!(fields[i] in dbSchema) && fields[i] !== "*") return false;
  }
  return true;
};

export const validateFieldsInsert = (fields) => {
  for (let i = 0; i < fields.length; i++) {
    if (!(fields[i] in dbSchema)) return false;
  }
  return true;
};

export const validateFile = (file) => {
  if (file === "db") return true;
  return false;
};

export const validateFilter = (filter) => {
  if (!(filter.field in dbSchema)) return { error: true, type: "field" };
  if (filter.field === "id" && filter.logic !== "=")
    return { error: true, type: "logic" };
  return { error: false };
};

export const insertIntoAnalyze = (queryArr, i) => {
  i += 2;
  let file = queryArr[i];
  i++;
  let fields = [];
  if (queryArr[i] !== "values") {
    while (queryArr[i] !== "values") {
      fields.push(queryArr[i]);
      i++;
    }
  }
  i++;
  let values = [];
  for (i; i < queryArr.length; i++) {
    values.push(queryArr[i]);
  }

  return {
    file,
    fields,
    values,
  };
};

export const searchWithNoId = async (queryObj, pathUsers) => {
  let res = [];
  try {
    const fhUsers = await open(pathUsers, "a+");
    if (queryObj.filter.field) {
      for await (const line of fhUsers.readLines()) {
        if (queryObj.filter.field === "firstname") {
          if (
            line.substring(10, 20).replace(/\0/g, "") === queryObj.filter.value
          ) {
            const userData = line.replace(/\0/g, "").split("|");
            res.push(userData);
          }
        } else if (queryObj.filter.field === "lastname") {
          if (
            line.substring(21, 31).replace(/\0/g, "") === queryObj.filter.value
          ) {
            const userData = line.replace(/\0/g, "").split("|");
            res.push(userData);
          }
        }
      }
    } else {
      for await (const line of fhUsers.readLines()) {
        const userData = line.replace(/\0/g, "").split("|");
        res.push(userData);
      }
    }
    await fhUsers.close();
    if (res.length === 0) {
      console.log("No users found.");
      return;
    }
    res.forEach((user) => {
      printUser(user, queryObj.fields);
      console.log("");
    });
    return;
  } catch (error) {
    console.log(error.message + "\n");
  }
};

export const generateRandomId = () => {
  let id = "";
  while (!idValidator.test(id)) {
    id = Math.floor(Math.random() * 1000000000).toString();
  }
  return id;
};

export const createUserToInsert = (queryArr) => {
  const user = { id: "", firstname: "", lastname: "" };
  for (let i = 0; i < queryArr.fields.length; i++) {
    user[queryArr.fields[i]] = queryArr.values[i];
  }
  return Object.values(user);
};
