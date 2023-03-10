import { open } from "node:fs/promises";
import {
  getIndex,
  getUserInfo,
  getUserIndex,
  getUser,
  printUser,
} from "../utils/utils.js";
import {
  getQuery,
  sqlQueryAnalyze,
  validateQueryObject,
  searchWithNoId,
  validateQueryObjectInsert,
  generateRandomId,
  createUserToInsert,
} from "../utils/sqlUtils.js";
import { dbSchema } from "../database/dbSchema.js";

const pathUsers = "./database/db.txt";
const pathIndex = "./database/index.txt";

export const addUser = async (rl, userArr = []) => {
  try {
    const fhUsers = await open(pathUsers, "a+");
    const fhIndex = await open(pathIndex, "a+");
    if (userArr.length === 0) {
      userArr = await getUserInfo(rl, pathIndex);
    }
    const fieldsLength = Object.values(dbSchema);
    for (let i = 0; i < fieldsLength.length; i++) {
      const buff = Buffer.alloc(fieldsLength[i]);
      buff.write(userArr[i], "utf-8");
      if (i < fieldsLength.length - 1) {
        await fhUsers.appendFile(buff + "|");
      } else {
        await fhUsers.appendFile(buff + "\n");
      }
    }
    const index = await getIndex();
    await fhIndex.appendFile(`${userArr[0]}:${index}\n`);
    await fhUsers.close();
    await fhIndex.close();
    console.log(`User (ID: ${userArr[0]}) was added.`);
    return;
  } catch (error) {
    console.log(error.message + "\n");
    return;
  }
};

export const searchUserWithId = async (id, fields) => {
  const index = await getUserIndex(id, pathIndex);
  if (!index) {
    console.log("No user found.");
  } else {
    const user = await getUser(index, id, pathUsers);
    printUser(user, fields);
    console.log("");
  }
  return;
};

export const getId = async (rl) => {
  const id = await rl.question("Enter an ID to search: ");
  await searchUserWithId(id, ["*"]);
  return;
};

export const handleQuery = async (rl) => {
  try {
    const query = await getQuery(rl);
    if (!query) return;
    const queryObj = sqlQueryAnalyze(query);
    if (queryObj.action === "select") {
      if (!validateQueryObject(queryObj)) return;
      if (queryObj.filter.field && queryObj.filter.field === "id") {
        await searchUserWithId(queryObj.filter.value, queryObj.fields);
        return;
      } else {
        await searchWithNoId(queryObj, pathUsers);
      }
    } else if (queryObj.action === "insert into") {
      if (!validateQueryObjectInsert(queryObj)) return;
      if (queryObj.fields.length > 0 && !queryObj.fields.includes("id")) {
        let id = "";
        let index = null;
        do {
          id = generateRandomId();
          index = await getUserIndex(id, pathIndex);
        } while (index);
        queryObj.fields.push("id");
        queryObj.values.push(id);
      }
      if (queryObj.fields.length !== 0) {
        const user = createUserToInsert(queryObj);
        let index = await getUserIndex(user[0], pathIndex);
        if (!index) {
          await addUser(rl, user);
        } else {
          throw new Error("ID already exists.");
        }
        return;
      }
      let index = await getUserIndex(queryObj.values[0], pathIndex);
      if (!index) {
        await addUser(rl, queryObj.values);
      } else {
        throw new Error("ID already exists.");
      }
      return;
    }
  } catch (error) {
    console.log(error.message + "\n");
  }
};
