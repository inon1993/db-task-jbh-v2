import { open } from "node:fs/promises";
import { idValidator, fullNameValidator } from "../sql/sqlValidators.js";

export const getAction = async (rl) => {
  let action = "";
  while (action !== "A" && action !== "S" && action !== "Q" && action !== "E") {
    action = await rl.question(
      "Hello! Press 'A' to add a user or 'S' to search for a user.\nAlternatively, press 'Q' to enter an SQL query.\nPress 'E' to exit. "
    );
    if (action === "A" || action === "S" || action === "Q" || action === "E") {
      return action;
    }
  }
};

export const setQuestions = async () => {
  const questions = [];
  const fhQuestions = await open("./database/questions.txt");
  for await (const line of fhQuestions.readLines()) {
    const q = line.split("|");
    questions.push({ question: q[0], field: q[1] });
  }
  return questions;
};

export const getUserInfo = async (rl, pathIndex) => {
  const questions = await setQuestions();
  let isValidAnswer = false;
  const user = {
    id: "",
    fname: "",
    lname: "",
  };

  for (const q of questions) {
    let answer = "";
    while (!isValidAnswer) {
      answer = await rl.question(q.question);
      isValidAnswer = await isValid(q.field, answer, pathIndex);
    }

    user[q.field] = answer;
    isValidAnswer = false;
  }
  return Object.values(user);
};

export const getIndex = async () => {
  let lines = 0;
  const file = await open("./database/db.txt");

  for await (const line of file.readLines()) {
    lines++;
  }

  return lines === 0 ? 0 : lines - 1;
};

export const isValid = async (field, answer, pathIndex) => {
  let isValidAnswer = false;
  switch (field) {
    case "id":
      isValidAnswer = idValidator.test(answer);
      const index = await getUserIndex(answer, pathIndex);
      if (index) {
        console.log("ID already exists.");
        isValidAnswer = false;
      }
      break;
    case "fname":
    case "lname":
      isValidAnswer = fullNameValidator.test(answer);
      break;
  }

  return isValidAnswer;
};

export const getUserIndex = async (id, pathIndex) => {
  try {
    const fhIndex = await open(pathIndex);
    const map = new Map();
    for await (const line of fhIndex.readLines()) {
      map.set(line.split(":")[0], line.split(":")[1]);
    }
    const index = map.get(id);
    await fhIndex.close();
    return index;
  } catch (error) {
    console.log(error.message);
  }
};

export const getUser = async (index, id, pathUsers) => {
  try {
    if (!index) {
      return;
    }
    const fhUsers = await open(pathUsers);
    const buf = Buffer.alloc(31);
    await fhUsers.read(buf, 0, 31, Number(index) * 32);
    const userData = buf.toString("utf-8");
    const user = userData.replace(/\0/, "").split("|");
    if (user[0] !== id) {
      await fhUsers.close();
      return;
    }
    await fhUsers.close();
    return user;
  } catch (error) {
    await fhUsers.close();
    console.log(error.message);
  }
};

export const printUser = (user, fields) => {
  fields.forEach((field) => {
    switch (field) {
      case "id":
        process.stdout.write(`ID: ${user[0]} | `);
        break;
      case "firstname":
        process.stdout.write(`Firstname: ${user[1]} | `);
        break;
      case "lastname":
        process.stdout.write(`lastname: ${user[1]} | `);
        break;
      case "*":
        process.stdout.write(
          `ID: ${user[0]} | Firstname: ${user[1]} | Lastname: ${user[2]} | `
        );
        break;
      default:
        break;
    }
  });
};
